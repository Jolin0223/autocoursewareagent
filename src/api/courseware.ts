import { supabase } from './supabase'

export interface CoursewareCompareItem {
  id: string
  title: string
  platform: string
  platformLabel: string
  screenshot: string
  scores: { d1: number; d2: number; d3: number; d4: number }
  composite: number
  pros: string[]
  cons: string[]
}

export interface CoursewareVersion {
  version: string
  [platform: string]: string | number
}

const PLATFORM_LABELS: Record<string, string> = {
  self_skill: '自研Skill',
  feixiang: '猿辅导飞象老师',
  laoshibang: '好未来老师帮',
}

const VALID_STATUSES = ['manual_review', 'iterating', 'done', 'pushed', 'approved', 'rejected']

export async function fetchCoursewareComparison(): Promise<CoursewareCompareItem[]> {
  // 查询有评测数据的课件
  const { data: coursewares } = await supabase
    .from('courseware')
    .select('id, title, source, scores, composite_score, status')
    .in('status', VALID_STATUSES)
    .in('source', ['self_skill', 'feixiang', 'laoshibang'])
    .not('composite_score', 'is', null)
    .order('created_at', { ascending: false })

  if (!coursewares || coursewares.length === 0) return []

  // 查询所有相关的 evaluation_history
  const cwIds = coursewares.map(c => c.id)
  const { data: evalHistory } = await supabase
    .from('evaluation_history')
    .select('courseware_id, iteration_round, scores, composite_score')
    .in('courseware_id', cwIds)
    .order('iteration_round', { ascending: false })

  if (!evalHistory || evalHistory.length === 0) return []

  // 按 courseware_id 分组，取最新轮次
  const latestByCoursware = new Map<string, { scores: any; composite: number }>()
  evalHistory.forEach((e: any) => {
    if (!latestByCoursware.has(e.courseware_id)) {
      latestByCoursware.set(e.courseware_id, {
        scores: e.scores,
        composite: e.composite_score,
      })
    }
  })

  // 按 source 分组聚合
  const sourceAgg: Record<string, {
    titles: string[]
    d1Sum: number; d2Sum: number; d3Sum: number; d4Sum: number
    compositeSum: number
    count: number
  }> = {}

  coursewares.forEach((cw: any) => {
    const latest = latestByCoursware.get(cw.id)
    if (!latest) return

    const src = cw.source
    if (!sourceAgg[src]) {
      sourceAgg[src] = { titles: [], d1Sum: 0, d2Sum: 0, d3Sum: 0, d4Sum: 0, compositeSum: 0, count: 0 }
    }

    const agg = sourceAgg[src]
    agg.titles.push(cw.title)
    agg.d1Sum += latest.scores?.d1 || 0
    agg.d2Sum += latest.scores?.d2 || 0
    agg.d3Sum += latest.scores?.d3 || 0
    agg.d4Sum += latest.scores?.d4 || 0
    agg.compositeSum += latest.composite || 0
    agg.count++
  })

  return Object.entries(sourceAgg).map(([source, agg]) => {
    const scores = {
      d1: Math.round((agg.d1Sum / agg.count) * 10) / 10,
      d2: Math.round((agg.d2Sum / agg.count) * 10) / 10,
      d3: Math.round((agg.d3Sum / agg.count) * 10) / 10,
      d4: Math.round((agg.d4Sum / agg.count) * 10) / 10,
    }
    const composite = Math.round((agg.compositeSum / agg.count) * 100) / 100

    return {
      id: source,
      title: agg.titles[0] || '',
      platform: source,
      platformLabel: PLATFORM_LABELS[source] || source,
      screenshot: '',
      scores,
      composite,
      pros: extractPros(scores),
      cons: extractCons(scores),
    }
  })
}

export async function fetchCoursewareVersions(): Promise<CoursewareVersion[]> {
  // 查询有评测数据的课件
  const { data: coursewares } = await supabase
    .from('courseware')
    .select('id, source, status')
    .in('status', VALID_STATUSES)
    .in('source', ['self_skill', 'feixiang', 'laoshibang'])
    .order('created_at', { ascending: false })

  if (!coursewares || coursewares.length === 0) return []

  const cwIds = coursewares.map(c => c.id)
  const { data: evalHistory } = await supabase
    .from('evaluation_history')
    .select('courseware_id, iteration_round, composite_score')
    .in('courseware_id', cwIds)
    .order('iteration_round', { ascending: true })

  if (!evalHistory || evalHistory.length === 0) return []

  // 按 source 分组，取 round=1 和 round=MAX 的平均 composite_score
  const cwSourceMap = new Map(coursewares.map((c: any) => [c.id, c.source]))

  const sourceRounds: Record<string, { v1Scores: number[]; vLatestScores: number[]; maxRound: Record<string, number> }> = {}

  // 先找每个 courseware_id 的最大轮次
  const maxRoundByCw = new Map<string, number>()
  evalHistory.forEach((e: any) => {
    const cur = maxRoundByCw.get(e.courseware_id) || 0
    if (e.iteration_round > cur) maxRoundByCw.set(e.courseware_id, e.iteration_round)
  })

  evalHistory.forEach((e: any) => {
    const source = cwSourceMap.get(e.courseware_id)
    if (!source) return

    if (!sourceRounds[source]) {
      sourceRounds[source] = { v1Scores: [], vLatestScores: [], maxRound: {} }
    }

    const sr = sourceRounds[source]
    if (e.iteration_round === 1) {
      sr.v1Scores.push(e.composite_score || 0)
    }
    if (e.iteration_round === maxRoundByCw.get(e.courseware_id)) {
      sr.vLatestScores.push(e.composite_score || 0)
    }
  })

  const v1Row: CoursewareVersion = { version: 'V1' }
  const vLatestRow: CoursewareVersion = { version: 'V3' }

  Object.entries(sourceRounds).forEach(([source, sr]) => {
    const v1Avg = sr.v1Scores.length > 0
      ? Math.round((sr.v1Scores.reduce((a, b) => a + b, 0) / sr.v1Scores.length) * 100) / 100
      : 0
    const vLatestAvg = sr.vLatestScores.length > 0
      ? Math.round((sr.vLatestScores.reduce((a, b) => a + b, 0) / sr.vLatestScores.length) * 100) / 100
      : 0

    v1Row[source] = v1Avg
    vLatestRow[source] = vLatestAvg
  })

  return [v1Row, vLatestRow]
}

function extractPros(scores: { d1: number; d2: number; d3: number; d4: number }): string[] {
  const pros: string[] = []
  if (scores.d1 >= 4) pros.push('知识准确性优秀')
  if (scores.d2 >= 4) pros.push('教学适配性强')
  if (scores.d3 >= 4) pros.push('系统运行稳定')
  if (scores.d4 >= 4) pros.push('视觉设计精美')
  if (pros.length === 0) pros.push('各维度表现均衡')
  return pros
}

function extractCons(scores: { d1: number; d2: number; d3: number; d4: number }): string[] {
  const cons: string[] = []
  if (scores.d1 < 3) cons.push('知识准确性待提升')
  if (scores.d2 < 3) cons.push('教学适配性不足')
  if (scores.d3 < 3) cons.push('系统稳定性欠佳')
  if (scores.d4 < 3) cons.push('视觉设计需优化')
  return cons
}
