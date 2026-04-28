import { supabase } from './supabase'

const sourceLabels: Record<string, string> = {
  self_skill: '自研Skill',
  feixiang: '飞象老师',
  laoshibang: '老师帮',
}

const stepNameCn: Record<string, string> = {
  // Agent① 需求感知
  start: '🚀 启动·需求感知引擎启动',
  sync_feixiang: '🔄 前置·检测飞象热门资源数据是否有更新，有则自动同步',
  channel_a_teacher: '👤 通道A·教师画像分析',
  channel_a_llm: '🤖 通道A·LLM生成',
  channel_a: '📋 通道A·内需驱动·基于教师画像+历史反馈+对话记忆，生成个性化课件计划',
  channel_b_teacher: '👤 通道B·教师需求匹配',
  channel_b_llm: '🤖 通道B·LLM生成',
  channel_b: '🔥 通道B·外需驱动·结合飞象、TPT等热门资源/创意平台，生成趋势课件计划',
  merge: '🔄 融合去重·双通道计划合并，按优先级排序，去除重复主题',
  save: '💾 写入·将最终课件计划写入每日计划表',
  complete: '✅ 完成',
  
  // Agent②③ 三源并行
  multi_source_generate: '🏭 三源并行启动·同时调度自研/飞象/老师帮三个平台，开始生成+评测+择优',
  round_start: '🔄 迭代轮次开始·启动新一轮「生成→评测」循环',
  round_complete: '📊 迭代轮次结束·本轮各平台评分出炉',
  source_score: '📝 单个平台本轮生成+评测完成，综合评分已出',
  source_passed: '🎉 平台直接通过·评分≥4.0，无需继续迭代',
  source_eliminated: '🚫 平台淘汰·评分<2.5或生成失败，退出后续迭代',
  source_continue: '🔁 评分在2.5~4.0之间，进入下一轮改进',
  all_rounds_done: '🏁 全部迭代结束·已达最大轮次，汇总各平台历史最高分',
  best_selected: '🏆 择优完成·从多源多轮结果中选出最佳课件',
  approved: '✅ 课件达标·最佳评分≥3.5，标记为可上架',
  needs_review: '⚠️ 建议复核·最佳评分3.0~3.5，推送但建议教师复核',
  manual_review: '🔍 人工审核·最佳评分<3.0，不自动推送，转人工处理',
  all_failed: '❌ 全部失败·三个平台均生成失败',
  
  // Agent② 课件生成
  design: '🎨 设计·AI分析教学目标，规划课件结构与互动设计',
  create: '🔨 生成·根据设计方案，自动生成互动课件代码',
  modify: '✏️ 迭代修改·根据评测反馈，针对性修改课件缺陷',
  
  // Agent③ 课件评测
  browser_load: '🌐 加载课件·Browser Use打开课件页面，截图+交互测试',
  d1_knowledge: '📚 知识审查员(A1)·评估知识点准确性、覆盖度、难度匹配',
  d2_pedagogy: '🎓 教学设计审查员(A2)·评估教学逻辑、互动设计、学习路径',
  d3_qa: '🔧 QA工程师(B)·检测交互bug、响应异常、兼容性问题',
  d4_visual: '🎨 视觉设计师(C)·评估UI美观度、色彩搭配、排版布局',
  score_aggregate: '📊 综合评分·四维加权汇总（知识25%+教学35%+QA20%+视觉20%）',
  
  // Agent④ 飞书推送
  build_card: '🃏 构建卡片·生成飞书交互卡片（含课件预览、评分、操作按钮）',
  push: '📤 推送·将课件卡片发送至教师飞书',
  callback_listen: '👂 监听回调·等待教师点击「上架/退回/修改」按钮',
  callback_handle: '⚡ 处理回调·根据教师操作更新课件状态',
  
  // 全链路
  demand_perception: '🧠 需求感知·Agent①分析教师需求，生成今日课件计划',
  generate_evaluate: '🏭 生成与评测·Agent②③三源并行生成课件，AI评审团评测打分',
  error: '❌ 执行异常',
}

