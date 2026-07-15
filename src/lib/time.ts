export function formatSeconds(totalSec: number): string {
  const mins = Math.floor(totalSec / 60)
  const secs = totalSec % 60
  return `${mins}:${String(secs).padStart(2, '0')}`
}

export function formatSignedSeconds(delta: number): string {
  const sign = delta < 0 ? '−' : '+'
  return `${sign}${Math.abs(delta)} วิ`
}
