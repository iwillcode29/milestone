import { useEffect } from 'react'

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

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (e.key >= '0' && e.key <= '9') {
        press(e.key as (typeof KEYS)[number])
      } else if (e.key === 'Backspace') {
        press('⌫')
      } else if (e.key === 'Enter') {
        press('→')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  })

  return (
    <div className="mx-auto grid w-fit grid-cols-3 gap-3">
      {KEYS.map((key) => {
        const isControl = key === '⌫' || key === '→'
        return (
          <button
            key={key}
            type="button"
            onClick={() => press(key)}
            className={`flex h-17 w-17 items-center justify-center rounded-xl border text-2xl transition-colors active:bg-signal/10 ${
              isControl
                ? 'border-line font-sans text-muted'
                : 'border-line font-mono font-medium text-ink'
            }`}
          >
            {key}
          </button>
        )
      })}
    </div>
  )
}
