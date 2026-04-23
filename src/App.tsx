import { useState, useEffect, useCallback } from 'react'
import './index.css'
import { MockModeProvider } from './context/MockModeContext'
import DashboardV1 from './pages/DashboardV1'
import DashboardV2 from './pages/DashboardV2'
import TeacherPage from './pages/TeacherPage'
import CoursewarePage from './pages/CoursewarePage'
import PushPage from './pages/PushPage'
import CompetitorPage from './pages/CompetitorPage'
import SettingsPage from './pages/SettingsPage'
import CoursewarePreviewPage from './pages/CoursewarePreviewPage'

const tabs = [
  { id: 'dashboard', label: '控制面板' },
  { id: 'teacher', label: '教师画像' },
  { id: 'courseware', label: '课件对比' },
  { id: 'push', label: '推送记录' },
  { id: 'competitor', label: '竞品监控' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [focusAgent, setFocusAgent] = useState<number | null>(null)
  const [dashVersion, setDashVersion] = useState<1 | 2>(2)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.target as HTMLElement).tagName === 'INPUT') return

    // 数字键 1/2 切换 Dashboard 版本（仅在控制面板页面生效，且不在聚焦模式下）
    if (activeTab === 'dashboard' && !focusAgent) {
      if (e.key === '1') { setDashVersion(1); return }
      if (e.key === '2') { setDashVersion(2); return }
    }

    if (activeTab !== 'dashboard') return
    if (e.key >= '3' && e.key <= '6') {
      setFocusAgent(parseInt(e.key) - 2)
    } else if (e.key === '0' || e.key === 'Escape') {
      setFocusAgent(null)
    } else if (e.key === 'f' || e.key === 'F') {
      setFocusAgent(prev => prev ? null : 1)
    }
  }, [activeTab, focusAgent])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // 检测 ?preview= 参数，独立页面展示课件预览
  const previewId = new URLSearchParams(window.location.search).get('preview')
  if (previewId) {
    return (
      <MockModeProvider>
        <CoursewarePreviewPage coursewareId={previewId} />
      </MockModeProvider>
    )
  }

  return (
    <MockModeProvider>
    <div className="min-h-screen flex flex-col bg-grid" style={{ padding: '20px 34px 20px' }}>
      {/* Header */}
      <header className="flex items-center justify-between h-16 flex-shrink-0 z-50" style={{ padding: '0', marginBottom: '20px' }}>
        <div className="flex items-center gap-5">
          <img
            src="/logo.png"
            alt="Logo"
            className="w-11 h-11 rounded-2xl shadow-lg shadow-indigo-500/25"
          />
          <div>
            <h1 className="text-xl font-semibold gradient-text leading-tight tracking-tight" style={{ lineHeight: '28px' }}>
              全自动互动课件 AI Agent
            </h1>
            <div className="text-xs text-slate-500 tracking-widest mt-1" style={{ lineHeight: '18px' }}>感知 · 生产 · 评测 · 推送</div>
          </div>
        </div>

        <nav className="flex items-center gap-3">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setFocusAgent(null) }}
              className={`relative px-5 py-2.5 text-base font-medium transition-all duration-300 rounded-full ${
                activeTab === tab.id
                  ? 'text-white nav-btn-active'
                  : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <div className="status-dot bg-emerald-400" />
            <span className="text-sm text-slate-400">系统正常</span>
          </div>
          <button
            onClick={() => { setActiveTab('settings'); setFocusAgent(null) }}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
              activeTab === 'settings'
                ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-400/30'
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/40 border border-transparent'
            }`}
            title="系统设置"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="pb-8">
        {activeTab === 'dashboard' && (
          dashVersion === 1 ? (
            <DashboardV1 focusAgent={focusAgent} />
          ) : (
            <DashboardV2 focusAgent={focusAgent} />
          )
        )}
        {activeTab === 'teacher' && <TeacherPage />}
        {activeTab === 'courseware' && <CoursewarePage />}
        {activeTab === 'push' && <PushPage />}
        {activeTab === 'competitor' && <CompetitorPage />}
        {activeTab === 'settings' && <SettingsPage />}

        <footer className="mt-8 pt-4 flex items-center justify-between text-xs text-slate-700 border-t border-slate-800/20">
          <span>全自动互动课件 AI Agent v1.0 · 2026 信管&互联网AI智能体大赛</span>
          <span>三人一虾夺天下 · OpenClaw · 门神平台</span>
        </footer>
      </main>
    </div>
    </MockModeProvider>
  )
}