// ========== 统计卡片 ==========
export async function fetchTodayStats() {
  const today = new Date().toISOString().slice(0, 10)

  // 并行查询四个指标
  const [planRes, cwRes, approvedRes, pushedRes] = await Promise.all([
    // 今日感知：daily_plan 今日创建数
    supabase
      .from('daily_plan')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', `${today}T00:00:00`)
      .lt('created_at', `${today}T23:59:59`),
    // 今日生成：courseware 今日创建数
    supabase
      .from('courseware')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', `${today}T00:00:00`)
      .lt('created_at', `${today}T23:59:59`),
    // 评审通过：courseware 今日 evaluated/approved/pushed 数（有评分即算通过）
    supabase
      .from('courseware')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', `${today}T00:00:00`)
      .lt('created_at', `${today}T23:59:59`)
      .in('status', ['evaluated', 'approved', 'pushed', 'done']),
    // 推送成功：courseware 今日 pushed，按 teacher_id 去重
    supabase
      .from('courseware')
      .select('teacher_id')
      .gte('created_at', `${today}T00:00:00`)
      .lt('created_at', `${today}T23:59:59`)
      .eq('status', 'pushed'),
  ])

  const planCount = planRes.count ?? 0
  const cwCount = cwRes.count ?? 0
  const approvedCount = approvedRes.count ?? 0
  // 推送成功：按 teacher_id 去重
  const pushedTeachers = new Set((pushedRes.data || []).map((r: any) => r.teacher_id).filter(Boolean))
  const pushedCount = pushedTeachers.size
  const passRate = cwCount > 0 ? Math.round((approvedCount / cwCount) * 100) : 0

  return [
    { label: '今日感知', value: planCount, trend: 0, suffix: '个需求', agent: 'Agent①' },
    { label: '今日生成', value: cwCount, trend: 0, suffix: '个课件', agent: 'Agent②' },
    { label: '评审通过', value: approvedCount, trend: 0, suffix: `通过率${passRate}%`, agent: 'Agent③' },
    { label: '推送成功', value: pushedCount, trend: 0, suffix: `覆盖教师`, agent: 'Agent④' },
  ]
}

const fmtTime = (ts: string) =>
  new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

