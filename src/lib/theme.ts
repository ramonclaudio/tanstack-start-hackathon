import { createClientOnlyFn, createIsomorphicFn } from '@tanstack/react-start'

export type ThemeMode = 'light' | 'dark' | 'auto'
export type ResolvedTheme = 'light' | 'dark'

const THEME_KEY = 'theme'
const DARK_QUERY = '(prefers-color-scheme: dark)'

const isThemeMode = (v: unknown): v is ThemeMode =>
  v === 'light' || v === 'dark' || v === 'auto'

export const getStoredThemeMode = createIsomorphicFn()
  .server((): ThemeMode => 'auto')
  .client((): ThemeMode => {
    try {
      const storedTheme = localStorage.getItem(THEME_KEY)
      return isThemeMode(storedTheme) ? storedTheme : 'auto'
    } catch {
      return 'auto'
    }
  })

export const setStoredThemeMode = createClientOnlyFn((theme: ThemeMode) => {
  try {
    if (isThemeMode(theme)) localStorage.setItem(THEME_KEY, theme)
  } catch {}
})

export const getSystemTheme = createIsomorphicFn()
  .server((): ResolvedTheme => 'light')
  .client((): ResolvedTheme => {
    try {
      return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light'
    } catch {
      return 'light'
    }
  })

export const updateThemeClass = createClientOnlyFn((themeMode: ThemeMode) => {
  const root = document.documentElement
  const systemTheme = window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light'
  const resolved: ResolvedTheme = themeMode === 'auto' ? systemTheme : themeMode
  const other: ResolvedTheme = resolved === 'dark' ? 'light' : 'dark'

  const hasResolved = root.classList.contains(resolved)
  const hasOther = root.classList.contains(other)
  const wantAuto = themeMode === 'auto'
  const hasAuto = root.classList.contains('auto')

  if (!hasResolved) root.classList.add(resolved)
  if (hasOther) root.classList.remove(other)
  if (wantAuto !== hasAuto) root.classList.toggle('auto', wantAuto)
})

export const setupPreferredListener = createClientOnlyFn(() => {
  const m = window.matchMedia(DARK_QUERY)
  const handler = () => updateThemeClass('auto')
  m.addEventListener('change', handler)
  return () => m.removeEventListener('change', handler)
})

export const getNextTheme = createClientOnlyFn(
  (current: ThemeMode): ThemeMode => {
    const systemTheme = window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light'
    const order: Array<ThemeMode> =
      systemTheme === 'dark'
        ? ['auto', 'light', 'dark']
        : ['auto', 'dark', 'light']
    return order[(order.indexOf(current) + 1) % order.length]
  },
)

export const themeDetectorScript = (function () {
  function themeFn() {
    let t = 'auto'
    try {
      const s = localStorage.getItem('theme')
      if (s === 'light' || s === 'dark' || s === 'auto') t = s
    } catch {}
    let dark = false
    try {
      dark =
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches
    } catch {}
    const resolved = t === 'auto' ? (dark ? 'dark' : 'light') : t
    const c = document.documentElement.classList
    c.add(resolved)
    if (t === 'auto') c.add('auto')
  }
  return `(${themeFn.toString()})();`
})()
