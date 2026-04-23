import { useState, useEffect } from 'react'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { fetchCoursewareComparison, fetchCoursewareVersions } from '../api/courseware'
import type { CoursewareCompareItem, CoursewareVersion } from '../api/courseware'
import { analyzeSkillIteration } from '../api/llm'
import { useMockMode } from '../context/MockModeContext'
import { coursewareComparison as mockComparison, coursewareVersions as mockVersions } from '../data/mockData'
import InfoButton from '../components/InfoButton'

const platformColor: Record<string, string> = {
  feixiang: '#3b82f6',
  laoshibang: '#34d399',
  self_skill: '#fbbf24',
}

const dimLabels: Record<string, string> = {
  d1: '知识准确性',
  d2: '教学适配性',
  d3: '系统健壮性',
  d4: '视觉美观度',
}

export default function CoursewarePage() {
  const { isMock } = useMockMode()
  const [coursewareComparison, setCoursewareComparison] = useState<CoursewareCompareItem[]>([])
  const [coursewareVersions, setCoursewareVersions] = useState<CoursewareVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [diagnosisAdvice, setDiagnosisAdvice] = useState<{ knowledge: string; teaching: string; interaction: string; visual: string } | null>(null)

  useEffect(() => {
    if (isMock) {
      setCoursewareComparison(mockComparison as any)
      setCoursewareVersions(mockVersions)
      setDiagnosisAdvice({
        knowledge: '知识点覆盖全面，建议增加易错题',
        teaching: '教学梯度合理，可加强互动反馈',
        interaction: '交互流畅无卡顿，DOM结构干净',
        visual: '视觉风格统一，建议优化配色对比度',
      })
      setLoading(false)
      return
    }

    Promise.all([fetchCoursewareComparison(), fetchCoursewareVersions()]).then(([comp, vers]) => {
      setCoursewareComparison(comp)
      setCoursewareVersions(vers)
      setLoading(false)

      const self = comp.find(c => c.platform === 'self_skill')
      const fx = comp.find(c => c.platform === 'feixiang')
      const lb = comp.find(c => c.platform === 'laoshibang')
      if (self) {
        analyzeSkillIteration({
          selfSkill: { ...self.scores, composite: self.composite },
          feixiang: { ...(fx?.scores || { d1: 0, d2: 0, d3: 0, d4: 0 }), composite: fx?.composite || 0 },
          laoshibang: { ...(lb?.scores || { d1: 0, d2: 0, d3: 0, d4: 0 }), composite: lb?.composite || 0 },
        }).then(setDiagnosisAdvice).catch(err => {
          console.error('AI 迭代诊断失败:', err)
          setDiagnosisAdvice({
            knowledge: '提升知识准确性',
            teaching: '提升教学适配性',
            interaction: '提升系统健壮性',
            visual: '优化视觉素材质量',
          })
        })
      } else {
        setDiagnosisAdvice({
          knowledge: '暂无数据',
          teaching: '暂无数据',
          interaction: '暂无数据',
          visual: '暂无数据',
        })
      }
    })
  }, [isMock])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        <span className="animate-pulse">加载课件对比数据中...</span>
      </div>
    )
  }

  if (coursewareComparison.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        暂无课件评测数据
      </div>
    )
  }

  const best = coursewareComparison.reduce((a, b) => a.composite > b.composite ? a : b)

  const dimWinners = (['d1', 'd2', 'd3', 'd4'] as const).map(d => {
    const winner = coursewareComparison.reduce((a, b) => a.scores[d] > b.scores[d] ? a : b)
    return { dim: d, label: dimLabels[d], winner: winner.platformLabel, score: winner.scores[d], color: platformColor[winner.platform] || '#818cf8' }
  })

  const v1Data = coursewareVersions[0] || {}
  const v5Data = coursewareVersions[coursewareVersions.length - 1] || {}
  const improvements = coursewareComparison.map(c => ({
    platform: c.platformLabel,
    v1: (v1Data[c.platform] as number) ?? 0,
    v5: (v5Data[c.platform] as number) ?? 0,
    improve: (((v5Data[c.platform] as number) ?? 0) - ((v1Data[c.platform] as number) ?? 0)).toFixed(2),
  }))
  const maxImprove = improvements.length > 0
    ? improvements.reduce((a, b) => parseFloat(a.improve) > parseFloat(b.improve) ? a : b)
    : { improve: '0', platform: '-', v1: 0, v5: 0 }

  const radarData = (['d1', 'd2', 'd3', 'd4'] as const).map(d => {
    const row: Record<string, string | number> = { dim: dimLabels[d] }
    coursewareComparison.forEach(c => { row[c.platform] = c.scores[d] })
    return row
  })

  return (
    <div className="flex flex-col gap-6">
      {/* Row 1: Stats */}
      <div className="grid grid-cols-3 gap-6">
        <div className="card p-6 card-enter flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm text-slate-500 font-medium">评测课件数</span>
              <InfoButton metricName="评测课件数" metricValue={coursewareComparison.length} context={{ platforms: coursewareComparison.map(c => c.platformLabel) }} />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold stat-value text-white">{coursewareComparison.length}</span>
              <span className="text-sm text-slate-500">个课件</span>
            </div>
          </div>
          <img src="/icons/评测课件.png" alt="评测课件" className="w-10 h-10" />
        </div>

        <div className="card p-6 card-enter flex items-center justify-between" style={{ animationDelay: '0.05s' }}>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm text-slate-500 font-medium">全维度综合得分王</span>
              <InfoButton metricName="全维度综合得分王" metricValue={best.composite.toFixed(2)} context={{ platform: best.platformLabel, scores: best.scores }} />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold stat-value" style={{ color: platformColor[best.platform] }}>{best.composite.toFixed(2)}</span>
              <span className="text-sm text-slate-500">分 / {best.platformLabel}</span>
            </div>
          </div>
          <img src="/icons/得分王.png" alt="得分王" className="w-10 h-10" />
        </div>

        <div className="card p-6 card-enter flex items-center justify-between" style={{ animationDelay: '0.1s' }}>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm text-slate-500 font-medium">最大进步幅度 (V1→V3)</span>
              <InfoButton metricName="最大进步幅度" metricValue={`+${maxImprove.improve}`} context={{ platform: maxImprove.platform, v1: maxImprove.v1, v3: maxImprove.v5 }} />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold stat-value text-purple-400">+{maxImprove.improve}</span>
              <span className="text-sm text-slate-500">分 / {maxImprove.platform}</span>
            </div>
          </div>
          <img src="/icons/进步幅度.png" alt="进步幅度" className="w-10 h-10" />
        </div>
      </div>

      {/* Row 2: Radar + Showdown */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-4 card p-6 card-enter" style={{ animationDelay: '0.15s' }}>
          <div className="flex items-center gap-3 mb-4">
            <h3 className="section-title">能力分布雷达图</h3>
            <InfoButton metricName="能力分布雷达图" metricValue="四维度对比" context={{ platforms: coursewareComparison.map(c => ({ name: c.platformLabel, scores: c.scores })) }} />
          </div>
          <div style={{ width: '90%', margin: '0 auto' }}>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData} cx="50%" cy="45%">
              <PolarGrid stroke="#1e293b" strokeWidth={1.5} />
              <PolarAngleAxis dataKey="dim" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <PolarRadiusAxis domain={[0, 5]} tick={{ fill: '#475569', fontSize: 10 }} />
              <Radar name="飞象老师" dataKey="feixiang" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.12} strokeWidth={2} />
              <Radar name="老师帮" dataKey="laoshibang" stroke="#34d399" fill="#34d399" fillOpacity={0.12} strokeWidth={2} />
              <Radar name="自研Skill" dataKey="self_skill" stroke="#fbbf24" fill="#fbbf24" fillOpacity={0.12} strokeWidth={2} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8', paddingTop: '16px' }} />
            </RadarChart>
          </ResponsiveContainer>
          </div>
        </div>

        <div className="col-span-8 card p-6 card-enter flex flex-col gap-6" style={{ animationDelay: '0.2s' }}>
          <h3 className="section-title">综合实力对决</h3>
          <div className="grid grid-cols-2 gap-4">
            {(() => {
              const v1 = coursewareVersions[0] || {}
              const vLatest = coursewareVersions[coursewareVersions.length - 1] || {}

              const findBest = (row: Record<string, any>) => {
                let bestSrc = ''
                let bestScore = -1
                coursewareComparison.forEach(c => {
                  const score = (row[c.platform] as number) ?? 0
                  if (score > bestScore) { bestScore = score; bestSrc = c.platformLabel }
                })
                return { score: bestScore, label: bestSrc }
              }

              const v1Best = findBest(v1)
              const vLatestBest = findBest(vLatest)

              return (
                <>
                  <div className="rounded-2xl p-6" style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.1)' }}>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-semibold text-indigo-400">初稿开箱即用能力最强</span>
                      <InfoButton metricName="V1版本综合得分王" metricValue={v1Best.score.toFixed(2)} context={{ platform: v1Best.label, allScores: v1 }} />
                    </div>
                    <div className="text-sm text-slate-400 mb-3">V1 版本综合得分王</div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-indigo-400">{v1Best.score.toFixed(2)}</span>
                      <span className="text-sm text-slate-500">分 / {v1Best.label}</span>
                    </div>
                  </div>
                  <div className="rounded-2xl p-6" style={{ background: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.1)' }}>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-semibold text-emerald-400">终稿潜力迭代上限最高</span>
                      <InfoButton metricName="V3版本综合得分王" metricValue={vLatestBest.score.toFixed(2)} context={{ platform: vLatestBest.label, allScores: vLatest }} />
                    </div>
                    <div className="text-sm text-slate-400 mb-3">V3 版本综合得分王</div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-emerald-400">{vLatestBest.score.toFixed(2)}</span>
                      <span className="text-sm text-slate-500">分 / {vLatestBest.label}</span>
                    </div>
                  </div>
                </>
              )
            })()}
          </div>

          <div style={{ borderTop: '1px solid rgba(99,102,241,0.06)' }}>
            <h4 className="section-title mt-2 mb-4">各维度最强王者</h4>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {dimWinners.map(dw => (
              <div key={dw.dim} className="rounded-2xl p-5 flex items-center gap-4" style={{ background: `${dw.color}06`, border: `1px solid ${dw.color}12` }}>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-slate-500 font-medium">{dw.label}</span>
                    <InfoButton metricName={dw.label} metricValue={dw.score} context={{ winner: dw.winner, allPlatforms: coursewareComparison.map(c => ({ platform: c.platformLabel, score: c.scores[dw.dim as keyof typeof c.scores] })) }} />
                  </div>
                  <div className="text-sm font-bold text-slate-300 truncate">{dw.winner}</div>
                </div>
                <div className="text-2xl font-bold stat-value" style={{ color: dw.color }}>{dw.score}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Bar Chart + Diagnosis */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-5 card p-6 card-enter" style={{ animationDelay: '0.25s' }}>
          <div className="flex items-center gap-3 mb-4">
            <h3 className="section-title">进化幅度对比 (V1→V3)</h3>
            <InfoButton metricName="进化幅度对比" metricValue="V1→V3" context={{ improvements }} />
          </div>
          <div style={{ width: '90%', margin: '0 auto' }}>
            <ResponsiveContainer width="100%" height={220}>
            <BarChart data={coursewareVersions} barGap={2} margin={{ left: 20, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="version" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis domain={[2, 4.5]} tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 12, fontSize: 13 }} cursor={false} />
              <Bar dataKey="feixiang" name="飞象老师" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="laoshibang" name="老师帮" fill="#34d399" radius={[4, 4, 0, 0]} />
              <Bar dataKey="self_skill" name="自研Skill" fill="#fbbf24" radius={[4, 4, 0, 0]} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8', paddingTop: '12px' }} />
            </BarChart>
          </ResponsiveContainer>
          </div>
        </div>

        <div className="col-span-7 card-enter rounded-2xl p-6 flex flex-col" style={{
          animationDelay: '0.3s',
          background: 'linear-gradient(135deg, rgba(15,23,42,0.9), rgba(30,41,59,0.8))',
          border: '1px solid rgba(99,102,241,0.1)',
        }}>
          <div className="flex items-center" style={{ marginBottom: '15px' }}>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span className="text-amber-400">✨</span> 自研Skill 迭代诊断
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-4 flex-1">
            {(() => {
              const self = coursewareComparison.find(c => c.platform === 'self_skill')
              const fx = coursewareComparison.find(c => c.platform === 'feixiang')
              const lb = coursewareComparison.find(c => c.platform === 'laoshibang')
              const s = self?.scores || { d1: 0, d2: 0, d3: 0, d4: 0 }
              const fxS = fx?.scores || { d1: 0, d2: 0, d3: 0, d4: 0 }
              const lbS = lb?.scores || { d1: 0, d2: 0, d3: 0, d4: 0 }
              const bestD1 = Math.max(fxS.d1, lbS.d1)
              const bestD1Name = fxS.d1 >= lbS.d1 ? '飞象' : '老师帮'

              const items = [
                {
                  icon: '📖', title: '知识层', color: '#818cf8',
                  desc: `${bestD1Name}d1: ${bestD1} vs 自研: ${s.d1}`,
                  action: diagnosisAdvice?.knowledge || (s.d1 >= bestD1 ? '知识准确性领先' : '提升知识准确性'),
                  loading: !diagnosisAdvice,
                },
                {
                  icon: '📚', title: '教学层', color: '#34d399',
                  desc: `老师帮d2: ${lbS.d2} vs 自研: ${s.d2}`,
                  action: diagnosisAdvice?.teaching || (s.d2 >= lbS.d2 ? '教学适配性领先' : '提升教学适配'),
                  loading: !diagnosisAdvice,
                },
                {
                  icon: '⚡', title: '交互层', color: '#fbbf24',
                  desc: `飞象d3: ${fxS.d3} vs 自研: ${s.d3}`,
                  action: diagnosisAdvice?.interaction || (s.d3 >= fxS.d3 ? '系统稳定性领先' : '提升系统健壮性'),
                  loading: !diagnosisAdvice,
                },
                {
                  icon: '🎨', title: '视觉层', color: '#3b82f6',
                  desc: `飞象d4: ${fxS.d4} vs 自研: ${s.d4}`,
                  action: diagnosisAdvice?.visual || (s.d4 >= fxS.d4 ? '视觉层领先' : '优化视觉素材质量'),
                  loading: !diagnosisAdvice,
                },
              ]
              return items.map(item => (
                <div key={item.title} className="rounded-xl p-4 flex flex-col" style={{ background: `${item.color}08`, border: `1px solid ${item.color}12` }}>
                  <span className="text-2xl mb-3">{item.icon}</span>
                  <div className="text-sm font-bold text-slate-200 mb-1.5">{item.title}</div>
                  <div className="text-xs text-slate-500 leading-relaxed mb-3 flex-1">{item.desc}</div>
                  <div className="text-xs font-medium px-2.5 py-1.5 rounded-lg" style={{ background: `${item.color}10`, color: item.color }}>
                    {item.loading ? (
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                        AI 分析中...
                      </span>
                    ) : (
                      <>→ {item.action}</>
                    )}
                  </div>
                </div>
              ))
            })()}
          </div>
        </div>
      </div>

      {/* Row 4: Detailed Comparison */}
      <div className="card p-6 card-enter" style={{ animationDelay: '0.35s' }}>
        <div className="flex items-center gap-3" style={{ marginBottom: '20px' }}>
          <h3 className="section-title">三平台详细对比</h3>
          <InfoButton metricName="三平台详细对比" metricValue="综合评测" context={{ platforms: coursewareComparison.map(c => ({ name: c.platformLabel, composite: c.composite, scores: c.scores })) }} />
        </div>
        <div className="grid grid-cols-3 gap-5">
          {coursewareComparison.map(c => (
            <div key={c.id} className="rounded-xl p-5" style={{ background: `${platformColor[c.platform]}04`, border: `1px solid ${platformColor[c.platform]}10` }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-3 h-3 rounded-full" style={{ background: platformColor[c.platform], boxShadow: `0 0 10px ${platformColor[c.platform]}40` }} />
                <span className="font-semibold text-base text-slate-200">{c.platformLabel}</span>
                <span className="ml-auto text-lg font-bold stat-value" style={{ color: platformColor[c.platform] }}>{c.composite.toFixed(2)}</span>
              </div>

              <div className="space-y-2.5 mb-4">
                {(['d1', 'd2', 'd3', 'd4'] as const).map(d => (
                  <div key={d} className="flex items-center gap-3 text-sm">
                    <span className="text-slate-500 w-20 flex-shrink-0">{dimLabels[d]}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-slate-800/60 overflow-hidden">
                      <div className="h-full rounded-full" style={{
                        width: `${(c.scores[d] / 5) * 100}%`,
                        background: `linear-gradient(90deg, ${platformColor[c.platform]}80, ${platformColor[c.platform]})`,
                      }} />
                    </div>
                    <span className="text-slate-400 w-5 text-right font-mono">{c.scores[d]}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-2.5 pt-4" style={{ borderTop: `1px solid ${platformColor[c.platform]}10` }}>
                {c.pros.map(p => (
                  <div key={p} className="text-sm text-emerald-400/80 flex items-start gap-2">
                    <span className="flex-shrink-0">✅</span><span>{p}</span>
                  </div>
                ))}
                {c.cons.map(p => (
                  <div key={p} className="text-sm text-rose-400/80 flex items-start gap-2">
                    <span className="flex-shrink-0">⚠️</span><span>{p}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
