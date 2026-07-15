export function formatDigits(digits: string): string {
  if (digits.length === 0) return '0:00'
  const secs = digits.slice(-2).padStart(2, '0')
  const mins = digits.length > 2 ? digits.slice(0, -2) : '0'
  return `${mins}:${secs}`
}

export function toSeconds(digits: string): number {
  if (digits.length === 0) return 0
  const secs = Number(digits.slice(-2))
  const mins = digits.length > 2 ? Number(digits.slice(0, -2)) : 0
  return mins * 60 + secs
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '→'] as const

type NumpadProps = {
  value: string
  onChange: (digits: string) => void
  onNext?: () => void
  maxDigits?: number
}

export function Numpad({ value, onChange, onNext, maxDigits = 4 }: NumpadProps) {
  function press(key: (typeof KEYS)[number]) {
    if (key === '⌫') {
      onChange(value.slice(0, -1))
      return
    }
    if (key === '→') {
      onNext?.()
      return
    }
    if (value.length >= maxDigits) return
    onChange(value + key)
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {KEYS.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => press(key)}
          className="h-16 w-16 rounded-lg border border-muted text-2xl font-mono text-ink active:bg-signal/10"
        >
          {key}
        </button>
      ))}
    </div>
  )
}
