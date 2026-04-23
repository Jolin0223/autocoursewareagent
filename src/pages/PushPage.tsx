import { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { fetchPushRecords, calcStats } from '../api/push'
import type { PushRecordRow } from '../api/push'
import { useMockMode } from '../context/MockModeContext'
import { pushRecords as mockPushRecords } from '../data/mockData'

const statusIcon: Record<string, string> = { adopted: '✅', pending: '⏳', rejected: '❌' }
const statusLabel: Record<string, string> = { adopted: '已采纳', pending: '待反馈', rejected: '未采纳' }
const statusColor: Record<string, string> = { adopted: 'text-emerald-400', pending: 'text-amber-400', rejected: 'text-rose-400' }

const PIE_COLORS = ['#6366f1', '#34d399', '#fbbf24', '#f87171']
const BAR_COLORS = ['#3b82f6', '#34d399', '#fbbf24', '#818cf8']

function platformStats(records: PushRecordRow[]) {
  const map: Record<string, { total: number; adopted: number }> = {}
  records.forEach(r => {
    if (!map[r.platform]) map[r.platform] = { total: 0, adopted: 0 }
    map[r.platform].total++
    if (r.status === 'adopted') map[r.platform].adopted++
  })
  return Object.entries(map).map(([name, v]) => ({
    name, value: v.adopted, total: v.total,
    rate: v.total > 0 ? Math.round((v.adopted / v.total) * 100) : 0,
  }))
}

function subjectStats(records: PushRecordRow[]) {
  const map: Record<string, number> = {}
  records.forEach(r => {
    const subject = r.subject || '其他'
    map[subject] = (map[subject] || 0) + 1
  })
  return Object.entries(map).map(([name, value]) => ({ name, value }))
}

export default function PushPage() {
  const { isMock } = useMockMode()
  const [records, setRecords] = useState<PushRecordRow[]>([])
  const [filter, setFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isMock) {
      setRecords(mockPushRecords as PushRecordRow[])
      setLoading(false)
      return
    }
    fetchPushRecords().then(data => {
      setRecords(data)
      setLoading(false)
    }).catch(err => {
      console.error('[PushPage] fetch failed:', err)
      setLoading(false)
    })
  }, [isMock])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        <span className="animate-pulse">加载推送记录中...</span>
      </div>
    )
  }

  const filtered = filter === 'all' ? records : records.filter(r => r.status === filter)
  const stats = calcStats(records)
  const pStats = platformStats(records)
  const sStats = subjectStats(records)

  return (
    <div className="flex flex-col gap-6">
      <h2 className="section-title flex-shrink-0">推送记录</h2>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-5 flex-shrink-0">
        {[
          { label: '总推送', value: stats.total, color: '#6366f1', icon: '/icons/总推送.png' },
          { label: '已采纳', value: stats.adopted, color: '#34d399', icon: '/icons/已采纳.png' },
          { label: '待反馈', value: stats.pending, color: '#fbbf24', icon: '/icons/待反馈.png' },
          { label: '采纳率', value: `${stats.adoptRate}%`, color: '#818cf8', icon: '/icons/采纳率.png' },
        ].map((s, i) => (
          <div key={s.label} className="card p-6 card-enter" style={{ animationDelay: `${i * 0.08}s` }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-500 font-medium">{s.label}</span>
              <img src={s.icon} alt={s.label} className="w-8 h-8 opacity-80" />
            </div>
            <div className="text-4xl font-bold stat-value" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6 flex-shrink-0">
        <div className="card p-7 card-enter" style={{ animationDelay: '0.3s' }}>
          <h3 className="section-title mb-6">平台采纳率</h3>
          <div className="flex items-center">
            <ResponsiveContainer width="50%" height={220}>
              <PieChart>
                <Pie data={pStats} dataKey="value" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} strokeWidth={0}>
                  {pStats.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-3">
              {pStats.map((p, i) => (
                <div key={p.name} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-sm text-slate-400 flex-1">{p.name}</span>
                  <span className="text-sm font-semibold text-slate-300">{p.rate}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card p-7 card-enter" style={{ animationDelay: '0.4s' }}>
          <h3 className="section-title mb-6">学科分布</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={sStats} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 13 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 12, fontSize: 13 }}
                cursor={{ fill: 'rgba(99,102,241,0.04)' }}
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {sStats.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="section-title">推送明细</span>
        <div className="flex gap-2 ml-4">
          {[
            { key: 'all', label: '全部' },
            { key: 'adopted', label: '已采纳' },
            { key: 'pending', label: '待反馈' },
            { key: 'rejected', label: '未采纳' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                filter === f.key ? 'tab-active' : 'tab-inactive'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden flex-shrink-0 card-enter" style={{ animationDelay: '0.5s' }}>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800/40">
              {['时间', '教师', '课件名称', '平台', '评分', '状态', '教师反馈'].map(h => (
                <th key={h} className="text-left px-6 py-4 text-sm font-medium text-slate-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={i} className="border-b border-slate-800/20 transition-colors">
                <td className="px-6 py-4 text-slate-500 text-sm font-mono">{r.time}</td>
                <td className="px-6 py-4 text-slate-300 font-medium">{r.teacher}</td>
                <td className="px-6 py-4 text-slate-300">
                  {r.previewUrl ? (
                    <a
                      href={r.previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 decoration-indigo-400/30 hover:decoration-indigo-300/60 transition-colors cursor-pointer"
                    >
                      {r.title}
                    </a>
                  ) : (
                    <a
                      href={`${window.location.pathname}?preview=${r.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 decoration-indigo-400/30 hover:decoration-indigo-300/60 transition-colors cursor-pointer"
                    >
                      {r.title}
                    </a>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className="badge">{r.platform}</span>
                </td>
                <td className="px-6 py-4">
                  <span className={`font-semibold font-mono ${r.score >= 4.0 ? 'text-emerald-400' : r.score >= 3.5 ? 'text-blue-400' : 'text-amber-400'}`}>
                    {r.score.toFixed(2)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`text-sm font-medium ${statusColor[r.status]}`}>
                    {statusIcon[r.status]} {statusLabel[r.status]}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600 max-w-[220px] truncate">{r.feedback || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
