import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { findTeamByBib } from '../lib/bib'
import { extractBatchFromPhotos, type BatchExtraction } from '../lib/extractBatch'
import { formatSeconds } from '../lib/time'
import type { Team } from '../lib/types'
import type { FieldsState } from '../pages/BibEntry'

const PACE_KEYS = ['p1', 'p2', 'p3'] as const
const DIST_KEYS = ['d1', 'd2', 'd3'] as const

function buildPrefill(extraction: BatchExtraction): Partial<FieldsState> {
  const prefill: Partial<FieldsState> = {}
  if (extraction.activity_sec != null) prefill.act = formatSeconds(extraction.activity_sec)
  extraction.laps.slice(0, 3).forEach((lap, i) => {
    if (lap.pace_sec != null) prefill[PACE_KEYS[i]] = formatSeconds(lap.pace_sec)
    if (lap.distance_km != null) prefill[DIST_KEYS[i]] = String(lap.distance_km)
  })
  return prefill
}

export function WatchPhotoImport({ teams }: { teams: Team[] }) {
  const navigate = useNavigate()
  const [extracting, setExtracting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [needsBib, setNeedsBib] = useState(false)
  const [bibGuess, setBibGuess] = useState('')
  const [pendingPrefill, setPendingPrefill] = useState<Partial<FieldsState>>({})

  async function handleFiles(files: File[]) {
    if (files.length === 0) return
    setExtracting(true)
    setError(null)
    setNeedsBib(false)
    try {
      const extraction = await extractBatchFromPhotos(files)
      const prefill = buildPrefill(extraction)

      if (extraction.bib == null && Object.keys(prefill).length === 0) {
        setError('อ่านค่าจากรูปไม่ได้ ลองถ่ายใหม่ให้ชัดขึ้น')
        return
      }

      const team = extraction.bib ? findTeamByBib(teams, extraction.bib) : undefined
      if (team) {
        navigate(`/bib/${team.bib}`, { state: { prefill } })
        return
      }

      setPendingPrefill(prefill)
      setBibGuess(extraction.bib ?? '')
      setNeedsBib(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'อ่านรูปไม่สำเร็จ')
    } finally {
      setExtracting(false)
    }
  }

  function handleBibConfirm() {
    const trimmed = bibGuess.trim()
    if (!trimmed) return
    const team = findTeamByBib(teams, trimmed)
    navigate(`/bib/${team?.bib ?? trimmed}`, { state: { prefill: pendingPrefill } })
  }

  return (
    <div className="mx-4 mt-2 mb-2 border border-line p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-ink">✨ นำเข้าจากรูปวอทช์</span>
        <label className="cursor-pointer text-sm text-signal transition-opacity hover:opacity-70">
          📸 เลือกรูป
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? [])
              e.target.value = ''
              handleFiles(files)
            }}
          />
        </label>
      </div>

      {extracting && <p className="mt-3 text-sm text-muted">กำลังอ่านรูป...</p>}

      {error && (
        <p className="mt-3 border-l-4 border-warn bg-warn/[0.06] px-3 py-2 text-sm text-warn">{error}</p>
      )}

      {needsBib && (
        <div className="mt-3">
          <p className="mb-2 text-xs text-muted">อ่านเลข bib จากรูปไม่ชัด พิมพ์เลข bib เอง</p>
          <div className="flex gap-2">
            <input
              aria-label="เลข bib"
              type="text"
              inputMode="numeric"
              placeholder="bib"
              value={bibGuess}
              onChange={(e) => setBibGuess(e.target.value)}
              className="w-24 rounded-lg border border-line px-2 py-2 text-center font-mono text-lg text-ink focus:border-signal focus:outline-none"
            />
            <button
              type="button"
              onClick={handleBibConfirm}
              disabled={!bibGuess.trim()}
              className="flex-1 rounded-lg bg-signal py-2 text-sm font-medium text-white transition-opacity disabled:opacity-30"
            >
              ✅ ยืนยัน
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
