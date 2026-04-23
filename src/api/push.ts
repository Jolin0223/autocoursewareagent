import { supabase } from './supabase'

export interface PushRecordRow {
  id: string
  time: string
  teacher: string
  title: string
  platform: string
  source: string
  score: number
  status: 'adopted' | 'pending' | 'rejected'
  feedback?: string
  subject?: string
  previewUrl?: string
}

function dataUriToBlobUrl(dataUri: string): string {
  if (dataUri.startsWith('data:text/html;base64,')) {
    const base64 = dataUri.replace('data:text/html;base64,', '')
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    const blob = new Blob([bytes], { type: 'text/html' })
    return URL.createObjectURL(blob)
  }
  if (dataUri.startsWith('data:')) {
    const blob = new Blob([dataUri], { type: 'text/html' })
    return URL.createObjectURL(blob)
  }
  return dataUri
}

export async function fetchPushRecords(): Promise<PushRecordRow[]> {
  const { data, error } = await supabase
    .from('courseware')
    .select('id, title, subject, source, status, composite_score, teacher_action, reject_reason, created_at, teacher_id, file_url')
    .not('composite_score', 'is', null)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    console.error('[PushPage] fetch error:', error)
    return []
  }
  if (!data || data.length === 0) {
    console.warn('[PushPage] no data returned, trying without filter...')
    const { data: allData, error: allErr } = await supabase
      .from('courseware')
      .select('id, title, subject, source, status, composite_score, teacher_action, reject_reason, created_at, teacher_id, file_url')
      .order('created_at', { ascending: false })
      .limit(200)
    if (allErr) {
      console.error('[PushPage] fallback fetch error:', allErr)
      return []
    }
    if (!allData || allData.length === 0) {
      console.warn('[PushPage] courseware table is empty')
      return []
    }
    return allData.map(row => mapRow(row, {}))
  }

  // 批量查教师名
  const teacherIds = [...new Set(data.map((r: any) => r.teacher_id).filter(Boolean))]
  const teacherMap: Record<string, string> = {}
  if (teacherIds.length > 0) {
    const { data: teachers } = await supabase
      .from('teacher_profiles')
      .select('teacher_id, name')
      .in('teacher_id', teacherIds)
    if (teachers) {
      teachers.forEach((t: any) => { teacherMap[t.teacher_id] = t.name })
    }
  }

  // 批量查 evaluation_history 获取最新轮次的 file_url / html_snapshot
  const cwIds = data.map((r: any) => r.id)
  const { data: evalData } = await supabase
    .from('evaluation_history')
    .select('courseware_id, iteration_round, file_url, html_snapshot')
    .in('courseware_id', cwIds)
    .order('iteration_round', { ascending: false })

  const evalMap: Record<string, { file_url: string | null; html_snapshot: string | null }> = {}
  if (evalData) {
    evalData.forEach((e: any) => {
      if (!evalMap[e.courseware_id]) {
        evalMap[e.courseware_id] = { file_url: e.file_url, html_snapshot: e.html_snapshot }
      }
    })
  }

  return data.map((row: any) => {
    const eval_ = evalMap[row.id]
    let previewUrl: string | undefined
    if (row.source === 'self_skill') {
      previewUrl = row.file_url || eval_?.file_url || undefined
    } else if (eval_?.html_snapshot) {
      previewUrl = dataUriToBlobUrl(eval_.html_snapshot)
    }

    return {
      id: row.id,
      time: formatTime(row.created_at),
      teacher: teacherMap[row.teacher_id] || row.teacher_id || '未分配',
      title: row.title || '未命名课件',
      platform: sourceLabel(row.source),
      source: row.source,
      score: row.composite_score ?? 0,
      status: mapAction(row.teacher_action),
      feedback: row.reject_reason || undefined,
      subject: row.subject,
      previewUrl,
    }
  })
}

function mapRow(row: any, evalMap: Record<string, { file_url: string | null; html_snapshot: string | null }>): PushRecordRow {
  const eval_ = evalMap[row.id]
  let previewUrl: string | undefined
  if (row.source === 'self_skill') {
    previewUrl = row.file_url || eval_?.file_url || undefined
  } else if (eval_?.html_snapshot) {
    previewUrl = dataUriToBlobUrl(eval_.html_snapshot)
  }
  return {
    id: row.id,
    time: formatTime(row.created_at),
    teacher: row.teacher_id || '未分配',
    title: row.title || '未命名课件',
    platform: sourceLabel(row.source),
    source: row.source,
    score: row.composite_score ?? 0,
    status: mapAction(row.teacher_action),
    feedback: row.reject_reason || undefined,
    subject: row.subject,
    previewUrl,
  }
}

export interface PushStats {
  total: number
  adopted: number
  pending: number
  rejected: number
  adoptRate: number
}

export function calcStats(records: PushRecordRow[]): PushStats {
  const total = records.length
  const adopted = records.filter(r => r.status === 'adopted').length
  const pending = records.filter(r => r.status === 'pending').length
  const rejected = records.filter(r => r.status === 'rejected').length
  const decided = total - pending
  const adoptRate = decided > 0 ? Math.round((adopted / decided) * 100) : 0
  return { total, adopted, pending, rejected, adoptRate }
}

function mapAction(action: string | null): 'adopted' | 'pending' | 'rejected' {
  if (action === 'approve' || action === 'clone') return 'adopted'
  if (action === 'reject') return 'rejected'
  return 'pending'
}

function sourceLabel(source: string): string {
  const map: Record<string, string> = {
    self_skill: '自研课件',
    feixiang: '飞象老师',
    laoshibang: '老师帮',
  }
  return map[source] || source || '未知'
}

function formatTime(ts: string): string {
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
