import { useState, useEffect } from 'react'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts'
import { fetchTeachers, fetchTeacherHistory } from '../api/teachers'
import { useMockMode } from '../context/MockModeContext'
import { teachers as mockTeachers } from '../data/mockData'
import type { Teacher } from '../data/mockData'

const statusIcon = { adopted: '✅', pending: '⏳', rejected: '❌' }
const statusColor = { adopted: 'text-emerald-400', pending: 'text-amber-400', rejected: 'text-rose-400' }

export default function TeacherPage() {
  const { isMock } = useMockMode()
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [selected, setSelected] = useState<string>('')
  const [history, setHistory] = useState<{ date: string; title: string; status: 'adopted' | 'pending' | 'rejected'; feedback?: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isMock) {
      setTeachers(mockTeachers)
      if (mockTeachers.length > 0) setSelected(mockTeachers[0].id)
      setLoading(false)
      return
    }
    fetchTeachers().then(list => {
      setTeachers(list)
      if (list.length > 0) setSelected(list[0].id)
      setLoading(false)
    })
  }, [isMock])

  useEffect(() => {
    if (!selected) return
    if (isMock) {
      const t = mockTeachers.find(t => t.id === selected)
      setHistory(t?.history || [])
      return
    }
    fetchTeacherHistory(selected).then(setHistory)
  }, [selected, isMock])

  const teacher = teachers.find(t => t.id === selected)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        <span className="animate-pulse">加载教师数据中...</span>
      </div>
    )
  }

  if (!teacher) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        暂无教师数据
      </div>
    )
  }

  return (
    <div className="flex gap-6">
      {/* Left: Teacher List */}
      <div className="w-96 flex-shrink-0 flex flex-col gap-4 pr-2">
        <h2 className="section-title mb-2">教师画像 ({teachers.length}位)</h2>
        {teachers.map((t, i) => (
          <div
            key={t.id}
            onClick={() => setSelected(t.id)}
            className={`card p-5 cursor-pointer card-enter ${
              selected === t.id ? '!border-indigo-500/30 !bg-indigo-500/8 shadow-lg shadow-indigo-500/10' : ''
            }`}
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <div className="flex items-center gap-4" style={{ marginBottom: '16px' }}>
              {t.avatar.startsWith('http') ? (
                <img src={t.avatar} alt={t.name} className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <span className="text-3xl">{t.avatar}</span>
              )}
              <div className="flex-1">
                <div className="font-semibold text-base mb-1">{t.name}</div>
                <div className="text-sm text-slate-500">{t.subject} · {t.grade}</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2" style={{ marginBottom: '16px' }}>
              {t.tags.slice(0, 3).map(tag => (
                <span key={tag} className="badge text-xs">{tag}</span>
              ))}
            </div>
            <div className="flex items-center justify-between text-sm" style={{ paddingTop: '4px' }}>
              <span className="text-slate-500">已推送 {t.pushCount} 个</span>
              <span className="text-indigo-400 font-semibold">{t.adoptRate}%</span>
            </div>
          </div>
        ))}
      </div>

      {/* Right: Detail Panel */}
      <div className="flex-1 flex flex-col gap-6">
        {/* Basic Info */}
        <div className="card p-8 card-enter">
          <div className="flex items-center gap-5 mb-6">
            {teacher.avatar.startsWith('http') ? (
              <img src={teacher.avatar} alt={teacher.name} className="w-14 h-14 rounded-full object-cover" />
            ) : (
              <span className="text-5xl">{teacher.avatar}</span>
            )}
            <div className="flex-1">
              <h3 className="text-2xl font-bold mb-2">{teacher.name}</h3>
              <div className="text-base text-slate-400">{teacher.subject} · {teacher.grade}</div>
            </div>
            <div className="text-right">
              <div className="text-5xl font-bold stat-value text-indigo-400">{teacher.adoptRate}%</div>
              <div className="text-sm text-slate-500 mt-2">采纳率</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {teacher.tags.map(tag => (
              <span key={tag} className="badge">{tag}</span>
            ))}
          </div>
        </div>

        {/* Radar Chart */}
        <div className="card p-8 card-enter" style={{ animationDelay: '0.1s' }}>
          <h4 className="section-title mb-6">教学偏好雷达图</h4>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={teacher.radar}>
              <PolarGrid stroke="#1e293b" strokeWidth={1.5} />
              <PolarAngleAxis dataKey="dim" tick={{ fill: '#94a3b8', fontSize: 13 }} />
              <PolarRadiusAxis domain={[0, 5]} tick={{ fill: '#475569', fontSize: 11 }} />
              <Radar
                dataKey="value"
                stroke="#818cf8"
                fill="#6366f1"
                fillOpacity={0.25}
                strokeWidth={2.5}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Push History */}
        <div className="card p-8 card-enter" style={{ animationDelay: '0.2s' }}>
          <h4 className="section-title mb-6">推送历史</h4>
          <div className="space-y-3">
            {history.map((h, i) => (
              <div
                key={i}
                className="flex items-center gap-4 py-3 border-b border-slate-800/30 last:border-0 hover:bg-slate-800/20 -mx-4 px-4 rounded-lg transition-colors"
              >
                <span className="text-slate-600 w-12 flex-shrink-0 font-mono text-sm">{h.date}</span>
                <span className="text-lg">{statusIcon[h.status]}</span>
                <span className="flex-1 text-slate-300 font-medium">{h.title}</span>
                <span className={`text-sm font-medium ${statusColor[h.status]}`}>
                  {h.status === 'adopted' ? '已采纳' : h.status === 'pending' ? '待反馈' : '未采纳'}
                </span>
                {h.feedback && (
                  <span className="text-sm text-slate-600 max-w-xs truncate">"{h.feedback}"</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
