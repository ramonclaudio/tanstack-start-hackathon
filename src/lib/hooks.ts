export function usePageLoading(isLoading: boolean | Array<boolean>) {
  return Array.isArray(isLoading) ? isLoading.some(Boolean) : isLoading
}
