import { formatSeconds, formatSignedSeconds } from '../lib/time'
import type { Config, Scored } from '../lib/types'

const OK_THRESHOLD_SEC = 15

type Row = { label: string; actual: number; target: number }

function DeltaRow({ label, actual, target }: Row) {
  const delta = actual - target
  const ok = Math.abs(delta) <= OK_THRESHOLD_SEC
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-muted">{label}</span>
      <span className="font-mono text-3xl text-ink">{formatSeconds(actual)}</span>
      <span className={`font-mono text-xl ${ok ? 'text-ok' : 'text-warn'}`}>
        <span className="text-muted">ห่าง</span> <span>{formatSignedSeconds(delta)}</span>{' '}
        <span>{ok ? '🟢' : '🟡'}</span>
      </span>
    </div>
  )
}

type ConfirmScreenProps = {
  scored: Scored
  config: Config
  onEdit: () => void
  onSave: () => void
  saving: boolean
}

export function ConfirmScreen({ scored, config, onEdit, onSave, saving }: ConfirmScreenProps) {
  return (
    <div className="p-4">
      <DeltaRow label="ช่วง 1" actual={scored.p1_sec} target={config.target_p1_sec} />
      <DeltaRow label="ช่วง 2" actual={scored.p2_sec} target={config.target_p2_sec} />
      <DeltaRow label="ช่วง 3" actual={scored.p3_sec} target={config.target_p3_sec} />
      <DeltaRow label="Activity" actual={scored.act_sec} target={config.target_act_sec} />
      <hr className="my-3 border-muted" />
      <div className="flex items-center justify-between">
        <span className="text-muted">คะแนนรวม</span>
        <span className="font-mono text-3xl text-ink">{Math.round(scored.total * 10) / 10}</span>
      </div>
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={onEdit}
          className="flex-1 rounded-md border border-ink py-4 text-lg text-ink"
        >
          แก้ไข
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="flex-1 rounded-md bg-signal py-4 text-lg text-white disabled:opacity-50"
        >
          บันทึก
        </button>
      </div>
    </div>
  )
}
