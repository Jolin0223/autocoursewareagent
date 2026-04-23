const LLM_API_URL = import.meta.env.VITE_LLM_API_URL
const LLM_API_KEY = import.meta.env.VITE_LLM_API_KEY
const LLM_MODEL = import.meta.env.VITE_LLM_MODEL || 'gemini-3.0-flash-preview'

interface LLMMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface LLMResponse {
  choices: Array<{
    message: {
      content: string
    }
  }>
}

export async function callLLM(messages: LLMMessage[], maxTokens = 500): Promise<string> {
  try {
    const response = await fetch(LLM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LLM_API_KEY}`,
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages,
        max_tokens: maxTokens,
      }),
    })

    if (!response.ok) {
      throw new Error(`LLM API error: ${response.status}`)
    }

    const data: LLMResponse = await response.json()
    return data.choices[0]?.message?.content || ''
  } catch (error) {
    console.error('LLM API call failed:', error)
    return '大模型分析暂时不可用'
  }
}

// 自研Skill迭代诊断分析
export async function analyzeSkillIteration(data: {
  selfSkill: { d1: number; d2: number; d3: number; d4: number; composite: number }
  feixiang: { d1: number; d2: number; d3: number; d4: number; composite: number }
  laoshibang: { d1: number; d2: number; d3: number; d4: number; composite: number }
}): Promise<{
  knowledge: string
  teaching: string
  interaction: string
  visual: string
}> {
  const prompt = `你是一个教育科技产品分析专家。请基于以下三个平台的课件评测数据，为"自研Skill"提供迭代优化建议。

评测维度说明：
- d1: 知识准确性（满分5分）
- d2: 教学适配性（满分5分）
- d3: 系统健壮性（满分5分）
- d4: 视觉美观度（满分5分）

数据：
自研Skill: d1=${data.selfSkill.d1}, d2=${data.selfSkill.d2}, d3=${data.selfSkill.d3}, d4=${data.selfSkill.d4}, 综合分=${data.selfSkill.composite}
飞象老师: d1=${data.feixiang.d1}, d2=${data.feixiang.d2}, d3=${data.feixiang.d3}, d4=${data.feixiang.d4}, 综合分=${data.feixiang.composite}
老师帮: d1=${data.laoshibang.d1}, d2=${data.laoshibang.d2}, d3=${data.laoshibang.d3}, d4=${data.laoshibang.d4}, 综合分=${data.laoshibang.composite}

请分别从以下四个层面给出简洁的优化建议（每条建议不超过15字）：
1. 知识层（d1维度）：对比飞象老师和老师帮的d1分数
2. 教学层（d2维度）：对比老师帮的d2分数
3. 交互层（d3维度）：对比飞象老师的d3分数
4. 视觉层（d4维度）：对比飞象老师的d4分数

输出格式（严格按此格式，每行一条建议）：
知识层：[建议]
教学层：[建议]
交互层：[建议]
视觉层：[建议]`

  const response = await callLLM([{ role: 'user', content: prompt }], 250)
  
  const lines = response.split('\n').filter(l => l.trim())
  const knowledge = lines.find(l => l.startsWith('知识层'))?.replace('知识层：', '').trim() || '提升知识准确性'
  const teaching = lines.find(l => l.startsWith('教学层'))?.replace('教学层：', '').trim() || '提升教学适配性'
  const interaction = lines.find(l => l.startsWith('交互层'))?.replace('交互层：', '').trim() || '提升系统健壮性'
  const visual = lines.find(l => l.startsWith('视觉层'))?.replace('视觉层：', '').trim() || '优化视觉素材质量'

  return { knowledge, teaching, interaction, visual }
}

// 指标定义解读（定量规则 + 定性分析）
export async function explainMetric(metricName: string, metricValue: any, context: any): Promise<{
  quantitative: string
  qualitative: string
}> {
  const metricDefinitions: Record<string, string> = {
    'V1版本综合得分王': '所有模型 V1（初稿）版本的四个维度分数的算术平均值，取最高分。',
    'V3版本综合得分王': '所有模型 V3（终稿）版本的四个维度分数的算术平均值，取最高分。',
    '知识准确性': 'd1 维度分数，评估课件内容的知识点准确性、逻辑严谨性。取各评审员打分的算术平均值。',
    '教学适配性': 'd2 维度分数，评估课件是否符合目标年级学生的认知水平和教学目标。取各评审员打分的算术平均值。',
    '系统健壮性': 'd3 维度分数，评估课件的交互流畅性、错误处理能力。取各评审员打分的算术平均值。',
    '视觉美观度': 'd4 维度分数，评估课件的视觉设计、美术资产质量。取各评审员打分的算术平均值。',
    '评测课件数': '参与评测的平台数量，数据来源于 courseware 表中 status 为 reviewed/published 的记录，按 source 字段分组统计。',
    '全维度综合得分王': '各平台最新迭代轮次的 d1-d4 四个维度分数的加权平均值（权重：d1=25%, d2=35%, d3=20%, d4=20%），取综合分最高的平台。',
    '最大进步幅度': '各平台 V3（最新迭代）综合分减去 V1（初稿）综合分的差值，取差值最大的平台。',
    '能力分布雷达图': '以 d1-d4 四个维度为轴，展示各平台在每个维度上的平均得分，数据来源于 evaluation_history 表最新迭代轮次的评分。',
    '进化幅度对比': '对比各平台 V1（初稿）和 V3（最新迭代）的综合得分变化，展示迭代过程中的进步幅度。',
    '三平台详细对比': '展示飞象老师、老师帮、自研Skill 三个平台在 d1-d4 四个维度上的详细得分，以及各自的优势和劣势分析。数据来源于 evaluation_history 表。',
    '各平台课件数量趋势': '按日期统计各竞品平台（飞象老师、老师帮）的课件发布数量变化趋势。数据来源于 courseware_jingpingdata 表，按 scrape_date 分组聚合 total_works_count。',
    '质量评分趋势': '按日期统计各竞品平台课件的平均质量评分变化趋势。数据来源于 courseware_jingpingdata 表的评分字段。',
    '飞象K6年级与学科生产分布图': '展示飞象老师在 K6 阶段（幼儿园+小学）各年级、各学科（语文/数学/英语）的课件生产数量堆叠分布。数据来源于 courseware_jingpingdata 表，筛选 platform=飞象老师，按 grade 和 subject 分组统计 total_works_count。',
    '飞象K6各年级内容消费分布': '展示飞象老师在 K6 阶段各年级的内容消费情况，包括浏览量（views）、收藏数（stars）和转化率（收藏/浏览）。数据来源于 courseware_jingpingdata 表的 top_50_works 中的 views 和 total_stars_count。',
    'Top 50 竞品课件排行': '从 courseware_jingpingdata 表的 top_50_works 字段中提取各平台热门课件，按收藏率（收藏数/浏览量）从高到低排序，取前 50 条。支持按平台、学科、年级筛选。',
  }

  const quantitative = metricDefinitions[metricName] || '该指标的定量计算规则暂未定义。'

  const contextStr = typeof context === 'object'
    ? Object.entries(context).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join('\n')
    : String(context)

  const prompt = `你是一个教育科技数据分析专家。请基于以下真实数据，对"${metricName}"指标进行定性分析。

指标名称：${metricName}
当前值：${typeof metricValue === 'object' ? JSON.stringify(metricValue) : metricValue}
定量规则：${quantitative}

真实数据明细：
${contextStr}

要求：
1. 必须引用上面的具体数字进行分析，不要说空话套话
2. 指出数据中的关键发现（如哪个平台/维度最强、最弱、差距多大）
3. 给出1-2条具体可执行的建议
4. 总字数不超过120字`

  const qualitative = await callLLM([{ role: 'user', content: prompt }], 250)

  return { quantitative, qualitative }
}

// 批量润色日志消息
export async function polishLogMessages(logs: Array<{ rawMessage: string; outputData: any }>): Promise<string[]> {
  if (logs.length === 0) return []

  const logEntries = logs.map((l, i) => {
    const out = l.outputData || {}
    return `${i + 1}. step_name_cn: ${out.step_name_cn || '无'}
   plan_title: ${out.plan_title || '无'}
   source: ${out.source || '无'}
   iteration: ${out.iteration ?? '无'}
   score: ${out.score ?? '无'}
   best_score: ${out.best_score ?? '无'}
   best_source: ${out.best_source || '无'}
   reason: ${out.reason || '无'}
   active_sources: ${out.active_sources?.join(',') || '无'}
   scores: ${out.scores ? JSON.stringify(out.scores) : '无'}
   total_rounds: ${out.total_rounds ?? '无'}`
  }).join('\n\n')

  const prompt = `你是AI课件生产流水线的实时日志播报员。请将以下${logs.length}条日志的结构化数据，各自转化为简洁易懂的一句话中文播报（每条不超过40字）。

要求：
1. 以 step_name_cn 的含义为主体，但不要照搬原文，要用更口语化/播报化的表达
2. 必须包含 plan_title（课件名）
3. 如果有 source，用中文名（self_skill→自研Skill，feixiang→飞象老师，laoshibang→老师帮）
4. 如果有 score/best_score，要体现分数
5. 如果有 iteration，要体现第几轮
6. 如果有 reason，简要提及原因
7. 每条格式严格为：编号. 播报内容（不要加其他格式）

日志数据：
${logEntries}`

  try {
    const response = await callLLM([{ role: 'user', content: prompt }], 1500)
    const lines = response.split('\n').filter(l => l.trim())
    const results: string[] = []
    for (let i = 0; i < logs.length; i++) {
      const line = lines.find(l => l.startsWith(`${i + 1}.`))
      results.push(line ? line.replace(/^\d+\.\s*/, '').trim() : logs[i].rawMessage)
    }
    return results
  } catch {
    return logs.map(l => l.rawMessage)
  }
}
