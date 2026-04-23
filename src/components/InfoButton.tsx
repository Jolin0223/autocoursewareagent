import { useState } from 'react'
import MetricExplainer from './MetricExplainer'

interface InfoButtonProps {
  metricName: string
  metricValue: any
  context?: any
}

export default function InfoButton({ metricName, metricValue, context }: InfoButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-5 h-5 rounded-full bg-indigo-500/15 flex items-center justify-center text-indigo-400 hover:bg-indigo-500/25 transition-colors flex-shrink-0"
        title={`查看 ${metricName} 指标解读`}
      >
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
      </button>
      {open && (
        <MetricExplainer
          metricName={metricName}
          metricValue={metricValue}
          context={context}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
