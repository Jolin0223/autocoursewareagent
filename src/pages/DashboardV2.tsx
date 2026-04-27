import { useState, useEffect, useRef } from 'react'
import { fetchTodayStats, fetchAgentStatuses, fetchRecentLogs, subscribeLogs } from '../api/dashboard'
import { useMockMode } from '../context/MockModeContext'
import { statCards, agentStatuses, mockLogs } from '../data/mockData'
import type { LogEntry, StatCard, AgentStatus } from '../data/mockData'

function renderLogWithLink(message: string, planTitle: string, coursewareId: string) {
  const marker = `「${planTitle}」`
  const idx = message.indexOf(marker)
  if (idx === -1) return message
  const before = message.slice(0, idx)
  const after = message.slice(idx + marker.length)

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    try {
      const { supabase } = await import('../api/supabase')
      // 查 courseware 表获取 source 和 file_url
      const { data: cw } = await supabase
        .from('courseware')
        .select('source, file_url')
        .eq('id', coursewareId)
        .single()

      if (cw?.source === 'self_skill' && cw?.file_url) {
        window.open(cw.file_url, '_blank')
        return
      }

      // 查 evaluation_history 获取最新轮次
      const { data: evals } = await supabase
        .from('evaluation_history')
        .select('file_url, html_snapshot')
        .eq('courseware_id', coursewareId)
        .order('iteration_round', { ascending: false })
        .limit(1)

      const evalRow = evals?.[0]
      if (cw?.source === 'self_skill' && evalRow?.file_url) {
        window.open(evalRow.file_url, '_blank')
        return
      }
      if (evalRow?.html_snapshot) {
        let blobUrl: string
        if (evalRow.html_snapshot.startsWith('data:text/html;base64,')) {
          const base64 = evalRow.html_snapshot.replace('data:text/html;base64,', '')
          const binary = atob(base64)
          const bytes = new Uint8Array(binary.length)
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
          const blob = new Blob([bytes], { type: 'text/html' })
          blobUrl = URL.createObjectURL(blob)
        } else {
          const blob = new Blob([evalRow.html_snapshot], { type: 'text/html;charset=utf-8' })
          blobUrl = URL.createObjectURL(blob)
        }
        window.open(blobUrl, '_blank')
        return
      }

      // fallback: 走 CoursewarePreviewPage
      window.open(`/?preview=${coursewareId}`, '_blank')
    } catch {
      window.open(`/?preview=${coursewareId}`, '_blank')
    }
  }

  return (
    <>
      {before}
      <a
        href={`/?preview=${coursewareId}`}
        onClick={handleClick}
        target="_blank"
        rel="noopener noreferrer"
        className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 decoration-indigo-400/30 hover:decoration-indigo-300/60 transition-colors cursor-pointer"
      >
        「{planTitle}」
      </a>
      {after}
    </>
  )
}

const agentColors = ['#6366f1', '#b3feff', '#34d399', '#fbbf24']
const agentIcons = ['/icons/agent-1.png', '/icons/agent-2.png', '/icons/agent-3.png', '/icons/agent-4.png']
const statusLabel: Record<string, string> = { running: '运行中', processing: '处理中', idle: '等待中', completed: '已完成', error: '异常' }
const statusDotColor: Record<string, string> = { running: 'bg-emerald-400', processing: 'bg-amber-400', idle: 'bg-slate-500', completed: 'bg-emerald-400', error: 'bg-rose-400' }

const agentSteps: Record<number, string[]> = {
  1: ['分析教师教学偏好', '扫描外部热门资源', '匹配需求与教师画像', '触发每日自动生产'],
  2: ['飞象/好未来/自研Skill', '三源并行选最优', '3轮迭代优胜劣汰','交付可用互动课件'],
  3: ['智能生成测试用例', '浏览器自动化交互', '逐步截屏全程录屏', '四维打分智能评审'],
  4: ['飞书卡片智能生成', '一键推送匹配教师', '上架/退回/修改/评分', '收集反馈闭环回流 '],
}

