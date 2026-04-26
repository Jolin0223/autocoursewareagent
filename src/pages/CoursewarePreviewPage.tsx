import { useState, useEffect } from 'react'
import { supabase } from '../api/supabase'
import { fetchEvalDetail, type EvalDetail } from '../api/courseware'

const DIMENSION_LABELS: Record<string, string> = {
  d1: '知识准确性',
  d2: '教学适配性',
  d3: '系统健壮性',
  d4: '视觉美观度',
}

const SOURCE_LABELS: Record<string, string> = {
  self_skill: '自研Skill',
  feixiang: '猿辅导飞象老师',
  laoshibang: '好未来老师帮',
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  iterating: { label: '迭代中', color: '#fbbf24' },
  manual_review: { label: '人工审核', color: '#818cf8' },
  done: { label: '已完成', color: '#34d399' },
  pushed: { label: '已推送', color: '#60a5fa' },
  approved: { label: '已采纳', color: '#34d399' },
  rejected: { label: '已拒绝', color: '#f87171' },
}

interface CoursewareDetail {
  id: string
  title: string
  subject: string
  source: string
  status: string
  composite_score: number | null
  scores: any
  created_at: string
  teacher_action: string | null
  reject_reason: string | null
  teacher_name: string | null
}

interface EvalRound {
  iteration_round: number
  composite_score: number
  scores: any
  created_at: string
  file_url: string | null
  html_snapshot: string | null
}

function getScoreColor(score: number): string {
  if (score >= 4) return '#34d399'
  if (score >= 3) return '#fbbf24'
  return '#f87171'
}

