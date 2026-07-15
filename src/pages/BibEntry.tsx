import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ConfirmScreen } from '../components/ConfirmScreen'
import { Header } from '../components/Header'
import { Numpad, formatDigits, toSeconds } from '../components/Numpad'
import { maybeAutoBackup } from '../lib/backup'
import { formatDistance, toDistanceKm } from '../lib/distance'
import { scoreOf } from '../lib/scoring'
import { getConfig, getResults, getTeams, saveResult } from '../lib/store'
import type { Config, Result, Team } from '../lib/types'
import {
  isActivityInconsistentWithPaces,
  isActivityOutOfRange,
  isFarFromTarget,
  isPaceOutOfRange,
} from '../lib/validate'

type FieldKey = 'd1' | 'p1' | 'd2' | 'p2' | 'd3' | 'p3' | 'act'
const FIELD_ORDER: FieldKey[] = ['d1', 'p1', 'd2', 'p2', 'd3', 'p3', 'act']
const DISTANCE_FIELDS = new Set<FieldKey>(['d1', 'd2', 'd3'])

const secToDigits = (sec: number) => `${Math.floor(sec / 60)}${String(sec % 60).padStart(2, '0')}`
const kmToDigits = (km: number) => String(Math.round(km * 100))

type Segment = { key: FieldKey; label: string; dKey: FieldKey; target: number }

function segments(config: Config): Segment[] {
  return [
    { key: 'p1', label: '① Road', dKey: 'd1', target: config.target_p1_sec },
    { key: 'p2', label: '② Trail', dKey: 'd2', target: config.target_p2_sec },
    { key: 'p3', label: '③ Hilly', dKey: 'd3', target: config.target_p3_sec },
  ]
}

