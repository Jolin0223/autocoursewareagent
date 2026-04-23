import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { explainMetric } from '../api/llm'

interface MetricExplainerProps {
  metricName: string
  metricValue: any
  context?: any
  onClose: () => void
}

export default function MetricExplainer({ metricName, metricValue, context, onClose }: MetricExplainerProps) {
  const [quantitative, setQuantitative] = useState('')
  const [qualitative, setQualitative] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    explainMetric(metricName, metricValue, context || {}).then(result => {
      setQuantitative(result.quantitative)
      setQualitative(result.qualitative)
      setLoading(false)
    })
  }, [metricName, metricValue, context])

  const renderMarkdown = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g)
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-bold text-white">{part.slice(2, -2)}</strong>
      }
      return <span key={i}>{part}</span>
    })
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-slate-900 rounded-2xl p-8 max-w-2xl w-full mx-4 shadow-2xl border border-slate-700" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between" style={{ marginBottom: '20px' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center">
              <span className="text-xl">📊</span>
            </div>
            <h3 className="text-xl font-bold text-white">{metricName}</h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="rounded-xl p-5 bg-slate-800/50 border border-slate-700/50" style={{ marginBottom: '20px' }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-semibold text-indigo-400">📐 定量计算规则</span>
          </div>
          {loading ? (
            <div className="flex items-center gap-2 text-slate-500">
              <div className="w-4 h-4 border-2 border-slate-600 border-t-indigo-400 rounded-full animate-spin"></div>
              <span className="text-sm">加载中...</span>
            </div>
          ) : (
            <p className="text-sm text-slate-300 leading-relaxed">{quantitative}</p>
          )}
        </div>

        <div className="rounded-xl p-5 bg-slate-800/50 border border-slate-700/50" style={{ marginBottom: '20px' }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-semibold text-emerald-400">🤖 大模型智能定性解读</span>
          </div>
          {loading ? (
            <div className="flex items-center gap-2 text-slate-500">
              <div className="w-4 h-4 border-2 border-slate-600 border-t-indigo-400 rounded-full animate-spin"></div>
              <span className="text-sm">大模型正在结合真实数据与业务底线生成诊断...</span>
            </div>
          ) : (
            <p className="text-sm text-slate-300 leading-relaxed">{renderMarkdown(qualitative)}</p>
          )}
        </div>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
          >
            我了解了
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
