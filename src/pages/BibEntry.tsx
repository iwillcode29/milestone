import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ConfirmScreen } from '../components/ConfirmScreen'
import { Header } from '../components/Header'
import { maybeAutoBackup } from '../lib/backup'
import { extractReadingsFromPhoto, type Reading } from '../lib/extract'
import { scoreOf } from '../lib/scoring'
import { getConfig, getResults, getTeams, saveResult } from '../lib/store'
import { formatSeconds, maskMmSs, parseMmSs } from '../lib/time'
import type { Config, Result, Team } from '../lib/types'
import {
  isActivityInconsistentWithPaces,
  isActivityOutOfRange,
  isFarFromTarget,
  isPaceOutOfRange,
} from '../lib/validate'

type FieldsState = {
  d1: string
  p1: string
  d2: string
  p2: string
  d3: string
  p3: string
  act: string
}

const EMPTY_FIELDS: FieldsState = { d1: '', p1: '', d2: '', p2: '', d3: '', p3: '', act: '' }

type Segment = { paceKey: 'p1' | 'p2' | 'p3'; distKey: 'd1' | 'd2' | 'd3'; label: string; target: number }

function segments(config: Config): Segment[] {
  return [
    { paceKey: 'p1', distKey: 'd1', label: '① Road', target: config.target_p1_sec },
    { paceKey: 'p2', distKey: 'd2', label: '② Trail', target: config.target_p2_sec },
    { paceKey: 'p3', distKey: 'd3', label: '③ Hilly', target: config.target_p3_sec },
  ]
}