export function BibEntry() {
  const { bib = '' } = useParams()
  const navigate = useNavigate()
  const [team, setTeam] = useState<Team | null>(null)
  const [config, setConfig] = useState<Config | null>(null)
  const [recordedAt, setRecordedAt] = useState<number | null>(null)
  const [digits, setDigits] = useState<Record<FieldKey, string>>({
    d1: '',
    p1: '',
    d2: '',
    p2: '',
    d3: '',
    p3: '',
    act: '',
  })
  const [active, setActive] = useState<FieldKey>('d1')
  const [step, setStep] = useState<'entry' | 'confirm'>('entry')
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [pending, setPending] = useState<Result | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getTeams().then((teams) => setTeam(teams.find((t) => t.bib === bib) ?? null))
    getConfig().then(setConfig)
    getResults().then((results) => {
      const r = results[bib]
      if (!r) return
      setRecordedAt(r.recorded_at)
      setDigits({
        d1: r.d1_km != null ? kmToDigits(r.d1_km) : '',
        p1: secToDigits(r.p1_sec),
        d2: r.d2_km != null ? kmToDigits(r.d2_km) : '',
        p2: secToDigits(r.p2_sec),
        d3: r.d3_km != null ? kmToDigits(r.d3_km) : '',
        p3: secToDigits(r.p3_sec),
        act: secToDigits(r.act_sec),
      })
    })
  }, [bib])

  function setActiveDigits(value: string) {
    setDigits((prev) => ({ ...prev, [active]: value }))
  }

  function advanceField() {
    const i = FIELD_ORDER.indexOf(active)
    if (i < FIELD_ORDER.length - 1) setActive(FIELD_ORDER[i + 1])
  }

  function handleReview() {
    if (!config) return
    const p1_sec = toSeconds(digits.p1)
    const p2_sec = toSeconds(digits.p2)
    const p3_sec = toSeconds(digits.p3)
    const act_sec = toSeconds(digits.act)

    if (
      isPaceOutOfRange(p1_sec) ||
      isPaceOutOfRange(p2_sec) ||
      isPaceOutOfRange(p3_sec)
    ) {
      setError('เพซต้องอยู่ระหว่าง 4:00-25:00 ต่อกม.')
      return
    }
    if (isActivityOutOfRange(act_sec)) {
      setError('Activity Time ต้องอยู่ระหว่าง 25:00-90:00')
      return
    }
    setError(null)

    const result: Result = {
      bib,
      name: team?.name ?? '',
      p1_sec,
      p2_sec,
      p3_sec,
      act_sec,
      d1_km: toDistanceKm(digits.d1),
      d2_km: toDistanceKm(digits.d2),
      d3_km: toDistanceKm(digits.d3),
      recorded_at: recordedAt ?? Date.now(),
    }
    setPending(result)

    const farFromTarget =
      isFarFromTarget(p1_sec, config.target_p1_sec) ||
      isFarFromTarget(p2_sec, config.target_p2_sec) ||
      isFarFromTarget(p3_sec, config.target_p3_sec) ||
      isFarFromTarget(act_sec, config.target_act_sec)
    const inconsistent = isActivityInconsistentWithPaces(result)

    if (farFromTarget) {
      setWarning('ห่างเป้ามาก ตรวจสอบอีกครั้ง')
    } else if (inconsistent) {
      setWarning('Activity Time ไม่สอดคล้องกับเพซ 3 ช่วง น่าจะจดผิดจอ')
    } else {
      setStep('confirm')
    }
  }

  async function handleSave() {
    if (!pending) return
    setSaving(true)
    await saveResult(pending)
    await maybeAutoBackup(await getResults())
    navigate('/')
  }

  if (step === 'confirm' && pending && config) {
    return (
      <div>
        <Header title={`${bib} ${team?.name ?? ''}`} />
        <ConfirmScreen
          scored={scoreOf(pending, config)}
          config={config}
          onEdit={() => setStep('entry')}
          onSave={handleSave}
          saving={saving}
        />
      </div>
    )
  }

  return (
    <div>
      <Header title={`${bib} ${team?.name ?? ''}`} />

      <div className="mx-auto max-w-2xl">
        <div className="grid grid-cols-[2.75rem_1fr_1fr] items-center gap-3 px-4 pt-4 text-xs tracking-[0.08em] text-muted uppercase">
          <span />
          <span className="text-center">ระยะ (กม.)</span>
          <span className="text-center">เพซ</span>
        </div>

        {config &&
          segments(config).map((seg) => (
            <div key={seg.key} className="grid grid-cols-[2.75rem_1fr_1fr] items-center gap-3 px-4 py-2">
              <span className="text-sm text-muted">{seg.label}</span>
              <button
                type="button"
                data-testid={`field-${seg.dKey}`}
                onClick={() => setActive(seg.dKey)}
                className={`rounded-lg border px-2 py-3.5 text-center font-mono text-xl transition-colors ${
                  active === seg.dKey ? 'border-2 border-signal' : 'border-line'
                }`}
              >
                {digits[seg.dKey] ? formatDistance(digits[seg.dKey]) : <span className="text-muted">—</span>}
              </button>
              <div>
                <button
                  type="button"
                  data-testid={`field-${seg.key}`}
                  onClick={() => setActive(seg.key)}
                  className={`w-full rounded-lg border px-2 py-3.5 text-center font-mono text-xl transition-colors ${
                    active === seg.key ? 'border-2 border-signal' : 'border-line'
                  }`}
                >
                  {formatDigits(digits[seg.key])}
                </button>
                <p className="mt-1 text-center font-mono text-xs text-muted">เป้า {formatDigits(secToDigits(seg.target))}</p>
              </div>
            </div>
          ))}

        <div className="grid grid-cols-[2.75rem_1fr_1fr] items-center gap-3 px-4 py-2">
          <span className="text-sm text-muted">Activity</span>
          <div />
          <div>
            <button
              type="button"
              data-testid="field-act"
              onClick={() => setActive('act')}
              className={`w-full rounded-lg border px-2 py-3.5 text-center font-mono text-xl transition-colors ${
                active === 'act' ? 'border-2 border-signal' : 'border-line'
              }`}
            >
              {formatDigits(digits.act)}
            </button>
            {config && (
              <p className="mt-1 text-center font-mono text-xs text-muted">
                เป้า {formatDigits(secToDigits(config.target_act_sec))}
              </p>
            )}
          </div>
        </div>

        {error && (
          <p className="mx-4 mt-3 border-l-4 border-warn bg-warn/[0.06] px-3 py-2 text-sm text-warn">{error}</p>
        )}

        <div className="px-4 pt-6 pb-4">
          <Numpad
            value={digits[active]}
            onChange={setActiveDigits}
            onNext={advanceField}
            maxDigits={DISTANCE_FIELDS.has(active) ? 3 : 4}
          />
        </div>

        <div className="px-4 pb-6">
          <button
            type="button"
            onClick={handleReview}
            className="w-full rounded-lg bg-signal py-4 text-lg font-medium text-white transition-opacity active:opacity-80"
          >
            ตรวจทาน
          </button>
        </div>
      </div>

      {warning && (
        <div className="fixed inset-0 flex items-center justify-center bg-ink/40 p-4">
          <div className="w-full max-w-sm border border-line bg-paper p-5">
            <p className="mb-5 text-ink">{warning}</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setWarning(null)}
                className="flex-1 border border-line py-3 text-ink transition-colors hover:border-ink"
              >
                แก้ไข
              </button>
              <button
                type="button"
                onClick={() => {
                  setWarning(null)
                  setStep('confirm')
                }}
                className="flex-1 bg-signal py-3 font-medium text-white"
              >
                ยืนยัน
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
