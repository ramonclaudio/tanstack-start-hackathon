import React from 'react'

type GlobalLoadingState = {
  pageLoading: boolean
  setPageLoading: (val: boolean) => void
}

const GlobalLoadingContext = React.createContext<GlobalLoadingState | null>(
  null,
)

export function GlobalLoadingProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [pageLoading, setPageLoading] = React.useState(false)
  const value = React.useMemo(
    () => ({ pageLoading, setPageLoading }),
    [pageLoading],
  )
  return (
    <GlobalLoadingContext.Provider value={value}>
      {children}
    </GlobalLoadingContext.Provider>
  )
}

export function useGlobalLoading() {
  const ctx = React.useContext(GlobalLoadingContext)
  if (!ctx) throw new Error('useGlobalLoading must be used within provider')
  return ctx
}