export function BibEntry() {
  const { bib = '' } = useParams()
  const navigate = useNavigate()
  const [team, setTeam] = useState<Team | null>(null)
  const [config, setConfig] = useState<Config | null>(null)
  const [recordedAt, setRecordedAt] = useState<number | null>(null)
  const [fields, setFields] = useState<FieldsState>(EMPTY_FIELDS)
  const [step, setStep] = useState<'entry' | 'confirm'>('entry')
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [pending, setPending] = useState<Result | null>(null)
  const [saving, setSaving] = useState(false)
  const [focusedField, setFocusedField] = useState<keyof FieldsState | null>(null)
  const [readings, setReadings] = useState<Reading[] | null>(null)
  const [extracting, setExtracting] = useState(false)
  const [extractError, setExtractError] = useState<string | null>(null)

  useEffect(() => {
    getTeams().then((teams) => setTeam(teams.find((t) => t.bib === bib) ?? null))
    getConfig().then(setConfig)
    getResults().then((results) => {
      const r = results[bib]
      if (!r) return
      setRecordedAt(r.recorded_at)
      setFields({
        d1: r.d1_km != null ? String(r.d1_km) : '',
        p1: formatSeconds(r.p1_sec),
        d2: r.d2_km != null ? String(r.d2_km) : '',
        p2: formatSeconds(r.p2_sec),
        d3: r.d3_km != null ? String(r.d3_km) : '',
        p3: formatSeconds(r.p3_sec),
        act: formatSeconds(r.act_sec),
      })
    })
  }, [bib])

  function setField(key: keyof FieldsState, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }))
  }

  async function handlePhotoSelect(file: File) {
    setExtracting(true)
    setExtractError(null)
    setReadings(null)
    try {
      const found = await extractReadingsFromPhoto(file)
      if (found.length === 0) {
        setExtractError('อ่านค่าจากรูปไม่ได้ ลองถ่ายใหม่ให้ชัดขึ้น')
      } else {
        setReadings(found)
      }
    } catch (e) {
      setExtractError(e instanceof Error ? e.message : 'อ่านรูปไม่สำเร็จ')
    } finally {
      setExtracting(false)
    }
  }

  function applyReading(reading: Reading) {
    if (!focusedField) {
      setExtractError('แตะช่องที่จะกรอกก่อน แล้วค่อยกดค่าที่ต้องการ')
      return
    }
    if (reading.type === 'time') {
      setField(focusedField, formatSeconds(reading.seconds))
    } else {
      setField(focusedField, String(reading.km))
    }
  }

  function handleReview() {
    if (!config) return
    const p1_sec = parseMmSs(fields.p1)
    const p2_sec = parseMmSs(fields.p2)
    const p3_sec = parseMmSs(fields.p3)
    const act_sec = parseMmSs(fields.act)

    if ([p1_sec, p2_sec, p3_sec, act_sec].some(Number.isNaN)) {
      setError('รูปแบบเวลาไม่ถูกต้อง ใช้ mm:ss เช่น 8:23')
      return
    }
    if (isPaceOutOfRange(p1_sec) || isPaceOutOfRange(p2_sec) || isPaceOutOfRange(p3_sec)) {
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
      d1_km: fields.d1 ? Number(fields.d1) : undefined,
      d2_km: fields.d2 ? Number(fields.d2) : undefined,
      d3_km: fields.d3 ? Number(fields.d3) : undefined,
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
        <div className="grid grid-cols-[auto_1fr_1fr] items-center gap-2 px-4 pt-4 text-xs tracking-[0.08em] text-muted uppercase">
          <span />
          <span className="min-w-0 text-center">ระยะ (กม.)</span>
          <span className="min-w-0 text-center">เพซ</span>
        </div>

        {config &&
          segments(config).map((seg) => (
            <div key={seg.paceKey} className="grid grid-cols-[auto_1fr_1fr] items-center gap-2 px-4 py-2">
              <span className="text-sm whitespace-nowrap text-muted">{seg.label}</span>
              <div className="min-w-0">
                <input
                  aria-label={`ระยะ ${seg.label}`}
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="—"
                  value={fields[seg.distKey]}
                  onChange={(e) => setField(seg.distKey, e.target.value)}
                  onFocus={() => setFocusedField(seg.distKey)}
                  className="w-full min-w-0 rounded-lg border border-line px-2 py-3.5 text-center font-mono text-xl text-ink focus:border-signal focus:outline-none"
                />
              </div>
              <div className="min-w-0">
                <input
                  aria-label={`เพซ ${seg.label}`}
                  type="text"
                  inputMode="numeric"
                  placeholder="mm:ss"
                  value={fields[seg.paceKey]}
                  onChange={(e) => setField(seg.paceKey, maskMmSs(e.target.value))}
                  onFocus={() => setFocusedField(seg.paceKey)}
                  className="w-full min-w-0 rounded-lg border border-line px-2 py-3.5 text-center font-mono text-xl text-ink focus:border-signal focus:outline-none"
                />
                <p className="mt-1 text-center font-mono text-xs text-muted">เป้า {formatSeconds(seg.target)}</p>
              </div>
            </div>
          ))}

        <div className="grid grid-cols-[auto_1fr_1fr] items-center gap-2 px-4 py-2">
          <span className="text-sm whitespace-nowrap text-muted">Activity</span>
          <div />
          <div className="min-w-0">
            <input
              aria-label="Activity Time"
              type="text"
              inputMode="numeric"
              placeholder="mm:ss"
              value={fields.act}
              onChange={(e) => setField('act', maskMmSs(e.target.value))}
              onFocus={() => setFocusedField('act')}
              className="w-full min-w-0 rounded-lg border border-line px-2 py-3.5 text-center font-mono text-xl text-ink focus:border-signal focus:outline-none"
            />
            {config && (
              <p className="mt-1 text-center font-mono text-xs text-muted">เป้า {formatSeconds(config.target_act_sec)}</p>
            )}
          </div>
        </div>

        <div className="mt-2 px-4">
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-muted transition-colors hover:text-ink">
            <span>📷 อ่านจากรูป</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (file) handlePhotoSelect(file)
              }}
            />
          </label>
          {extracting && <p className="mt-2 text-sm text-muted">กำลังอ่านรูป...</p>}
          {extractError && <p className="mt-2 text-sm text-warn">{extractError}</p>}
          {readings && readings.length > 0 && (
            <div className="mt-2">
              <p className="mb-2 text-xs text-muted">แตะช่องที่จะกรอกก่อน แล้วกดค่าด้านล่างเพื่อใส่</p>
              <div className="flex flex-wrap gap-2">
                {readings.map((r, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => applyReading(r)}
                    className="rounded-full border border-line px-3 py-1.5 font-mono text-sm text-ink transition-colors hover:border-signal"
                  >
                    {r.type === 'time' ? formatSeconds(r.seconds) : `${r.km} km`}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {error && (
          <p className="mx-4 mt-3 border-l-4 border-warn bg-warn/[0.06] px-3 py-2 text-sm text-warn">{error}</p>
        )}

        <div className="px-4 pt-6 pb-6">
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
