import { useState, useMemo, useRef, useEffect } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, ComposedChart, Area,
} from 'recharts'
import {
  fetchJingpingData, buildK6Structure, buildK6Consumption,
  buildCompetitorTable, buildTrendData,
} from '../api/competitor'
import { useMockMode } from '../context/MockModeContext'
import {
  competitorData as mockCompetitorData,
  feixiangK6Structure as mockK6Structure,
  feixiangK6Consumption as mockK6Consumption,
  trendData as mockTrendData,
} from '../data/mockData'
import InfoButton from '../components/InfoButton'

const platformColors: Record<string, string> = {
  '飞象老师': '#3b82f6',
  '老师帮': '#34d399',
  '希沃白板': '#fbbf24',
  'ClassIn': '#818cf8',
}

const timeRanges = ['近7天', '近14天', '近30天', '近90天']
const platforms = ['全部平台', '飞象老师', '老师帮']
const subjects = ['全部学科', '数学', '英语', '语文']
const grades = ['全部年级', '幼儿园', '一年级', '二年级', '三年级', '四年级', '五年级', '六年级']

const tooltipStyle = {
  background: '#0f172a',
  border: '1px solid rgba(99,102,241,0.15)',
  borderRadius: 12,
  fontSize: 13,
}

export default function CompetitorPage() {
  const { isMock } = useMockMode()
  const [timeRange, setTimeRange] = useState('近7天')
  const [platform, setPlatform] = useState('全部平台')
  const [subject, setSubject] = useState('全部学科')
  const [grade, setGrade] = useState('全部年级')
  const [rawData, setRawData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isMock) {
      setRawData([])
      setLoading(false)
      return
    }
    fetchJingpingData().then(data => {
      setRawData(data)
      setLoading(false)
    })
  }, [isMock])

  const feixiangK6Structure = useMemo(() => isMock ? mockK6Structure : buildK6Structure(rawData, '飞象老师'), [rawData, isMock])
  const feixiangK6Consumption = useMemo(() => isMock ? mockK6Consumption : buildK6Consumption(rawData, '飞象老师'), [rawData, isMock])
  const trendChartData = useMemo(() => isMock ? mockTrendData.map(d => ({ date: d.date, '飞象老师': d.feixiang, '老师帮': d.laoshibang })) : buildTrendData(rawData), [rawData, isMock])

  const filtered = useMemo(() => {
    if (isMock) return mockCompetitorData
    return buildCompetitorTable(rawData, {
      platform: platform === '全部平台' ? undefined : platform,
      subject: subject === '全部学科' ? undefined : subject,
      grade: grade === '全部年级' ? undefined : grade,
    })
  }, [rawData, platform, subject, grade, isMock])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        <span className="animate-pulse">加载竞品数据中...</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 全局筛选栏 */}
      <div className="card p-5 px-7 flex-shrink-0 card-enter" style={{ overflow: 'visible', zIndex: 20 }}>
        <div className="flex items-center gap-8">
          <FilterSelect label="时间" options={timeRanges} value={timeRange} onChange={setTimeRange} />
          <FilterSelect label="平台" options={platforms} value={platform} onChange={setPlatform} />
          <FilterSelect label="学科" options={subjects} value={subject} onChange={setSubject} />
          <FilterSelect label="年级" options={grades} value={grade} onChange={setGrade} />
        </div>
      </div>

      {/* 趋势图 */}
      <div className="grid grid-cols-2 gap-6 flex-shrink-0">
        <div className="card p-7 card-enter" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center gap-3 mb-6">
            <h3 className="section-title">各平台课件数量趋势</h3>
            <InfoButton metricName="各平台课件数量趋势" metricValue="趋势图" context={{ dataPoints: trendChartData.length, platforms: ['飞象老师', '老师帮'] }} />
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trendChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 13 }} />
              <Line type="monotone" dataKey="飞象老师" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="老师帮" stroke="#34d399" strokeWidth={2.5} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-7 card-enter" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center gap-3 mb-6">
            <h3 className="section-title">质量评分趋势</h3>
            <InfoButton metricName="质量评分趋势" metricValue="趋势图" context={{ dataPoints: trendChartData.length, platforms: ['飞象老师', '老师帮'] }} />
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trendChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis domain={[2.5, 4.5]} tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 13 }} />
              <Line type="monotone" dataKey="飞象老师" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="老师帮" stroke="#34d399" strokeWidth={2.5} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 飞象K6年级与学科结构剖析图 */}
      <div className="card p-7 flex-shrink-0 card-enter" style={{ animationDelay: '0.15s' }}>
        <div className="flex items-center gap-3 mb-6">
          <h3 className="section-title">飞象K6年级与学科生产分布图</h3>
          <span className="text-xs text-slate-600">幼儿园 + 小学 · 语数外</span>
          <InfoButton metricName="飞象K6年级与学科生产分布图" metricValue="堆叠柱状图" context={{ grades: feixiangK6Structure.map((d: any) => d.grade), subjects: ['语文', '数学', '英语'] }} />
        </div>
        <ResponsiveContainer width="100%" height={340}>
          <BarChart data={feixiangK6Structure} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="grade" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} cursor={false} formatter={(value: any) => Number(value).toLocaleString()} />
            <Legend wrapperStyle={{ fontSize: 13 }} />
            <Bar dataKey="语文" name="语文" stackId="a" fill="#6366f1" radius={[0, 0, 0, 0]} />
            <Bar dataKey="数学" name="数学" stackId="a" fill="#34d399" radius={[0, 0, 0, 0]} />
            <Bar dataKey="英语" name="英语" stackId="a" fill="#fbbf24" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 飞象K6各年级内容消费分布 */}
      <div className="card p-7 flex-shrink-0 card-enter" style={{ animationDelay: '0.2s' }}>
        <div className="flex items-center gap-3 mb-6">
          <h3 className="section-title">飞象K6各年级内容消费分布</h3>
          <span className="text-xs text-slate-600">浏览 · 收藏 · 转化率</span>
          <InfoButton metricName="飞象K6各年级内容消费分布" metricValue="消费分布图" context={{ grades: feixiangK6Consumption.map((d: any) => d.grade) }} />
        </div>
        <ResponsiveContainer width="100%" height={340}>
          <ComposedChart data={feixiangK6Consumption} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="grade" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="left" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="right" orientation="right" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} unit="%" domain={[0, 20]} />
            <Tooltip contentStyle={tooltipStyle} cursor={false} formatter={(value: any, name: any) =>
              name === '转化率' ? `${value}%` : Number(value).toLocaleString()
            } />
            <Legend wrapperStyle={{ fontSize: 13 }} />
            <Bar yAxisId="left" dataKey="views" name="浏览量" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={28} />
            <Bar yAxisId="left" dataKey="stars" name="收藏数" fill="#a78bfa" radius={[4, 4, 0, 0]} barSize={28} />
            <Area yAxisId="right" type="monotone" dataKey="conversionRate" name="转化率" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.08} strokeWidth={2.5} dot={{ r: 4, fill: '#f59e0b' }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* 竞品表格 */}
      <div className="card overflow-hidden flex-shrink-0 card-enter" style={{ animationDelay: '0.3s' }}>
        <div className="flex items-center gap-3 px-6 pt-5 pb-3">
          <h3 className="section-title">Top 50 竞品课件排行</h3>
          <InfoButton metricName="Top 50 竞品课件排行" metricValue={`${filtered.length} 条`} context={{ filters: { platform, subject, grade }, totalRows: filtered.length }} />
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800/40">
              {['排名', '课件名称', '平台', '年级', '学科', '作者', '收藏数', '浏览量', '收藏率'].map(h => (
                <th key={h} className="text-left px-6 py-4 text-sm font-semibold text-slate-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(item => (
              <tr key={item.rank} className="border-b border-slate-800/20 transition-colors hover:bg-slate-800/20">
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold ${
                    item.rank <= 3 ? 'bg-indigo-500/15 text-indigo-400' : 'text-slate-500'
                  }`}>
                    {item.rank}
                  </span>
                </td>
                <td className="px-6 py-4 font-medium text-slate-200">{item.title}</td>
                <td className="px-6 py-4">
                  <span className="badge" style={{
                    background: `${platformColors[item.platform] || '#6366f1'}10`,
                    color: platformColors[item.platform] || '#a5b4fc',
                    borderColor: `${platformColors[item.platform] || '#6366f1'}15`,
                  }}>{item.platform}</span>
                </td>
                <td className="px-6 py-4 text-slate-500 text-sm">{item.grade}</td>
                <td className="px-6 py-4 text-slate-500 text-sm">{item.subject}</td>
                <td className="px-6 py-4 text-slate-500 text-sm">{item.author}</td>
                <td className="px-6 py-4">
                  <span className="text-amber-400 font-medium">{item.stars.toLocaleString()}</span>
                </td>
                <td className="px-6 py-4 text-slate-400 font-mono text-sm">{item.views.toLocaleString()}</td>
                <td className="px-6 py-4 text-indigo-400 font-semibold text-sm">{item.favRate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Agent 日志 */}
      <div className="card p-8 flex-shrink-0 card-enter" style={{ animationDelay: '0.4s' }}>
        <h3 className="section-title mb-6">Agent① 感知引擎工作日志</h3>
        <div className="space-y-2">
          {[
            { time: '23:00', msg: '扫描飞象老师，发现12个新课件，3个匹配教师需求' },
            { time: '22:00', msg: '扫描老师帮，发现8个新课件，1个匹配教师需求' },
            { time: '21:00', msg: '分析热点趋势：本周"分数"相关课件热度上升35%' },
            { time: '20:00', msg: '扫描希沃白板，发现5个新课件，0个匹配' },
            { time: '19:00', msg: '更新竞品能力矩阵，飞象新增语音输入功能' },
            { time: '18:00', msg: '扫描飞象老师，发现9个新课件，2个匹配教师需求' },
          ].map((log, i) => (
            <div key={i} className="flex items-start gap-4 py-3 border-b border-slate-800/20 last:border-0 hover:bg-slate-800/15 -mx-4 px-4 rounded-lg transition-colors">
              <span className="text-slate-600 font-mono flex-shrink-0 text-sm">{log.time}</span>
              <span className="badge flex-shrink-0">Agent①</span>
              <span className="text-slate-400 text-sm">{log.msg}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function FilterSelect({ label, options, value, onChange }: {
  label: string
  options: string[]
  value: string
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="flex items-center gap-2.5" ref={ref}>
      <span className="text-sm text-slate-500 font-medium whitespace-nowrap">{label}</span>
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border ${
            open
              ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
              : 'bg-slate-800/50 text-slate-300 border-slate-700/40 hover:border-slate-600/60 hover:bg-slate-800/70'
          }`}
        >
          {value}
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className={`transition-transform duration-200 opacity-50 ${open ? 'rotate-180' : ''}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        {open && (
          <div className="absolute top-full left-0 mt-1.5 min-w-full py-1.5 rounded-xl border border-slate-700/50 bg-slate-900/95 backdrop-blur-xl shadow-xl shadow-black/30 z-50 overflow-hidden">
            {options.map(opt => (
              <button
                key={opt}
                onClick={() => { onChange(opt); setOpen(false) }}
                className={`w-full text-left px-4 py-2 text-sm transition-colors duration-150 ${
                  value === opt
                    ? 'text-indigo-300 bg-indigo-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
