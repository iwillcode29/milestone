export function formatDistance(digits: string): string {
  if (digits.length === 0) return ''
  const frac = digits.slice(-2).padStart(2, '0')
  const intPart = digits.length > 2 ? digits.slice(0, -2) : '0'
  return `${intPart}.${frac}`
}

export function toDistanceKm(digits: string): number | undefined {
  if (digits.length === 0) return undefined
  return Number(formatDistance(digits))
}
