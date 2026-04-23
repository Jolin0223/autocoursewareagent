export default function SettingsPage() {
  const agents = [
    { name: 'Agent① 需求感知引擎', model: 'xdf-co-4.6', status: true, desc: '竞品数据抓取 + 教师需求匹配' },
    { name: 'Agent② 课件生产车间', model: 'gemini-3.0-flash', status: true, desc: '课件HTML生成 + 美术资产生成' },
    { name: 'Agent③ AI评审团', model: 'xdf-co-4.6', status: true, desc: '4人差异化评审 + 防偏见均分' },
    { name: 'Agent④ 课件推送中心', model: 'xdf-co-4.6', status: true, desc: '飞书卡片推送 + 教师反馈收集' },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Agent Config */}
      <div className="card p-8 flex-shrink-0 card-enter">
        <h3 className="section-title mb-6">Agent 配置</h3>
        <div className="space-y-4">
          {agents.map((a, i) => (
            <div
              key={a.name}
              className="flex items-center justify-between p-5 rounded-2xl bg-slate-900/30 border border-slate-800/40 hover:border-slate-700/50 transition-all duration-300 card-enter"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <div className="flex items-center gap-4">
                <div className={`status-dot ${a.status ? 'bg-emerald-400' : 'bg-gray-600'}`} />
                <div>
                  <div className="text-base font-semibold text-slate-200">{a.name}</div>
                  <div className="text-sm text-slate-500 mt-1">{a.desc}</div>
                </div>
              </div>
              <div className="flex items-center gap-5">
                <span className="text-sm px-4 py-1.5 rounded-xl bg-slate-800/60 text-slate-400 border border-slate-700/30 font-mono">{a.model}</span>
                <div className={`w-12 h-6 rounded-full relative cursor-pointer transition-all ${a.status ? 'bg-emerald-500/25' : 'bg-slate-700'}`}>
                  <div className={`absolute top-1 w-4 h-4 rounded-full transition-all shadow-lg ${a.status ? 'right-1 bg-emerald-400 shadow-emerald-400/30' : 'left-1 bg-slate-500'}`} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Review Threshold */}
      <div className="card p-8 flex-shrink-0 card-enter" style={{ animationDelay: '0.1s' }}>
        <h3 className="section-title mb-6">评审阈值</h3>
        <div className="grid grid-cols-2 gap-5 mb-6">
          <div className="p-6 rounded-2xl bg-amber-500/5 border border-amber-500/10 hover:border-amber-500/20 transition-colors">
            <div className="text-sm text-slate-500 mb-3">上架线</div>
            <div className="text-4xl font-bold stat-value text-amber-400">3.50</div>
            <div className="text-sm text-slate-600 mt-3">综合分 ≥ 3.50 可上架</div>
          </div>
          <div className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 hover:border-emerald-500/20 transition-colors">
            <div className="text-sm text-slate-500 mb-3">优先推送线</div>
            <div className="text-4xl font-bold stat-value text-emerald-400">4.00</div>
            <div className="text-sm text-slate-600 mt-3">综合分 ≥ 4.00 优先推送</div>
          </div>
        </div>
        <div className="p-6 rounded-2xl bg-slate-900/30 border border-slate-800/40">
          <div className="text-sm text-slate-500 mb-4">权重配置</div>
          <div className="grid grid-cols-4 gap-4">
            {[
              { dim: 'd1 知识准确', weight: '25%', color: '#6366f1' },
              { dim: 'd2 教学适配', weight: '35%', color: '#818cf8' },
              { dim: 'd3 系统健壮', weight: '20%', color: '#34d399' },
              { dim: 'd4 视觉美观', weight: '20%', color: '#fbbf24' },
            ].map(w => (
              <div
                key={w.dim}
                className="text-center p-4 rounded-xl transition-all duration-300 hover:scale-105"
                style={{ background: `${w.color}06`, border: `1px solid ${w.color}10` }}
              >
                <div className="text-2xl font-bold stat-value" style={{ color: w.color }}>{w.weight}</div>
                <div className="text-xs text-slate-500 mt-2">{w.dim}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Push Rules */}
      <div className="card p-8 flex-shrink-0 card-enter" style={{ animationDelay: '0.2s' }}>
        <h3 className="section-title mb-6">推送规则</h3>
        <div className="grid grid-cols-3 gap-5">
          <div className="p-6 rounded-2xl bg-slate-900/30 border border-slate-800/40 text-center hover:border-indigo-500/15 transition-colors">
            <div className="text-sm text-slate-500 mb-3">每日推送上限</div>
            <div className="text-4xl font-bold stat-value text-indigo-400">10</div>
            <div className="text-sm text-slate-600 mt-3">条/教师/天</div>
          </div>
          <div className="p-6 rounded-2xl bg-slate-900/30 border border-slate-800/40 text-center hover:border-indigo-500/15 transition-colors">
            <div className="text-sm text-slate-500 mb-3">推送时间窗口</div>
            <div className="text-2xl font-bold stat-value text-indigo-400">8:00-20:00</div>
            <div className="text-sm text-slate-600 mt-3">避免打扰休息</div>
          </div>
          <div className="p-6 rounded-2xl bg-slate-900/30 border border-slate-800/40 text-center hover:border-indigo-500/15 transition-colors">
            <div className="text-sm text-slate-500 mb-3">最大迭代轮次</div>
            <div className="text-4xl font-bold stat-value text-indigo-400">3</div>
            <div className="text-sm text-slate-600 mt-3">超限选最高分</div>
          </div>
        </div>
      </div>

      {/* Data Sources */}
      <div className="card p-8 flex-shrink-0 card-enter" style={{ animationDelay: '0.3s' }}>
        <h3 className="section-title mb-6">数据源状态</h3>
        <div className="space-y-3">
          {[
            { name: 'Supabase', status: '已连接', latency: '23ms', ok: true },
            { name: '飞书API', status: '已连接', latency: '45ms', ok: true },
            { name: '门神平台(xdf-co-4.6)', status: '已连接', latency: '120ms', ok: true },
            { name: '飞象老师爬虫', status: '已连接', latency: '350ms', ok: true },
            { name: '老师帮爬虫', status: '已连接', latency: '280ms', ok: true },
          ].map(s => (
            <div key={s.name} className="flex items-center justify-between p-4 rounded-xl bg-slate-900/20 border border-slate-800/30 hover:border-slate-700/40 transition-colors">
              <div className="flex items-center gap-4">
                <div className={`status-dot ${s.ok ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                <span className="text-base text-slate-300 font-medium">{s.name}</span>
              </div>
              <div className="flex items-center gap-5 text-sm">
                <span className="text-slate-500 font-mono">{s.latency}</span>
                <span className={`font-medium ${s.ok ? 'text-emerald-400' : 'text-rose-400'}`}>{s.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
