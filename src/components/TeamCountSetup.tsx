import { useState } from 'react'

type TeamCountSetupProps = {
  onSubmit: (count: number) => void
}

export function TeamCountSetup({ onSubmit }: TeamCountSetupProps) {
  const [value, setValue] = useState('')
  const count = Number(value)
  const isValid = value.trim().length > 0 && Number.isInteger(count) && count > 0

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-lg bg-paper p-4">
        <label className="flex flex-col gap-2 text-ink">
          จำนวนทีม
          <input
            aria-label="จำนวนทีม"
            name="team_count"
            type="number"
            min={1}
            step={1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="rounded-md border border-muted px-3 py-3 text-center font-mono text-2xl"
          />
        </label>
        <button
          type="button"
          disabled={!isValid}
          onClick={() => onSubmit(count)}
          className="mt-4 w-full rounded-md bg-signal py-3 text-lg text-white disabled:opacity-40"
        >
          เริ่มใช้งาน
        </button>
      </div>
    </div>
  )
}
