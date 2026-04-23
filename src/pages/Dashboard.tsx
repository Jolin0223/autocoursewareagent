import { useState, useEffect, useRef, useCallback } from 'react'
import { fetchTodayStats, fetchAgentStatuses, fetchRecentLogs, subscribeLogs } from '../api/dashboard'
import { polishLogMessages } from '../api/llm'
import { useMockMode } from '../context/MockModeContext'
import { statCards, agentStatuses, mockLogs } from '../data/mockData'
import type { LogEntry, StatCard, AgentStatus } from '../data/mockData'

const agentColors = ['#6366f1', '#b3feff', '#34d399', '#fbbf24']
const agentIcons = ['/icons/agent-1.png', '/icons/agent-2.png', '/icons/agent-3.png', '/icons/agent-4.png']
const statusLabel: Record<string, string> = { running: '运行中', processing: '处理中', idle: '等待中', completed: '已完成', error: '异常' }
const statusDotColor: Record<string, string> = { running: 'bg-emerald-400', processing: 'bg-amber-400', idle: 'bg-slate-500', completed: 'bg-emerald-400', error: 'bg-rose-400' }

const agentIdleInfo: Record<number, string[]> = {
  1: ['分析教师画像偏好', '监控历史生成记录', '智能推荐今日课件主题'],
  2: ['调用三大平台生成课件', '飞象老师 / 好未来老师帮 / 自研skill', '执行V1→V3迭代生成'],
  3: ['AI虚拟评审团四维打分', '知识准确性 / 教学适配性', '系统健壮性 / 视觉美观度'],
  4: ['自动消息推送教师', '展示课件预览链接', '收集教师反馈（采纳/拒绝/一键同款）'],
}

