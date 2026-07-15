import { useEffect, useState } from 'react'
import { Header } from '../components/Header'
import { parseTeamsCsv } from '../lib/teamsCsv'
import { getConfig, saveConfig, saveTeams } from '../lib/store'
import type { Config } from '../lib/types'
import { wipeAllData } from '../lib/wipe'

const CONFIRM_WORD = 'ลบทั้งหมด'

const FIELDS: { key: keyof Config; label: string }[] = [
  { key: 'target_p1_sec', label: 'target_p1_sec' },
  { key: 'target_p2_sec', label: 'target_p2_sec' },
  { key: 'target_p3_sec', label: 'target_p3_sec' },
  { key: 'target_act_sec', label: 'target_act_sec' },
  { key: 'weight_pace', label: 'weight_pace' },
  { key: 'weight_act', label: 'weight_act' },
  { key: 'gps_tolerance_pct', label: 'gps_tolerance_pct' },
]

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

      {config && (
        <div className="grid grid-cols-2 gap-3 p-4">
          {FIELDS.map(({ key, label }) => (
            <label key={key} className="flex flex-col gap-1 text-sm text-muted">
              {label}
              <input
                aria-label={label}
                name={key}
                type="number"
                step="any"
                value={config[key]}
                onChange={(e) => updateField(key, e.target.valueAsNumber)}
                className="rounded-md border border-muted px-2 py-2 font-mono text-ink"
              />
            </label>
          ))}
        </div>
      )}

      <div className="border-t border-muted p-4">
        <label className="flex flex-col gap-1 text-sm text-muted">
          นำเข้าทีมจาก CSV
          <input
            aria-label="นำเข้าทีมจาก CSV"
            name="teams_csv"
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleCsvUpload(file)
            }}
          />
        </label>
        {importMessage && <p className="mt-2 text-ok">{importMessage}</p>}
      </div>

      <div className="border-t border-muted p-4">
        <label className="flex flex-col gap-1 text-sm text-warn">
          {`พิมพ์ "${CONFIRM_WORD}" เพื่อยืนยัน`}
          <input
            aria-label={`พิมพ์ "${CONFIRM_WORD}" เพื่อยืนยัน`}
            name="wipe_confirm"
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="rounded-md border border-warn px-2 py-2 font-mono text-ink"
          />
        </label>
        <button
          type="button"
          onClick={handleWipe}
          disabled={confirmText !== CONFIRM_WORD}
          className="mt-2 rounded-md bg-warn px-4 py-2 text-white disabled:opacity-40"
        >
          ล้างข้อมูล
        </button>
      </div>
    </div>
  )
}
