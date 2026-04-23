import { supabase } from './supabase'

// ========== 教师列表 ==========
export async function fetchTeachers() {
  const { data: teachers } = await supabase
    .from('teacher_profiles')
    .select('*')
    .order('updated_at', { ascending: false })

  if (!teachers) return []

  // 并行查询每位教师的推送统计
  const enriched = await Promise.all(teachers.map(async t => {
    // 推送总数 (status=pushed 或 approved)
    const { count: pushCount } = await supabase
      .from('courseware')
      .select('id', { count: 'exact', head: true })
      .eq('teacher_id', t.teacher_id)
      .in('status', ['pushed', 'approved'])

    // 采纳数 (teacher_action=approve 或 clone)
    const { count: adoptCount } = await supabase
      .from('courseware')
      .select('id', { count: 'exact', head: true })
      .eq('teacher_id', t.teacher_id)
      .in('teacher_action', ['approve', 'clone'])

    // 已反馈总数 (approve + reject)
    const { count: totalActioned } = await supabase
      .from('courseware')
      .select('id', { count: 'exact', head: true })
      .eq('teacher_id', t.teacher_id)
      .in('teacher_action', ['approve', 'reject', 'clone'])

    return transformTeacher(t, pushCount ?? 0, adoptCount ?? 0, totalActioned ?? 0)
  }))

  return enriched
}

// ========== 教师推送历史 ==========
export async function fetchTeacherHistory(teacherId: string) {
  const { data } = await supabase
    .from('courseware')
    .select('title, status, teacher_action, reject_reason, created_at')
    .eq('teacher_id', teacherId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (!data) return []

  return data.map(row => ({
    date: new Date(row.created_at).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }),
    title: row.title,
    status: mapTeacherAction(row.teacher_action),
    feedback: row.reject_reason || undefined,
  }))
}

// ========== 辅助函数 ==========
function transformTeacher(raw: any, pushCount: number, adoptCount: number, totalActioned: number) {
  const prefs = typeof raw.preference_tags === 'string'
    ? (() => { try { return JSON.parse(raw.preference_tags) } catch { return {} } })()
    : (raw.preference_tags || {})

  const knowledgeAvg = avg(asNumArray(prefs.knowledge_scores))
  const interactionAvg = avg(asNumArray(prefs.interaction_scores))
  const styleAvg = avg(asNumArray(prefs.style_scores))

  const radar = [
    { dim: '游戏化偏好', value: interactionAvg || 3 },
    { dim: '互动深度', value: interactionAvg || 3 },
    { dim: '视觉要求', value: styleAvg || 3 },
    { dim: '知识密度', value: knowledgeAvg || 3 },
    { dim: '难度偏好', value: knowledgeAvg || 3 },
    { dim: '反馈详细度', value: styleAvg || 3 },
  ]

  const types = parseJsonbArray(raw.preferred_types)
  const tags = [
    raw.teaching_style,
    ...types.map(typeLabel),
  ].filter(Boolean)

  return {
    id: raw.teacher_id,
    name: raw.name,
    avatar: raw.avatar_url || subjectEmoji(raw.subject),
    subject: raw.subject,
    grade: raw.grade_range,
    tags,
    pushCount,
    adoptRate: totalActioned > 0 ? Math.round((adoptCount / totalActioned) * 100) : 0,
    radar,
    history: [],  // 需要单独调用 fetchTeacherHistory
  }
}

function mapTeacherAction(action: string | null): 'adopted' | 'pending' | 'rejected' {
  if (action === 'approve' || action === 'clone') return 'adopted'
  if (action === 'reject') return 'rejected'
  return 'pending'
}

function avg(arr: number[]): number {
  if (arr.length === 0) return 0
  return Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10
}

function asNumArray(val: unknown): number[] {
  if (Array.isArray(val)) return val.filter(v => typeof v === 'number')
  if (typeof val === 'string') {
    try { const p = JSON.parse(val); return Array.isArray(p) ? p.filter((v: any) => typeof v === 'number') : [] }
    catch { return [] }
  }
  return []
}

function subjectEmoji(subject: string): string {
  const map: Record<string, string> = {
    '数学': '🔢',
    '英语': '🔤',
    '语文': '📖',
  }
  return map[subject] || '👩‍🏫'
}

function parseJsonbArray(val: unknown): string[] {
  if (Array.isArray(val)) return val
  if (typeof val === 'string') {
    try { const parsed = JSON.parse(val); return Array.isArray(parsed) ? parsed : [] }
    catch { return [] }
  }
  return []
}

const typeMap: Record<string, string> = {
  quiz: '答题闯关',
  drag: '拖拽互动',
  game: '游戏化',
  match: '配对练习',
  fill: '填空练习',
  story: '故事型',
  video: '视频型',
}

function typeLabel(t: string): string {
  return typeMap[t] || t
}