export default function Dashboard({ focusAgent }: { focusAgent: number | null }) {
  const { isMock } = useMockMode()
  const [stats, setStats] = useState<StatCard[]>([])
  const [agents, setAgents] = useState<AgentStatus[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedAgent, setExpandedAgent] = useState<number | null>(null)
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
          fetchRecentLogs(30),
        ])
        if (cancelled) return
        setStats(s)
        setAgents(a)
        setLogs(l)

        polishLogMessages(l.map(log => ({ rawMessage: log.message, outputData: (log as any).outputData }))).then(polished => {
          if (cancelled) return
          setLogs(prev => prev.map((log, i) => ({ ...log, message: polished[i] || log.message })))
        })
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

  // Realtime 日志订阅
  const selfSkillTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (isMock) return

    const fakeSteps = [
      '🧠 自研Skill 正在解析教研大纲...',
      '📐 自研Skill 生成互动题型结构中...',
      '🎨 自研Skill 渲染课件视觉元素...',
      '🔧 自研Skill 组装HTML交互组件...',
      '✨ 自研Skill 优化动画与过渡效果...',
      '📝 自研Skill 校验知识点准确性...',
      '🔍 自研Skill 执行轻量自评检查...',
      '⚙️ 自研Skill 微调交互逻辑细节...',
      '📦 自研Skill 打包课件资源文件...',
      '🚀 自研Skill 即将完成生产...',
    ]
    let fakeIdx = 0

    const stopFakeTimer = () => {
      if (selfSkillTimerRef.current) {
        clearInterval(selfSkillTimerRef.current)
        selfSkillTimerRef.current = null
      }
      fakeIdx = 0
    }

    const startFakeTimer = () => {
      stopFakeTimer()
      selfSkillTimerRef.current = setInterval(() => {
        const msg = fakeSteps[fakeIdx % fakeSteps.length]
        fakeIdx++
        setLogs(prev => [{
          time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
          agent: 2,
          icon: '🏭',
          message: msg,
          highlight: false,
        }, ...prev].slice(0, 50))
      }, 30000)
    }

    const unsub = subscribeLogs((newLog: LogEntry) => {
      setLogs(prev => [newLog, ...prev].slice(0, 50))

      const out = (newLog as any).outputData || {}
      if (newLog.agent === 2 && out.source === 'self_skill') {
        if ((newLog as any).rawStatus === 'started') {
          startFakeTimer()
        } else {
          stopFakeTimer()
        }
      }
    })

    return () => { unsub(); stopFakeTimer() }
  }, [isMock])

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = 0
  }, [logs.length])

  const handleExpand = useCallback((id: number) => {
    setExpandedAgent(prev => prev === id ? null : id)
  }, [])

  const filteredLogs = focusAgent ? logs.filter(l => l.agent === focusAgent) : logs

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-400 text-lg">加载中...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Stats Row - 4 cards only, aligned with agent cards below */}
      <div className="grid grid-cols-4 gap-6 flex-shrink-0">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className={`card p-6 card-enter ${focusAgent && stats[i]?.agent !== `Agent${'①②③④'[focusAgent-1]}` ? 'focus-dimmed' : ''}`}
            style={{ animationDelay: `${i * 0.08}s` }}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-base text-slate-400 font-medium">{s.label}</span>
              <span
                className="text-xs px-3 py-1.5 rounded-lg font-medium"
                style={{ background: `${agentColors[i]}12`, color: agentColors[i] }}
              >
                {s.agent}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-3">
                <span className="text-5xl font-bold stat-value tracking-tight">{s.value}</span>
                <span className="text-base text-slate-500">{s.suffix}</span>
              </div>
              {s.trend > 0 && (
                <span className="text-base text-emerald-400 font-medium">↑ {s.trend}%</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Agent Cards - 4 columns */}
      <div className="grid grid-cols-4 gap-6" style={{ minHeight: '280px' }}>
        {agents.map((agent, i) => (
          <div
            key={agent.id}
            onClick={() => handleExpand(agent.id)}
            className={`card p-6 cursor-pointer flex flex-col card-enter ${
              focusAgent && focusAgent !== agent.id ? 'focus-dimmed' : ''
            } ${focusAgent === agent.id ? 'focus-highlight' : ''}`}
            style={{
              animationDelay: `${0.4 + i * 0.1}s`,
              ...(agent.status === 'running' ? {
                background: 'var(--bg-card-hover)',
                boxShadow: `0 0 20px ${agentColors[i]}25, inset 0 0 20px ${agentColors[i]}08`,
              } : {}),
            }}
          >
            {/* Agent Header */}
            <div className="flex items-center justify-between" style={{ marginBottom: '20px' }}>
              <div className="flex items-center gap-3">
                <img
                  src={agentIcons[i]}
                  alt={agent.name}
                  className="w-12 h-12 rounded-2xl object-cover"
                  style={{ boxShadow: `0 0 20px ${agentColors[i]}20` }}
                />
                <div>
                  <div className="text-lg font-semibold">{agent.name}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className={`w-2.5 h-2.5 rounded-full ${statusDotColor[agent.status]} ${agent.status === 'running' ? 'animate-pulse' : ''}`} />
                    <span className="text-sm text-slate-400">{statusLabel[agent.status]}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Current Task */}
            <div className="mb-4 relative">
              {agent.status === 'idle' && !agent.hasLogs ? (
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <img 
                        src="/icons/hourglass.png" 
                        alt="waiting" 
                        className="w-6 h-6 drop-shadow-[0_0_6px_rgba(129,140,248,0.4)]"
                        style={{ 
                          animation: 'spin 3s linear infinite', 
                          filter: 'brightness(1.2)',
                          mixBlendMode: 'lighten',
                        }}
                      />
                      <span className="text-sm font-medium bg-gradient-to-r from-slate-400 via-slate-500 to-slate-600 bg-clip-text text-transparent animate-pulse">
                        等待调度指令
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-700 animate-pulse" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-700 animate-pulse" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-700 animate-pulse" style={{ animationDelay: '300ms' }}></span>
                    </div>
                  </div>
                  <div className="relative" style={{ marginTop: '16px' }}>
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-800/20 to-transparent rounded-lg"></div>
                    <div className="relative p-3.5 rounded-lg border border-slate-800/40 backdrop-blur-sm">
                      <div className="text-xs text-slate-500 mb-2.5 flex items-center gap-1.5">
                        <span>📋</span>
                        <span className="font-medium">核心职责</span>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {agentIdleInfo[agent.id]?.map((line, li) => (
                          <div 
                            key={li} 
                            className="flex items-start gap-2 text-xs text-slate-600 group hover:text-slate-500 transition-colors"
                          >
                            <span className="text-indigo-500/40 mt-0.5 group-hover:text-indigo-400/60 transition-colors">▸</span>
                            <span className="leading-relaxed">{line}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-slate-300 text-sm font-medium">{agent.currentTask}</div>
              )}
            </div>

            {/* Details - real logs */}
            <div className="flex-1 space-y-1.5 overflow-auto">
              {agent.recentLogs && agent.recentLogs.length > 0 ? (
                (expandedAgent === agent.id ? agent.recentLogs : agent.recentLogs.slice(0, 3)).map((log, li) => {
                  const statusIcon = log.status === 'started' ? '🔄' : log.status === 'failed' ? '❌' : '✅'
                  return (
                    <div key={li} className={`text-xs py-1.5 flex items-start gap-2 leading-relaxed ${log.status === 'failed' ? 'text-rose-400/80' : 'text-slate-500'}`}>
                      <span className="flex-shrink-0 mt-0.5">{statusIcon}</span>
                      <div className="flex-1 min-w-0">
                        <span className="text-slate-600 font-mono mr-1.5">{log.time}</span>
                        <span className={log.status === 'failed' ? 'text-rose-400/80' : 'text-slate-400'}>{log.step}</span>
                        {log.detail && <span className="text-slate-600 ml-1">{log.detail}</span>}
                      </div>
                    </div>
                  )
                })
              ) : (
                agent.detail?.map((d, di) => (
                  <div key={di} className="text-sm text-slate-400 flex items-start gap-2 leading-relaxed py-1">
                    <span className="step-check">✓</span>
                    <span>{d}</span>
                  </div>
                ))
              )}
            </div>

            {/* Expand hint */}
            <div className="mt-auto pt-3 text-xs text-slate-600 text-center">
              {expandedAgent === agent.id ? '收起 ▲' : '展开详情 ▼'}
            </div>
          </div>
        ))}
      </div>

      {/* Logs - full width at bottom */}
      <div className={`card p-6 flex-shrink-0 ${focusAgent ? 'focus-dimmed' : ''}`}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-base font-semibold text-slate-300">实时日志流</span>
          <span className="text-sm text-slate-600">{filteredLogs.length} 条</span>
        </div>
        <div ref={logRef} className="space-y-2.5 max-h-64 overflow-auto">
          {filteredLogs.map((log, i) => (
            <div
              key={`${log.time}-${i}`}
              className={`log-entry flex items-start gap-3 py-2 ${
                log.highlight ? 'bg-indigo-500/5 rounded-xl px-3 -mx-3' : ''
              }`}
            >
              <span className="text-slate-500 flex-shrink-0 font-mono text-sm mt-0.5">{log.time}</span>
              <span
                className="flex-shrink-0 px-2.5 py-1 rounded-lg text-xs font-semibold"
                style={{
                  background: `${agentColors[log.agent - 1]}12`,
                  color: agentColors[log.agent - 1],
                }}
              >
                Agent{['①','②','③','④'][log.agent - 1]}
              </span>
              <span className={`text-sm leading-relaxed ${log.highlight ? 'text-indigo-300 font-medium' : 'text-slate-400'}`}>
                {log.message}
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
