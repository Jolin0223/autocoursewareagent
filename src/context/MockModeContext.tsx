import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

interface MockModeContextType {
  isMock: boolean
  toggle: () => void
}

const MockModeContext = createContext<MockModeContextType>({ isMock: false, toggle: () => {} })

export function MockModeProvider({ children }: { children: ReactNode }) {
  const [isMock, setIsMock] = useState(false)

  const toggle = useCallback(() => {
    setIsMock(prev => {
      const next = !prev
      console.log(`[MockMode] ${next ? '🧪 MOCK 数据模式' : '🔴 生产环境模式'}`)
      return next
    })
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return
      if (e.key === 't' || e.key === 'T') {
        e.preventDefault()
        setIsMock(true)
        console.log('[MockMode] 🧪 MOCK 数据模式')
      } else if (e.key === 'o' || e.key === 'O') {
        e.preventDefault()
        setIsMock(false)
        console.log('[MockMode] 🔴 生产环境模式')
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <MockModeContext.Provider value={{ isMock, toggle }}>
      {children}
    </MockModeContext.Provider>
  )
}

export function useMockMode() {
  return useContext(MockModeContext)
}
