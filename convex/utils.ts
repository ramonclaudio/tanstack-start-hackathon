export function unwrap<T>(x: { data?: T } | T): T {
  if (typeof x === 'object' && x !== null && 'data' in (x as any)) {
    return (x as { data?: T }).data as T
  }
  return x as T
}
