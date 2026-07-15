import { useState } from 'react'

type TeamCountSetupProps = {
  onSubmit: (count: number) => void
}

export function TeamCountSetup({ onSubmit }: TeamCountSetupProps) {
  const [value, setValue] = useState('')
  const count = Number(value)
  const isValid = value.trim().length > 0 && Number.isInteger(count) && count > 0

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-ink/40 p-4">
      <div className="w-full max-w-sm border border-line bg-paper p-5">
        <p className="mb-4 text-sm text-muted">ตั้งค่าครั้งแรก — ระบุจำนวนทีมที่จะแข่ง</p>
        <label className="flex flex-col gap-2">
          <span className="text-xs tracking-[0.08em] text-muted uppercase">จำนวนทีม</span>
          <input
            aria-label="จำนวนทีม"
            name="team_count"
            type="number"
            min={1}
            step={1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="border-b border-line py-2 text-center font-mono text-3xl text-ink focus:border-ink focus:outline-none"
          />
        </label>
        <button
          type="button"
          disabled={!isValid}
          onClick={() => onSubmit(count)}
          className="mt-5 w-full bg-signal py-3 text-lg font-medium text-white transition-opacity active:opacity-80 disabled:opacity-30"
        >
          เริ่มใช้งาน
        </button>
      </div>
    </div>
  )
}