// ========== Agent 状态（从 pipeline_logs 推断）==========
export async function fetchAgentStatuses() {
  const { data: logs } = await supabase
    .from('pipeline_logs')
    .select('agent_name, step_name, status, created_at, error_message, output_data, pipeline_run_id')
    .order('created_at', { ascending: false })
    .limit(100)

  const agentMap: Record<string, { status: string; task: string; detail: string[]; hasLogs: boolean }> = {
    agent1: { status: 'idle', task: '等待调度', detail: [], hasLogs: false },
    agent2: { status: 'idle', task: '等待调度', detail: [], hasLogs: false },
    agent3: { status: 'idle', task: '等待调度', detail: [], hasLogs: false },
    agent4: { status: 'idle', task: '等待调度', detail: [], hasLogs: false },
  }

  const agentKeys = ['agent1', 'agent2', 'agent3', 'agent4']

  // 找到最新一轮的 pipeline_run_id
  const latestRunId = logs?.[0]?.pipeline_run_id
  // 只看最新一轮的日志，实现"新一轮自动重置"
  const currentRunLogs = latestRunId
    ? logs?.filter(l => l.pipeline_run_id === latestRunId) || []
    : logs || []

  for (let num = 1; num <= 4; num++) {
    const key = agentKeys[num - 1]
    const agentLogs = currentRunLogs.filter(l => resolveAgent(l.agent_name, l.step_name) === num)
    if (agentLogs.length === 0) continue

    agentMap[key].hasLogs = true

    // Agent2 特殊逻辑：多 source 并行，部分失败不算整体异常
    if (num === 2) {
      const failedSources = agentLogs.filter(l => l.status === 'failed')
      const successSources = agentLogs.filter(l => l.status === 'success')

      // 按 source 分组，找出只有 started/running 但没有 success/failed 的 source
      const startedSources = agentLogs.filter(l => l.status === 'started' || l.status === 'running')
      const finishedSourceNames = new Set([
        ...failedSources.map(l => l.output_data?.source),
        ...successSources.map(l => l.output_data?.source),
      ].filter(Boolean))
      const stillRunning = startedSources.filter(l => {
        const src = l.output_data?.source
        return src && !finishedSourceNames.has(src)
      })

      const latest = agentLogs[0]
      const cn = latest.output_data?.step_name_cn || stepNameCn[latest.step_name] || latest.step_name || ''

      if (stillRunning.length > 0) {
        // 还有 source 在跑
        const failedNames = failedSources.map(l => sourceLabels[l.output_data?.source] || l.output_data?.source || '').filter(Boolean)
        const runningNames = stillRunning.map(l => sourceLabels[l.output_data?.source] || l.output_data?.source || '').filter(Boolean)
        const detail = failedNames.length > 0
          ? [`${failedNames.join('/')} 已失败，${runningNames.join('/')} 仍在生产中`]
          : [`${runningNames.join('/')} 生产中`]
        agentMap[key] = { status: 'running', task: cn || '课件生产中', detail, hasLogs: true }
      } else if (latest.status === 'started' || latest.status === 'running') {
        // 最新日志是 started（可能 source 字段缺失导致 stillRunning 匹配不到）
        agentMap[key] = { status: 'running', task: cn || '课件生产中', detail: [`开始于 ${fmtTime(latest.created_at)}`], hasLogs: true }
      } else if (failedSources.length > 0 && successSources.length > 0) {
        // 部分成功部分失败 → 已完成（带警告）
        const failedNames = failedSources.map(l => sourceLabels[l.output_data?.source] || '').filter(Boolean)
        agentMap[key] = {
          status: 'completed',
          task: `${cn || '课件生产'} 已完成`,
          detail: [`${failedNames.join('/')} 生成失败，其余渠道已完成`],
          hasLogs: true,
        }
      } else if (failedSources.length > 0 && successSources.length === 0) {
        // 全部失败
        agentMap[key] = {
          status: 'error',
          task: cn || '全部渠道生产失败',
          detail: [latest.error_message || '所有渠道均失败'],
          hasLogs: true,
        }
      } else {
        // 全部成功
        agentMap[key] = {
          status: 'completed',
          task: `${cn || latest.step_name} 已完成`,
          detail: [`完成于 ${fmtTime(latest.created_at)}`],
          hasLogs: true,
        }
      }
    } else if (num === 3) {
      // Agent3 特殊逻辑：评测步骤没有 started 状态，只有 success/failed
      // 如果 Agent2 还在 running，说明生成+评测循环还在进行，Agent3 也应该是 running
      const agent2Status = agentMap['agent2'].status
      const latest = agentLogs[0]
      const cn = latest.output_data?.step_name_cn || stepNameCn[latest.step_name] || latest.step_name || ''

      if (agent2Status === 'running') {
        agentMap[key] = { status: 'running', task: cn || '评测中', detail: [`与Agent②协同评测中`], hasLogs: true }
      } else if (latest.status === 'started' || latest.status === 'running') {
        agentMap[key] = { status: 'running', task: cn || '评测中', detail: [`开始于 ${fmtTime(latest.created_at)}`], hasLogs: true }
      } else if (latest.status === 'failed') {
        agentMap[key] = { status: 'error', task: cn || '评测失败', detail: [latest.error_message || '评测出错'], hasLogs: true }
      } else {
        agentMap[key] = { status: 'completed', task: `${cn || latest.step_name} 已完成`, detail: [`完成于 ${fmtTime(latest.created_at)}`], hasLogs: true }
      }
    } else {
      // Agent 1/4：沿用原逻辑，看最新一条
      const latest = agentLogs[0]
      const cn = latest.output_data?.step_name_cn || stepNameCn[latest.step_name] || latest.step_name || ''
      if (latest.status === 'started' || latest.status === 'running') {
        agentMap[key] = { status: 'running', task: cn || '执行中', detail: [`开始于 ${fmtTime(latest.created_at)}`], hasLogs: true }
      } else if (latest.status === 'failed') {
        agentMap[key] = { status: 'error', task: cn || '执行失败', detail: [latest.error_message || latest.output_data?.reason || '未知错误'], hasLogs: true }
      } else {
        agentMap[key] = { status: 'completed', task: `${cn || latest.step_name} 已完成`, detail: [`完成于 ${fmtTime(latest.created_at)}`], hasLogs: true }
      }
    }
  }

  // 为每个 agent 收集最近的详细日志（只看当前 run）
  const recentLogsByAgent: Record<string, { time: string; step: string; status: string; detail: string }[]> = {
    agent1: [], agent2: [], agent3: [], agent4: [],
  }
  for (const l of currentRunLogs) {
    const num = resolveAgent(l.agent_name, l.step_name)
    const key = agentKeys[num - 1]
    if (!key || recentLogsByAgent[key].length >= 10) continue
    const out = l.output_data || {}
    const cn = out.step_name_cn || stepNameCn[l.step_name] || l.step_name || ''
    const extras: string[] = []
    if (out.plan_title) extras.push(`「${out.plan_title}」`)
    if (out.source) extras.push(sourceLabels[out.source] || out.source)
    if (out.iteration != null) extras.push(`V${out.iteration}`)
    if (out.score != null) extras.push(`${out.score}分`)
    if (l.error_message) extras.push(l.error_message)
    recentLogsByAgent[key].push({
      time: fmtTime(l.created_at),
      step: cn,
      status: l.status,
      detail: extras.join(' '),
    })
  }

  const agentLabels = [
    { id: 1, name: '需求感知引擎', icon: '🔍' },
    { id: 2, name: '课件生产车间', icon: '🏭' },
    { id: 3, name: 'AI评审团', icon: '🧑‍⚖️' },
    { id: 4, name: '课件推送中心', icon: '📤' },
  ]

  return agentLabels.map((a, i) => {
    const key = `agent${i + 1}`
    const state = agentMap[key]
    return {
      id: a.id,
      name: a.name,
      icon: a.icon,
      status: state.status as 'running' | 'processing' | 'idle' | 'completed' | 'error',
      currentTask: state.task,
      detail: state.detail,
      hasLogs: state.hasLogs,
      recentLogs: recentLogsByAgent[key],
    }
  })
}