export default function CoursewarePreviewPage({ coursewareId }: { coursewareId: string }) {
  const [detail, setDetail] = useState<CoursewareDetail | null>(null)
  const [evalHistory, setEvalHistory] = useState<EvalRound[]>([])
  const [loading, setLoading] = useState(true)
  const [activeRound, setActiveRound] = useState<number | null>(null)
  const [evalDetail, setEvalDetail] = useState<EvalDetail | null>(null)
  const [expandedPanel, setExpandedPanel] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const { data: cw } = await supabase
          .from('courseware')
          .select(`
            id, title, subject, source, status, composite_score, scores,
            created_at, teacher_action, reject_reason,
            teacher_profiles!courseware_teacher_id_fkey ( name )
          `)
          .eq('id', coursewareId)
          .single()

        if (cw) {
          const raw = cw as any
          setDetail({
            ...raw,
            teacher_name: raw.teacher_profiles?.name || null,
          })
        }

        const { data: evals } = await supabase
          .from('evaluation_history')
          .select('iteration_round, composite_score, scores, created_at, file_url, html_snapshot')
          .eq('courseware_id', coursewareId)
          .order('iteration_round', { ascending: true })

        if (evals && evals.length > 0) {
          setEvalHistory(evals as EvalRound[])
          setActiveRound(evals[evals.length - 1].iteration_round)
        }

        const detailData = await fetchEvalDetail(coursewareId)
        setEvalDetail(detailData)
      } catch (e) {
        console.error('Failed to load courseware detail:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [coursewareId])

  const togglePanel = (panelId: string) => {
    setExpandedPanel(prev => (prev === panelId ? null : panelId))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-grid flex items-center justify-center">
        <div className="text-slate-400 text-lg">加载课件详情中...</div>
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="min-h-screen bg-grid flex items-center justify-center">
        <div className="text-center">
          <div className="text-slate-500 text-lg" style={{ marginBottom: '12px' }}>未找到该课件</div>
          <a href="/" className="text-indigo-400 hover:text-indigo-300 text-sm underline">返回首页</a>
        </div>
      </div>
    )
  }

  const statusInfo = STATUS_LABELS[detail.status] || { label: detail.status, color: '#94a3b8' }
  const scores = detail.scores || {}
  const activeEval = evalHistory.find(e => e.iteration_round === activeRound)
  const previewUrl = getPreviewUrl(detail.source, activeEval)

  return (
    <div className="min-h-screen bg-grid" style={{ padding: '40px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div className="card p-8" style={{ marginBottom: '24px' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: '8px' }}>
            <a href="/" className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">&larr; 返回控制台</a>
          </div>
          <div className="flex items-start justify-between" style={{ marginBottom: '24px' }}>
            <div>
              <h1 className="text-2xl font-bold text-slate-100" style={{ marginBottom: '8px' }}>
                {detail.title}
              </h1>
              <div className="flex items-center gap-3 text-sm text-slate-400">
                <span>{SOURCE_LABELS[detail.source] || detail.source}</span>
                <span>·</span>
                <span>{detail.subject}</span>
                <span>·</span>
                <span>{new Date(detail.created_at).toLocaleString('zh-CN')}</span>
              </div>
            </div>
            <span
              className="px-4 py-2 rounded-full text-sm font-semibold"
              style={{ background: `${statusInfo.color}18`, color: statusInfo.color }}
            >
              {statusInfo.label}
            </span>
          </div>

          {detail.composite_score != null && (
            <div className="flex items-center gap-6" style={{ marginBottom: '24px' }}>
              <div className="text-center">
                <div className="text-5xl font-bold stat-value">{detail.composite_score.toFixed(1)}</div>
                <div className="text-xs text-slate-500 mt-1">综合评分</div>
              </div>
              <div className="flex-1 grid grid-cols-4 gap-4">
                {Object.entries(DIMENSION_LABELS).map(([key, label]) => (
                  <div key={key} className="text-center p-3 rounded-xl" style={{ background: 'var(--bg-card)' }}>
                    <div className="text-xl font-bold text-slate-200">{(scores[key] || 0).toFixed(1)}</div>
                    <div className="text-xs text-slate-500 mt-1">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {detail.teacher_name && (
            <div className="flex items-center gap-4 text-sm" style={{ padding: '12px 16px', background: 'var(--bg-card)', borderRadius: '12px' }}>
              <span className="text-slate-500">推送教师</span>
              <span className="text-slate-300 font-medium">{detail.teacher_name}</span>
              {detail.teacher_action && (
                <>
                  <span className="text-slate-600">|</span>
                  <span style={{ color: detail.teacher_action === 'approve' ? '#34d399' : detail.teacher_action === 'reject' ? '#f87171' : '#fbbf24' }}>
                    {detail.teacher_action === 'approve' ? '已采纳' : detail.teacher_action === 'reject' ? '已拒绝' : detail.teacher_action === 'clone' ? '一键同款' : detail.teacher_action}
                  </span>
                </>
              )}
              {detail.reject_reason && (
                <span className="text-slate-500 ml-2">原因: {detail.reject_reason}</span>
              )}
            </div>
          )}
        </div>

        <div className="grid gap-6" style={{ gridTemplateColumns: previewUrl ? '1fr 1fr' : '1fr' }}>
          {/* Left: Iteration History */}
          {evalHistory.length > 0 && (
            <div className="card p-8">
              <h2 className="text-lg font-semibold text-slate-200" style={{ marginBottom: '20px' }}>迭代评测历史</h2>
              <div className="space-y-3">
                {evalHistory.map((round) => {
                  const rs = round.scores || {}
                  const isActive = round.iteration_round === activeRound
                  const hasContent = !!(round.file_url || round.html_snapshot)

                  return (
                    <div
                      key={round.iteration_round}
                      className={`flex items-center gap-4 p-4 rounded-xl transition-all ${hasContent ? 'cursor-pointer' : ''}`}
                      style={{
                        background: isActive ? 'var(--bg-card-hover)' : 'var(--bg-card)',
                        border: isActive ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
                      }}
                      onClick={() => hasContent && setActiveRound(round.iteration_round)}
                    >
                      <div className="flex-shrink-0 w-14 text-center">
                        <div className={`text-lg font-bold ${isActive ? 'text-indigo-400' : 'text-slate-400'}`}>V{round.iteration_round}</div>
                        <div className="text-xs text-slate-600">
                          {new Date(round.created_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                      <div className="flex-1 grid grid-cols-4 gap-2">
                        {Object.entries(DIMENSION_LABELS).map(([key, label]) => (
                          <div key={key} className="text-center">
                            <div className="text-sm font-semibold text-slate-300">{(rs[key] || 0).toFixed(1)}</div>
                            <div className="text-xs text-slate-600">{label}</div>
                          </div>
                        ))}
                      </div>
                      <div className="flex-shrink-0 text-center" style={{ minWidth: '50px' }}>
                        <div className="text-xl font-bold text-slate-200">{(round.composite_score || 0).toFixed(1)}</div>
                        <div className="text-xs text-slate-500">综合</div>
                      </div>
                      {hasContent && (
                        <div className="flex-shrink-0">
                          <span className={`text-xs ${isActive ? 'text-indigo-400' : 'text-slate-600'}`}>预览 →</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Right: Courseware Preview */}
          {previewUrl && (
            <div className="card p-8 flex flex-col">
              <div className="flex items-center justify-between" style={{ marginBottom: '16px' }}>
                <h2 className="text-lg font-semibold text-slate-200">
                  课件预览 · V{activeRound}
                </h2>
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  新窗口打开 ↗
                </a>
              </div>
              <div className="flex-1 rounded-xl overflow-hidden" style={{ background: '#fff', minHeight: '500px' }}>
                <iframe
                  src={previewUrl}
                  title="课件预览"
                  className="w-full h-full border-0"
                  style={{ minHeight: '500px' }}
                  sandbox="allow-scripts allow-same-origin"
                />
              </div>
            </div>
          )}
        </div>

        {/* --- 新增：AI评审详情面板区 --- */}
        {evalDetail ? (
          <div className="mt-8 space-y-4">
            {/* 面板1：四维评审详情 */}
            <div id="review-detail" className="card p-6">
              <div
                className="flex justify-between items-center cursor-pointer"
                onClick={() => togglePanel('review-detail')}
              >
                <h3 className="text-lg font-semibold text-slate-200">四维评审详情</h3>
                <span className="text-slate-400 transition-transform">
                  {expandedPanel === 'review-detail' ? '▼' : '▶'}
                </span>
              </div>
              
              {expandedPanel === 'review-detail' && (
                <div className="mt-6 border-t border-slate-700/50 pt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {Object.entries(DIMENSION_LABELS).map(([key, label]) => {
                    const score = scores[key] || 0
                    const feedback = evalDetail.feedbacks?.[key] || '暂无评语'
                    const rawKeyMap: Record<string, keyof NonNullable<EvalDetail['audit_data']>> = {
                      d1: 'a1_raw_output',
                      d2: 'a2_raw_output',
                      d3: 'b_raw_output',
                      d4: 'c_raw_output'
                    }
                    const rawData = evalDetail.audit_data?.[rawKeyMap[key]]

                    return (
                      <div key={key} className="p-4 rounded-xl border border-slate-700/30" style={{ background: 'var(--bg-card)' }}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-slate-300 font-medium">{label}</span>
                          <span className="text-lg font-bold" style={{ color: getScoreColor(score) }}>
                            {score.toFixed(1)}
                          </span>
                        </div>
                        <div className="text-sm text-slate-400 mb-4 whitespace-pre-wrap leading-relaxed">
                          {feedback}
                        </div>
                        {rawData && (
                          <details className="text-xs text-slate-500">
                            <summary className="cursor-pointer hover:text-slate-300 transition-colors">
                              查看评审原文
                            </summary>
                            <pre className="mt-3 p-3 rounded overflow-auto max-h-60 whitespace-pre-wrap font-mono leading-normal" style={{ background: 'rgba(0,0,0,0.3)' }}>
                              {rawData}
                            </pre>
                          </details>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* 面板2：Browser Use 交互测试 */}
            {evalDetail.browser_use_result && (
              <div id="browser-test" className="card p-6">
                <div
                  className="flex justify-between items-center cursor-pointer"
                  onClick={() => togglePanel('browser-test')}
                >
                  <h3 className="text-lg font-semibold text-slate-200">Browser Use 交互测试</h3>
                  <span className="text-slate-400 transition-transform">
                    {expandedPanel === 'browser-test' ? '▼' : '▶'}
                  </span>
                </div>

                {expandedPanel === 'browser-test' && (
                  <div className="mt-6 border-t border-slate-700/50 pt-6 space-y-8 text-sm text-slate-300">
                    {evalDetail.browser_use_result.screenshot_urls?.length > 0 && (
                      <div>
                        <h4 className="text-slate-200 font-medium mb-3">交互截图</h4>
                        <div className="flex gap-4 overflow-x-auto pb-4">
                          {evalDetail.browser_use_result.screenshot_urls.map((img, idx) => (
                            <div key={idx} className="flex-none w-64">
                              <a href={img.url} target="_blank" rel="noopener noreferrer" className="block mb-2">
                                <img src={img.url} alt={img.label} className="w-full h-auto rounded-lg border border-slate-700/50 hover:border-indigo-400 transition-colors" />
                              </a>
                              <div className="text-center text-xs text-slate-500">{img.label}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {evalDetail.browser_use_result.video_urls?.length > 0 && (
                      <div>
                        <h4 className="text-slate-200 font-medium mb-3">操作录屏</h4>
                        <div className="flex flex-col gap-6">
                          {evalDetail.browser_use_result.video_urls.map((vid, idx) => (
                            <div key={idx} className="w-full max-w-2xl">
                              <video controls className="w-full rounded-lg border border-slate-700/50 shadow-lg">
                                <source src={vid.url} type="video/webm" />
                                您的浏览器不支持视频播放。
                              </video>
                              <div className="mt-2 text-xs text-slate-500">{vid.label}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {evalDetail.browser_use_result.interaction_log?.length > 0 && (
                      <div>
                        <h4 className="text-slate-200 font-medium mb-3">交互日志</h4>
                        <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                          {evalDetail.browser_use_result.interaction_log.map((log, idx) => (
                            <div key={idx} className="p-4 rounded-lg border border-slate-700/30" style={{ background: 'rgba(0,0,0,0.15)' }}>
                              <div className="font-medium text-slate-300 mb-2">{log.test_case}</div>
                              <div className="text-slate-400 text-xs leading-relaxed">{log.description}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {evalDetail.browser_use_result.console_errors?.length > 0 && (
                      <div>
                        <h4 className="text-red-400 font-medium mb-3">Console 报错</h4>
                        <ul className="list-disc pl-5 space-y-2 text-red-400/90 bg-red-950/20 p-4 rounded-lg border border-red-900/30">
                          {evalDetail.browser_use_result.console_errors.map((err, idx) => (
                            <li key={idx} className="break-words font-mono text-xs">{err}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 面板3：迭代趋势 */}
            {evalDetail.history && evalDetail.history.length > 1 && (
              <div id="iteration-trend" className="card p-6">
                <div
                  className="flex justify-between items-center cursor-pointer"
                  onClick={() => togglePanel('iteration-trend')}
                >
                  <h3 className="text-lg font-semibold text-slate-200">迭代趋势</h3>
                  <span className="text-slate-400 transition-transform">
                    {expandedPanel === 'iteration-trend' ? '▼' : '▶'}
                  </span>
                </div>

                {expandedPanel === 'iteration-trend' && (
                  <div className="mt-6 border-t border-slate-700/50 pt-6 overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-300">
                      <thead>
                        <tr className="border-b border-slate-700/50">
                          <th className="py-3 px-4 font-medium text-slate-400">轮次</th>
                          <th className="py-3 px-4 font-medium text-slate-400">知识准确性</th>
                          <th className="py-3 px-4 font-medium text-slate-400">教学适配性</th>
                          <th className="py-3 px-4 font-medium text-slate-400">系统健壮性</th>
                          <th className="py-3 px-4 font-medium text-slate-400">视觉美观度</th>
                          <th className="py-3 px-4 font-medium text-slate-400">综合得分</th>
                        </tr>
                      </thead>
                      <tbody>
                        {evalDetail.history.map((h, idx) => {
                          const isLast = idx === evalDetail.history.length - 1
                          return (
                            <tr
                              key={h.iteration_round}
                              className={`border-b border-slate-700/30 last:border-0 ${isLast ? 'font-bold bg-white/5' : ''}`}
                            >
                              <td className="py-4 px-4">V{h.iteration_round}{isLast && ' (最新)'}</td>
                              <td className="py-4 px-4" style={{ color: getScoreColor(h.scores.d1) }}>
                                {(h.scores.d1 || 0).toFixed(1)}
                              </td>
                              <td className="py-4 px-4" style={{ color: getScoreColor(h.scores.d2) }}>
                                {(h.scores.d2 || 0).toFixed(1)}
                              </td>
                              <td className="py-4 px-4" style={{ color: getScoreColor(h.scores.d3) }}>
                                {(h.scores.d3 || 0).toFixed(1)}
                              </td>
                              <td className="py-4 px-4" style={{ color: getScoreColor(h.scores.d4) }}>
                                {(h.scores.d4 || 0).toFixed(1)}
                              </td>
                              <td className="py-4 px-4 text-base" style={{ color: getScoreColor(h.composite_score) }}>
                                {(h.composite_score || 0).toFixed(1)}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="mt-8 card p-6 text-center text-slate-500">
            暂无 AI 评审详细数据
          </div>
        )}
      </div>
    </div>
  )
}

function getPreviewUrl(source: string, evalRound?: EvalRound | null): string | null {
  if (!evalRound) return null

  if (source === 'self_skill') {
    return evalRound.file_url || null
  }

  if (evalRound.html_snapshot) {
    if (evalRound.html_snapshot.startsWith('data:text/html;base64,')) {
      const base64 = evalRound.html_snapshot.replace('data:text/html;base64,', '')
      const binary = atob(base64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      const blob = new Blob([bytes], { type: 'text/html' })
      return URL.createObjectURL(blob)
    }

    if (evalRound.html_snapshot.startsWith('data:')) {
      return evalRound.html_snapshot
    }

    const blob = new Blob([evalRound.html_snapshot], { type: 'text/html;charset=utf-8' })
    return URL.createObjectURL(blob)
  }

  return null
}
