import { useEffect, useState } from 'react'
import { Header } from '../components/Header'
import { parseTeamsCsv } from '../lib/teamsCsv'
import { getConfig, saveConfig, saveTeams } from '../lib/store'
import { formatSeconds } from '../lib/time'
import type { Config } from '../lib/types'
import { wipeAllData } from '../lib/wipe'

const CONFIRM_WORD = 'ลบทั้งหมด'

type FieldDef = { key: keyof Config; label: string; kind: 'time' | 'num' }

const FIELDS: FieldDef[] = [
  { key: 'target_p1_sec', label: 'เป้าเพซ Road', kind: 'time' },
  { key: 'target_p2_sec', label: 'เป้าเพซ Trail', kind: 'time' },
  { key: 'target_p3_sec', label: 'เป้าเพซ Hilly', kind: 'time' },
  { key: 'target_act_sec', label: 'เป้าเวลารวม (Activity)', kind: 'time' },
  { key: 'weight_pace', label: 'น้ำหนักคะแนนเพซ', kind: 'num' },
  { key: 'weight_act', label: 'น้ำหนักคะแนนเวลารวม', kind: 'num' },
  { key: 'gps_tolerance_pct', label: 'เผื่อคลาด GPS (%)', kind: 'num' },
]

function SectionLabel({ children }: { children: string }) {
  return <p className="mb-3 text-xs tracking-[0.08em] text-muted uppercase">{children}</p>
}

export function Settings() {
  const [config, setConfig] = useState<Config | null>(null)
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const [confirmText, setConfirmText] = useState('')

  useEffect(() => {
    getConfig().then(setConfig)
  }, [])

  function updateField(key: keyof Config, value: number) {
    if (!config || Number.isNaN(value)) return
    const next = { ...config, [key]: value }
    setConfig(next)
    saveConfig(next)
  }

  async function handleCsvUpload(file: File) {
    const text = await file.text()
    const teams = parseTeamsCsv(text)
    await saveTeams(teams)
    setImportMessage(`นำเข้า ${teams.length} ทีมแล้ว`)
  }

  async function handleWipe() {
    if (confirmText !== CONFIRM_WORD) return
    await wipeAllData()
    setConfirmText('')
  }

  return (
    <div>
      <Header title="ตั้งค่า" />
      <div className="mx-auto max-w-2xl px-4 py-6">
        {config && (
          <section>
            <SectionLabel>🎯 เป้าหมาย &amp; น้ำหนักคะแนน</SectionLabel>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              {FIELDS.map(({ key, label, kind }) => (
                <label key={key} className="flex flex-col gap-1">
                  <span className="text-sm text-ink">{label}</span>
                  <input
                    aria-label={label}
                    name={key}
                    type="number"
                    step="any"
                    value={config[key]}
                    onChange={(e) => updateField(key, e.target.valueAsNumber)}
                    className="border-b border-line py-1.5 font-mono text-ink focus:border-ink focus:outline-none"
                  />
                  <span className="font-mono text-xs text-muted">
                    {kind === 'time' ? `= ${formatSeconds(config[key])} นาที (${config[key]} วินาที)` : ' '}
                  </span>
                </label>
              ))}
            </div>
          </section>
        )}

        <section className="mt-8 border-t border-line pt-6">
          <SectionLabel>📥 นำเข้าทีมจาก CSV</SectionLabel>
          <input
            aria-label="นำเข้าทีมจาก CSV"
            name="teams_csv"
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleCsvUpload(file)
            }}
            className="text-sm text-ink file:mr-3 file:border file:border-line file:bg-paper file:px-3 file:py-1.5 file:text-sm file:text-ink"
          />
          {importMessage && <p className="mt-2 text-sm text-ok">✅ {importMessage}</p>}
        </section>

        <section className="mt-8 border-t border-line pt-6">
          <SectionLabel>🗑️ ล้างข้อมูล</SectionLabel>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-warn">{`พิมพ์ "${CONFIRM_WORD}" เพื่อยืนยัน`}</span>
            <input
              aria-label={`พิมพ์ "${CONFIRM_WORD}" เพื่อยืนยัน`}
              name="wipe_confirm"
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="border-b border-warn/40 py-1.5 font-mono text-ink focus:border-warn focus:outline-none"
            />
          </label>
          <button
            type="button"
            onClick={handleWipe}
            disabled={confirmText !== CONFIRM_WORD}
            className="mt-3 bg-warn px-4 py-2 text-sm text-white transition-opacity disabled:opacity-30"
          >
            🗑️ ล้างข้อมูล
          </button>
        </section>
      </div>
    </div>
  )
}