// agent2_3 表示 agent2(生产) + agent3(评审) 联合，根据 step 判断归属
const evaluationSteps = [
  'source_score', 'round_complete', 'all_rounds_done', 'best_selected', 'approved',
  'needs_review', 'manual_review', 'all_failed', 'source_passed', 'source_eliminated', 'source_continue',
  'browser_load', 'd1_knowledge', 'd2_pedagogy', 'd3_qa', 'd4_visual', 'score_aggregate',
]

function resolveAgent(agentName: string, stepName: string): number {
  if (agentName === 'agent1') return 1
  if (agentName === 'agent2') return 2
  if (agentName === 'agent3') return 3
  if (agentName === 'agent4') return 4
  if (agentName === 'agent2_3') {
    return evaluationSteps.includes(stepName) ? 3 : 2
  }
  return 1
}

const agentIconByNum: Record<number, string> = { 1: '🔍', 2: '🏭', 3: '🧑‍⚖️', 4: '📤' }

function formatLogMessage(row: any): string {
  let out = row.output_data || {}
  if (typeof out === 'string') {
    try { out = JSON.parse(out) } catch { out = {} }
  }

  const cn = out.step_name_cn || stepNameCn[row.step_name] || ''
  if (!cn) return row.step_name || ''

  const extras: string[] = []

  // Agent① 教师计划详情
  if (out.teacher_name) extras.push(`👤 ${out.teacher_name}`)
  if (out.subject) extras.push(`[${out.subject}]`)
  if (out.plans?.length) {
    const planStrs = out.plans.map((p: any) => {
      const parts = [`「${p.title}」`]
      if (p.source) parts.push(p.source)
      if (p.priority === 'high') parts.push('⬆️高')
      else if (p.priority === 'low') parts.push('⬇️低')
      return parts.join(' ')
    })
    extras.push(planStrs.join('；'))
  } else if (out.plans_count != null) {
    extras.push(`${out.plans_count}个计划`)
  }
  if (out.total_plans != null) extras.push(`共${out.total_plans}个计划`)
  if (out.total != null && out.max_per_teacher != null) extras.push(`共${out.total}个，每位教师最多${out.max_per_teacher}个`)
  if (out.action === 'calling_llm') {
    if (out.matched_feixiang) extras.push(`匹配飞象${out.matched_feixiang}条`)
    if (out.matched_ideas) extras.push(`创意${out.matched_ideas}条`)
  }

  // Agent②③ 通用字段
  if (out.plan_title) extras.push(`「${out.plan_title}」`)
  if (out.source && !out.teacher_name) extras.push(sourceLabels[out.source] || out.source)
  if (out.iteration != null) extras.push(`V${out.iteration}`)
  if (out.score != null) extras.push(`${out.score}分`)
  if (out.best_score != null && out.score == null) extras.push(`最佳${out.best_score}分`)
  if (out.best_source) extras.push(`→ ${sourceLabels[out.best_source] || out.best_source}`)
  if (out.reason) extras.push(`(${out.reason})`)
  if (out.active_sources?.length) {
    extras.push(`参与: ${out.active_sources.map((s: string) => sourceLabels[s] || s).join('/')}`)
  }
  if (row.error_message) extras.push(`❌ ${row.error_message}`)

  return extras.length > 0 ? `${cn} ${extras.join(' ')}` : cn
}

// ========== 实时日志 ==========
export async function fetchRecentLogs(limit = 50) {
  const { data } = await supabase
    .from('pipeline_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (!data) return []

  return data.map(row => {
    const agentNum = resolveAgent(row.agent_name, row.step_name)
    return {
      time: new Date(row.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      agent: agentNum,
      icon: agentIconByNum[agentNum] ?? '📋',
      message: formatLogMessage(row),
      highlight: row.status === 'failed',
      rawStatus: row.status,
      outputData: row.output_data,
      stepName: row.step_name,
    }
  })
}

// ========== Realtime 订阅 ==========
export function subscribeLogs(onNewLog: (log: any) => void) {
  const channel = supabase
    .channel('pipeline_logs_realtime')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'pipeline_logs' },
      (payload) => {
        const row = payload.new as any
        const agentNum = resolveAgent(row.agent_name, row.step_name)
        onNewLog({
          time: new Date(row.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
          agent: agentNum,
          icon: agentIconByNum[agentNum] ?? '📋',
          message: formatLogMessage(row),
          highlight: row.status === 'failed',
          rawStatus: row.status,
          outputData: row.output_data,
          stepName: row.step_name,
        })
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
