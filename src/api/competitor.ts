import { supabase } from './supabase'

// ========== 竞品数据（来自 courseware_jingpingdata 表） ==========

interface JingpingRow {
  timestamp: string
  platform: string
  stage: string
  subject: string
  grade: string
  total_works_count: number
  total_stars_count: number
  top_50_works: TopWork[] | null
}

interface TopWork {
  title: string
  author: string
  stars: number
  views: number
  grade?: string
  subject?: string
  fav_view_ratio?: string
  is_pgc?: boolean
  url?: string
  platform?: string
}

export async function fetchJingpingData() {
  const { data } = await supabase
    .from('courseware_jingpingdata')
    .select('*')
    .order('timestamp', { ascending: false })

  if (!data) return []
  return data as JingpingRow[]
}

// ========== K6 年级与学科生产分布（直接用 grade+subject 字段） ==========

const K6_GRADES = ['幼儿园', '一年级', '二年级', '三年级', '四年级', '五年级', '六年级']
const K6_SUBJECTS = ['语文', '数学', '英语']

export function buildK6Structure(rows: JingpingRow[], platform?: string) {
  const gradeSubjectCount: Record<string, Record<string, number>> = {}
  K6_GRADES.forEach(g => {
    gradeSubjectCount[g] = {}
    K6_SUBJECTS.forEach(s => { gradeSubjectCount[g][s] = 0 })
  })

  const latestDate = rows.length > 0 ? rows[0].timestamp.split(' ')[0] : ''

  rows
    .filter(r => r.timestamp.startsWith(latestDate))
    .filter(r => !platform || r.platform === platform)
    .filter(r => r.stage === '学前教育' || r.stage === '小学')
    .forEach(r => {
      const grade = normalizeGrade(r.grade)
      if (!K6_GRADES.includes(grade)) return

      if (r.stage === '学前教育') {
        // 幼儿园不分学科，total_works_count 直接作为总数
        gradeSubjectCount[grade]['语文'] += r.total_works_count || 0
      } else {
        const subject = r.subject
        if (K6_SUBJECTS.includes(subject)) {
          gradeSubjectCount[grade][subject] += r.total_works_count || 0
        }
      }
    })

  return K6_GRADES.map(grade => ({
    grade,
    ...K6_SUBJECTS.reduce((acc, s) => ({ ...acc, [s]: gradeSubjectCount[grade][s] }), {}),
  }))
}

// ========== K6 各年级内容消费分布（浏览、收藏、转化率） ==========

export function buildK6Consumption(rows: JingpingRow[], platform?: string) {
  const gradeStats: Record<string, { views: number; stars: number }> = {}
  K6_GRADES.forEach(g => { gradeStats[g] = { views: 0, stars: 0 } })

  const latestDate = rows.length > 0 ? rows[0].timestamp.split(' ')[0] : ''

  rows
    .filter(r => r.timestamp.startsWith(latestDate))
    .filter(r => !platform || r.platform === platform)
    .filter(r => r.stage === '学前教育' || r.stage === '小学')
    .forEach(r => {
      const grade = normalizeGrade(r.grade)
      if (!K6_GRADES.includes(grade)) return

      // 收藏数直接用 total_stars_count
      gradeStats[grade].stars += r.total_stars_count || 0

      // 浏览量从 top_50_works 求和
      if (r.top_50_works) {
        r.top_50_works.forEach(w => {
          gradeStats[grade].views += w.views || 0
        })
      }
    })

  return K6_GRADES.map(grade => ({
    grade,
    views: gradeStats[grade].views,
    favorites: gradeStats[grade].stars,
    conversionRate: gradeStats[grade].views > 0
      ? Math.round((gradeStats[grade].stars / gradeStats[grade].views) * 1000) / 10
      : 0,
  }))
}

// ========== 竞品明细表（从 top_50_works 提取） ==========

export interface CompetitorItem {
  rank: number
  title: string
  platform: string
  grade: string
  subject: string
  author: string
  stars: number
  views: number
  favRate: string
}

export function buildCompetitorTable(rows: JingpingRow[], filters?: {
  platform?: string
  subject?: string
  grade?: string
}): CompetitorItem[] {
  const latestDate = rows.length > 0 ? rows[0].timestamp.split(' ')[0] : ''
  const allWorks: (TopWork & { platform: string })[] = []

  rows
    .filter(r => r.timestamp.startsWith(latestDate))
    .forEach(r => {
      if (!r.top_50_works) return
      r.top_50_works.forEach(w => {
        allWorks.push({
          ...w,
          platform: w.platform || r.platform,
          subject: w.subject || r.subject,
          grade: w.grade || r.grade || r.stage,
        })
      })
    })

  // 去重
  const unique = Array.from(
    new Map(allWorks.map(w => [`${w.title}_${w.author}`, w])).values()
  )

  // 筛选
  let filtered = unique
  if (filters?.platform && filters.platform !== '全部平台') {
    filtered = filtered.filter(w => w.platform === filters.platform)
  }
  if (filters?.subject && filters.subject !== '全部学科') {
    filtered = filtered.filter(w => (w.subject || '') === filters.subject)
  }
  if (filters?.grade && filters.grade !== '全部年级') {
    filtered = filtered.filter(w => normalizeGrade(w.grade) === filters.grade)
  }

  // 按收藏率从高到低排序
  filtered.sort((a, b) => {
    const rateA = a.views > 0 ? (a.stars / a.views) : 0
    const rateB = b.views > 0 ? (b.stars / b.views) : 0
    return rateB - rateA
  })

  return filtered.slice(0, 50).map((w, i) => ({
    rank: i + 1,
    title: w.title,
    platform: w.platform,
    grade: w.grade || '-',
    subject: w.subject || '-',
    author: w.author || '-',
    stars: w.stars || 0,
    views: w.views || 0,
    favRate: w.fav_view_ratio || (w.views > 0 ? ((w.stars / w.views) * 100).toFixed(1) + '%' : '0%'),
  }))
}

// ========== 趋势数据（各平台课件数量趋势 & 质量评分趋势） ==========

export function buildTrendData(rows: JingpingRow[]) {
  const dateMap = new Map<string, { feixiang: number; laoshibang: number }>()

  rows.forEach(r => {
    const date = r.timestamp.split(' ')[0]
    const short = date.slice(5) // MM-DD
    if (!dateMap.has(short)) dateMap.set(short, { feixiang: 0, laoshibang: 0 })
    const entry = dateMap.get(short)!
    if (r.platform === '飞象老师') entry.feixiang += r.total_works_count || 0
    else entry.laoshibang += r.total_works_count || 0
  })

  const sorted = Array.from(dateMap.entries()).sort((a, b) => a[0].localeCompare(b[0])).slice(-7)
  return sorted.map(([date, v]) => ({ date, 飞象老师: v.feixiang, 老师帮: v.laoshibang }))
}

// ========== 辅助函数 ==========

function normalizeGrade(grade?: string): string {
  if (!grade) return ''
  const g = grade.trim()
  if (g.includes('幼儿') || g.includes('学前')) return '幼儿园'
  if (g.includes('一')) return '一年级'
  if (g.includes('二')) return '二年级'
  if (g.includes('三')) return '三年级'
  if (g.includes('四')) return '四年级'
  if (g.includes('五')) return '五年级'
  if (g.includes('六')) return '六年级'
  return g
}