export default function DashboardV2({ focusAgent }: { focusAgent: number | null }) {
  const { isMock } = useMockMode()
  const [stats, setStats] = useState<StatCard[]>([])
  const [agents, setAgents] = useState<AgentStatus[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const logRef = useRef<HTMLDivElement>(null)

  // 加载数据
  useEffect(() => {
    if (isMock) {
      setStats(statCards)
      setAgents(agentStatuses)
      setLogs(mockLogs)
      setLoading(false)
      return
    }

    let cancelled = false
    async function load() {
      try {
        const [s, a, l] = await Promise.all([
          fetchTodayStats(),
          fetchAgentStatuses(),
          fetchRecentLogs(50),
        ])
        if (cancelled) return
        setStats(s)
        setAgents(a)
        setLogs(l)
      } catch (e) {
        console.error('Dashboard data load failed:', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()

    const poll = setInterval(async () => {
      try {
        const [s, a] = await Promise.all([fetchTodayStats(), fetchAgentStatuses()])
        if (!cancelled) { setStats(s); setAgents(a) }
      } catch {}
    }, 30000)

    return () => { cancelled = true; clearInterval(poll) }
  }, [isMock])

  // Realtime 日志订阅 + 补充日志（按 source 区分文案）
  useEffect(() => {
    if (isMock) return

    const runningSourcesRef = { current: new Set<string>() }
    const sourceMessageIndexRef = { current: {} as Record<string, number> }
    const sourceTimersRef = { current: {} as Record<string, ReturnType<typeof setInterval>> }
    const sourceLastLogTimeRef = { current: {} as Record<string, number> }

    // 不同 source 的补充文案
    const sourceMessages: Record<string, string[]> = {
      self_skill: [
        '🧠 自研Skill 正在识别用户核心需求',
        '📚 新东方知识库介入中保证教学专业性',
        '📐 正在规划完整实现方案，包括教学设计、游戏互动设计、视觉呈现设计',
        '🎨 正在生成视觉优美的图片资产包...',
        '🔊 正在合成音频资产包...',
        '🧩 正在组装互动HTML组件并校验知识点',
        '⚙️ 正在组装HTML5交互组件及状态机',
        '🎯 正在组装HTML5互动组件并优化渲染引擎',
        '🔍 正在启动代码审查机制...',
        '🚀 多模态渲染上线中...',
      ],
      feixiang: [
        '📄 飞象老师 调用API生成课件',
        '⏳ 飞象老师 等待服务器响应...',
        '📦 飞象老师 接收生成结果',
        '🔄 飞象老师 处理返回数据',
      ],
      laoshibang: [
        '📝 老师帮 提交生成请求',
        '⏳ 老师帮 等待平台处理...',
        '📥 老师帮 下载生成内容',
        '✅ 老师帮 完成基础生成',
      ],
    }

    const stopSourceTimer = (source: string) => {
      if (sourceTimersRef.current[source]) {
        clearInterval(sourceTimersRef.current[source])
        delete sourceTimersRef.current[source]
      }
      runningSourcesRef.current.delete(source)
    }

    const startSourceTimer = (source: string) => {
      stopSourceTimer(source)
      runningSourcesRef.current.add(source)
      sourceMessageIndexRef.current[source] = 0
      sourceLastLogTimeRef.current[source] = Date.now()

      sourceTimersRef.current[source] = setInterval(() => {
        const elapsed = Date.now() - (sourceLastLogTimeRef.current[source] || 0)
        if (elapsed > 30000 && runningSourcesRef.current.has(source)) {
          const messages = sourceMessages[source] || sourceMessages.self_skill
          const idx = sourceMessageIndexRef.current[source] || 0
          const message = messages[idx % messages.length]
          sourceMessageIndexRef.current[source] = idx + 1
          
          setLogs(prev => [{
            time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
            agent: 2,
            icon: '🏭',
            message,
            highlight: false,
          }, ...prev].slice(0, 50))
          
          sourceLastLogTimeRef.current[source] = Date.now()
        }
      }, 35000)
    }

    const unsub = subscribeLogs((newLog: LogEntry) => {
      setLogs(prev => [newLog, ...prev].slice(0, 50))

      // 实时更新 agent 状态，让卡片即时高亮
      const agentIdx = newLog.agent - 1
      const raw = newLog.rawStatus
      const step = newLog.stepName || ''

      if (raw === 'started' || raw === 'running') {
        setAgents(prev => prev.map((a, i) =>
          i === agentIdx ? { ...a, status: 'running' as const } : a
        ))
      } else if (raw === 'success' || raw === 'failed') {
        if (newLog.agent === 2) {
          // Agent2: multi_source_generate success = 完成, all_failed = 异常
          if (step === 'multi_source_generate' && raw === 'success') {
            setAgents(prev => prev.map((a, i) => i === 1 ? { ...a, status: 'completed' as const } : a))
          } else if (step === 'all_failed') {
            setAgents(prev => prev.map((a, i) => i === 1 ? { ...a, status: 'error' as const } : a))
          }
        } else if (newLog.agent === 3) {
          // Agent3: approved/needs_review/manual_review = 完成, all_failed = 异常
          const agent3FinalSteps = ['approved', 'needs_review', 'manual_review']
          if (agent3FinalSteps.includes(step) && raw === 'success') {
            setAgents(prev => prev.map((a, i) => i === 2 ? { ...a, status: 'completed' as const } : a))
          } else if (step === 'all_failed') {
            setAgents(prev => prev.map((a, i) => i === 2 ? { ...a, status: 'error' as const } : a))
          }
        } else if (newLog.agent === 1) {
          // Agent1: complete/demand_perception success = 完成, error/failed = 异常
          if ((step === 'complete' || step === 'demand_perception') && raw === 'success') {
            setAgents(prev => prev.map((a, i) => i === 0 ? { ...a, status: 'completed' as const } : a))
          } else if (step === 'error' || raw === 'failed') {
            setAgents(prev => prev.map((a, i) => i === 0 ? { ...a, status: 'error' as const } : a))
          }
        } else if (newLog.agent === 4) {
          // Agent4: complete success = 完成, error/failed = 异常
          if (step === 'complete' && raw === 'success') {
            setAgents(prev => prev.map((a, i) => i === 3 ? { ...a, status: 'completed' as const } : a))
          } else if (step === 'error' || raw === 'failed') {
            setAgents(prev => prev.map((a, i) => i === 3 ? { ...a, status: 'error' as const } : a))
          }
        }
      }

      // source 级别补充日志（agent2 和 agent3 都可能携带 source 信息）
      const out = (newLog as any).outputData || {}
      const source = out.source as string | undefined
      if (source && (newLog.agent === 2 || newLog.agent === 3)) {
        // 收到该 source 的真实日志，更新该 source 的时间戳
        sourceLastLogTimeRef.current[source] = Date.now()

        if (raw === 'started' || raw === 'running') {
          if (!runningSourcesRef.current.has(source)) {
            startSourceTimer(source)
          }
        } else if (raw === 'success' || raw === 'failed') {
          stopSourceTimer(source)
        }
      }
    })

    return () => { 
      unsub()
      // 清理所有定时器
      Object.keys(sourceTimersRef.current).forEach(src => stopSourceTimer(src))
    }
  }, [isMock])

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = 0
  }, [logs.length])

  const filteredLogs = focusAgent ? logs.filter(l => l.agent === focusAgent) : logs

  // 根据 agent 状态推断流程进度
  const agentProgress = (() => {
    if (!agents.length) return { completed: 0, running: 0 }
    // 找到最高的已完成或正在运行的 agent
    let completed = 0
    let running = 0
    for (let i = 0; i < agents.length; i++) {
      const s = agents[i].status
      if (s === 'completed' || s === 'error') {
        completed = Math.max(completed, i + 1)
      }
      if (s === 'running' || s === 'processing') {
        running = Math.max(running, i + 1)
      }
    }
    console.log('[V2] Agent statuses:', agents.map((a, i) => `${i+1}:${a.status}`).join(', '), '→ progress:', { completed, running })
    return { completed, running }
  })()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-400 text-lg">加载中...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Merged Agent Cards with Flow Animation */}
      <div className="relative">
        <div className="grid grid-cols-4 gap-6">
          {agents.map((agent, i) => {
            const stat = stats[i]
            const isActive = agent.status === 'running' || agent.status === 'processing'
            const color = agentColors[i]
            return (
              <div
                key={agent.id}
                className={`card p-5 flex flex-col card-enter agent-flow-card relative ${
                  focusAgent && focusAgent !== agent.id ? 'focus-dimmed' : ''
                } ${focusAgent === agent.id ? 'focus-highlight' : ''}`}
                style={{
                  animationDelay: `${i * 0.1}s`,
                  minHeight: '160px',
                  '--agent-color': color,
                  overflow: isActive ? 'visible' : undefined,
                  borderColor: isActive ? `color-mix(in srgb, ${color} 35%, transparent)` : undefined,
                  boxShadow: isActive
                    ? `0 0 24px color-mix(in srgb, ${color} 18%, transparent), 0 0 48px color-mix(in srgb, ${color} 10%, transparent), inset 0 0 20px color-mix(in srgb, ${color} 6%, transparent)`
                    : undefined,
                } as React.CSSProperties}
              >
                {/* Active: top border shimmer */}
                {isActive && (
                  <div
                    className="border-shimmer-bar"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '2px',
                      borderRadius: '20px 20px 0 0',
                      background: `linear-gradient(90deg, transparent 0%, ${color} 30%, transparent 50%, ${color} 70%, transparent 100%)`,
                      backgroundSize: '200% 100%',
                      animation: 'border-shimmer 2s linear infinite',
                      opacity: 0.85,
                      zIndex: 2,
                      pointerEvents: 'none',
                    }}
                  />
                )}
                {/* Active: glow overlay */}
                {isActive && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: '20px',
                      background: `radial-gradient(ellipse 60% 40% at 50% 0%, color-mix(in srgb, ${color} 10%, transparent), transparent), radial-gradient(ellipse 40% 60% at 100% 50%, color-mix(in srgb, ${color} 5%, transparent), transparent)`,
                      animation: 'card-glow-shift 3s ease-in-out infinite',
                      pointerEvents: 'none',
                      zIndex: 0,
                    }}
                  />
                )}
                {/* Agent Badge - Inside, aligned to top edge */}
                <span
                  className="absolute top-1 left-1/2 -translate-x-1/2 text-xs px-4 py-0.5 rounded-full font-semibold whitespace-nowrap z-10"
                  style={{
                    background: `linear-gradient(135deg, ${agentColors[i]}25, ${agentColors[i]}10)`,
                    color: agentColors[i],
                    border: `1px solid ${agentColors[i]}35`,
                  }}
                >
                  {stat?.agent}
                </span>

                {/* Agent Header */}
                <div className="flex items-center justify-between mb-3 mt-6">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={agentIcons[i]}
                      alt={agent.name}
                      className="w-10 h-10 rounded-xl object-cover"
                      style={{ boxShadow: `0 0 16px ${agentColors[i]}20` }}
                    />
                    <div className="text-base font-semibold">{agent.name}</div>
                  </div>
                  <div className="text-xs text-slate-400">{stat?.label}</div>
                </div>

                {/* Stats Section - Centered */}
                <div className="mb-3 pb-3 border-b border-slate-800/40">
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-4xl font-bold stat-value tracking-tight" style={{ color: agentColors[i] }}>
                      {stat?.value}
                    </span>
                    <span className="text-base text-slate-400">{stat?.suffix}</span>
                    {stat?.trend > 0 && (
                      <span className="text-xs text-emerald-400 font-medium ml-2">↑ {stat.trend}%</span>
                    )}
                  </div>
                </div>

                {/* Flow Steps */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {agentSteps[agent.id]?.map((step, si) => (
                    <div key={si} className="flex items-center gap-1">
                      <div className="text-xs px-2 py-1 rounded-md bg-slate-800/60 text-slate-300 border border-slate-600/40">
                        {step}
                      </div>
                      {si < agentSteps[agent.id].length - 1 && (
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" className="flex-shrink-0">
                          <path d="M4 2L8 6L4 10" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
                        </svg>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Flow Arrows between cards */}
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 20 }}>
          {[0, 1, 2].map(idx => {
            // idx=0: between card 1→2, idx=1: between card 2→3, idx=2: between card 3→4
            // Arrow lights up if the flow has reached or passed this gap
            const gapAgent = idx + 1 // the agent before this gap
            const hasReached = agentProgress.completed >= gapAgent || agentProgress.running > gapAgent
            const isPulsing = agentProgress.running === gapAgent + 1 // the agent after this gap is running
            const isActive = hasReached || isPulsing
            const leftPercent = 25 * (idx + 1)
            const color = agentColors[idx + 1]
            return (
              <div
                key={idx}
                className="absolute top-1/2"
                style={{ left: `${leftPercent}%`, transform: 'translate(-50%, -50%)' }}
              >
                <div className="relative w-8 h-8 flex items-center justify-center">
                  {/* Glow background */}
                  {isActive && (
                    <div
                      className="absolute inset-0 rounded-full flow-glow"
                      style={{ background: `${color}40` }}
                    />
                  )}
                  <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M5 3L10 8L5 13"
                      stroke={isActive ? color : '#475569'}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={isPulsing ? 'flow-arrow-pulse' : ''}
                    />
                  </svg>
                  {/* Particle trail */}
                  {isPulsing && (
                    <div
                      className="absolute w-2 h-2 rounded-full flow-particle-dot"
                      style={{ background: color }}
                    />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Logs - full width, large height, optimized for projection */}
      <div className={`card p-6 flex-shrink-0 ${focusAgent ? 'focus-dimmed' : ''}`}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-lg font-semibold text-slate-200">实时日志流</span>
          </div>
          <span className="text-sm text-slate-500">{filteredLogs.length} 条</span>
        </div>
        <div ref={logRef} className="space-y-1 max-h-[50vh] overflow-auto">
          {filteredLogs.map((log, i) => (
            <div
              key={`${log.time}-${i}`}
              className={`log-entry flex items-start gap-4 py-2.5 px-3 rounded-lg ${
                i === 0 ? 'bg-indigo-500/10 ring-1 ring-indigo-500/20' : log.highlight ? 'bg-indigo-500/8' : 'hover:bg-slate-800/30'
              }`}
            >
              <span className="text-slate-400 flex-shrink-0 font-mono text-base mt-0.5 tabular-nums">{log.time}</span>
              <span
                className="flex-shrink-0 px-3 py-1 rounded-lg text-sm font-semibold"
                style={{
                  background: `${agentColors[log.agent - 1]}15`,
                  color: agentColors[log.agent - 1],
                }}
              >
                Agent{['①','②','③','④'][log.agent - 1]}
              </span>
              <span className={`text-base leading-relaxed ${log.highlight ? 'text-indigo-300 font-medium' : 'text-slate-300'}`}>
                {log.outputData?.courseware_id && log.outputData?.plan_title
                  ? renderLogWithLink(log.message, log.outputData.plan_title, log.outputData.courseware_id)
                  : log.message}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Focus Mode Hint */}
      {focusAgent && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl glass text-base text-indigo-300 z-50 flex items-center gap-3 shadow-2xl shadow-indigo-500/10">
          <div className="status-dot" style={{ background: agentColors[focusAgent - 1] }} />
          聚焦: Agent{['①','②','③','④'][focusAgent - 1]} {agents[focusAgent - 1]?.name}
          <span className="text-sm text-slate-600 ml-2">按 0 退出</span>
        </div>
      )}
    </div>
  )
}
