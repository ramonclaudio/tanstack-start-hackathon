import { ScriptOnce } from '@tanstack/react-router'
import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { ResolvedTheme, ThemeMode } from '@/lib/theme'
import {
  getNextTheme,
  getStoredThemeMode,
  getSystemTheme,
  setStoredThemeMode,
  setupPreferredListener,
  themeDetectorScript,
  updateThemeClass,
} from '@/lib/theme'

type ThemeProviderProps = {
  children: ReactNode
}

type ThemeContextValue = {
  themeMode: ThemeMode
  resolvedTheme: ResolvedTheme
  setTheme: (theme: ThemeMode) => void
  toggleMode: () => void
  mounted: boolean
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [themeMode, setThemeMode] = useState<ThemeMode>('auto')
  const [mounted, setMounted] = useState(false)

  // Initialize theme on mount
  useEffect(() => {
    const storedTheme = getStoredThemeMode()
    setThemeMode(storedTheme)
    updateThemeClass(storedTheme)
    setMounted(true)
  }, [])

  // Setup system preference listener when in auto mode
  useEffect(() => {
    if (!mounted || themeMode !== 'auto') return
    return setupPreferredListener()
  }, [themeMode, mounted])

  const resolvedTheme = themeMode === 'auto' ? getSystemTheme() : themeMode

  const setTheme = (newTheme: ThemeMode) => {
    setThemeMode(newTheme)
    setStoredThemeMode(newTheme)
    updateThemeClass(newTheme)
  }

  const toggleMode = () => {
    setTheme(getNextTheme(themeMode))
  }

  return (
    <ThemeContext.Provider
      value={{ themeMode, resolvedTheme, setTheme, toggleMode, mounted }}
    >
      <ScriptOnce children={themeDetectorScript} />
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }

  return context
}
