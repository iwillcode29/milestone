export function formatSeconds(totalSec: number): string {
  const mins = Math.floor(totalSec / 60)
  const secs = totalSec % 60
  return `${mins}:${String(secs).padStart(2, '0')}`
}

export function formatSignedSeconds(delta: number): string {
  const sign = delta < 0 ? '−' : '+'
  return `${sign}${Math.abs(delta)} วิ`
}

export function parseMmSs(input: string): number {
  const match = input.trim().match(/^(\d{1,3}):([0-5]?\d)$/)
  if (!match) return NaN
  return Number(match[1]) * 60 + Number(match[2])
}

// Masks free-typed digits into mm:ss, filling from the right like a stopwatch
// (typing 8,2,3 shows "8:23") so staff never have to type the colon.
export function maskMmSs(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(-4)
  if (digits.length === 0) return ''
  const secs = digits.slice(-2).padStart(2, '0')
  const mins = digits.length > 2 ? digits.slice(0, -2) : '0'
  return `${mins}:${secs}`
}

// Masks free-typed digits into a km value with 2 decimals, filling from the
// right (typing 5,2,3 shows "5.23") so staff never have to type the dot —
// same intent as maskMmSs, matching the 2-decimal distance the watch shows.
export function maskKm(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(-5)
  if (digits.length === 0) return ''
  const decimals = digits.slice(-2).padStart(2, '0')
  const whole = digits.length > 2 ? String(Number(digits.slice(0, -2))) : '0'
  return `${whole}.${decimals}`
}
