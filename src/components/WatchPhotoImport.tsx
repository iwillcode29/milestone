import { useState } from 'react'
import { maybeAutoBackup } from '../lib/backup'
import { findTeamByBib } from '../lib/bib'
import { extractBatchFromPhotos, type BatchExtraction } from '../lib/extractBatch'
import { groupPhotosByTime } from '../lib/groupPhotosByTime'
import { isComplete, missingFieldLabels } from '../lib/scoring'
import { getResults, saveResult } from '../lib/store'
import type { Result, Team } from '../lib/types'

type GroupOutcome =
  | { status: 'saved'; bib: string; complete: boolean; missing: string[] }
  | { status: 'unresolved'; bibGuess: string | null; extraction: BatchExtraction }
  | { status: 'failed'; error: string }

function buildResultFromExtraction(team: Team, extraction: BatchExtraction, existing?: Result): Result {
  const laps = extraction.laps
  return {
    bib: team.bib,
    name: team.name,
    p1_sec: laps[0]?.pace_sec ?? existing?.p1_sec,
    d1_km: laps[0]?.distance_km ?? existing?.d1_km,
    p2_sec: laps[1]?.pace_sec ?? existing?.p2_sec,
    d2_km: laps[1]?.distance_km ?? existing?.d2_km,
    p3_sec: laps[2]?.pace_sec ?? existing?.p3_sec,
    d3_km: laps[2]?.distance_km ?? existing?.d3_km,
    act_sec: extraction.activity_sec ?? existing?.act_sec,
    recorded_at: existing?.recorded_at ?? Date.now(),
  }
}

export function WatchPhotoImport({ teams, onImported }: { teams: Team[]; onImported: () => void }) {
  const [extracting, setExtracting] = useState(false)
  const [outcomes, setOutcomes] = useState<GroupOutcome[]>([])
  const [bibInputs, setBibInputs] = useState<Record<number, string>>({})
  const [resolveErrors, setResolveErrors] = useState<Record<number, string>>({})

  async function handleFiles(files: File[]) {
    if (files.length === 0) return
    setExtracting(true)
    setOutcomes([])
    setBibInputs({})
    setResolveErrors({})

    const groups = groupPhotosByTime(files)
    const existingResults = await getResults()

    const settled = await Promise.all(
      groups.map(async (group): Promise<GroupOutcome> => {
        try {
          const extraction = await extractBatchFromPhotos(group)
          const team = extraction.bib ? findTeamByBib(teams, extraction.bib) : undefined
          if (!team) {
            return { status: 'unresolved', bibGuess: extraction.bib, extraction }
          }
          const result = buildResultFromExtraction(team, extraction, existingResults[team.bib])
          await saveResult(result)
          return { status: 'saved', bib: team.bib, complete: isComplete(result), missing: missingFieldLabels(result) }
        } catch (e) {
          return { status: 'failed', error: e instanceof Error ? e.message : 'อ่านรูปไม่สำเร็จ' }
        }
      }),
    )

    await maybeAutoBackup(await getResults())
    setOutcomes(settled)
    setExtracting(false)
    onImported()
  }

  async function handleResolveBib(index: number) {
    const outcome = outcomes[index]
    if (outcome.status !== 'unresolved') return
    const typed = (bibInputs[index] ?? '').trim()
    if (!typed) return
    const team = findTeamByBib(teams, typed)
    if (!team) {
      setResolveErrors((prev) => ({ ...prev, [index]: 'ไม่พบทีมเลข bib นี้' }))
      return
    }
    const existingResults = await getResults()
    const result = buildResultFromExtraction(team, outcome.extraction, existingResults[team.bib])
    await saveResult(result)
    await maybeAutoBackup(await getResults())
    setOutcomes((prev) =>
      prev.map((o, i) =>
        i === index
          ? { status: 'saved', bib: team.bib, complete: isComplete(result), missing: missingFieldLabels(result) }
          : o,
      ),
    )
    setResolveErrors((prev) => {
      const next = { ...prev }
      delete next[index]
      return next
    })
    onImported()
  }

  return (
    <div className="mx-4 mt-2 mb-2 border border-line p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-ink">✨ นำเข้าจากรูปวอทช์ (เลือกได้หลายทีม)</span>
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

      {outcomes.length > 0 && (
        <ul className="mt-3 space-y-2">
          {outcomes.map((outcome, i) => (
            <li key={i} className="text-sm">
              {outcome.status === 'saved' && outcome.complete && <p className="text-ok">✅ {outcome.bib} บันทึกครบ</p>}
              {outcome.status === 'saved' && !outcome.complete && (
                <p className="text-warn">
                  ⚠️ {outcome.bib} บันทึกแล้วแต่ไม่ครบ — ขาด: {outcome.missing.join(', ')}
                </p>
              )}
              {outcome.status === 'failed' && <p className="text-warn">❌ {outcome.error}</p>}
              {outcome.status === 'unresolved' && (
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-warn">❓ อ่าน bib ไม่ได้ พิมพ์เอง:</span>
                    <input
                      aria-label="เลข bib"
                      type="text"
                      inputMode="numeric"
                      placeholder="bib"
                      value={bibInputs[i] ?? outcome.bibGuess ?? ''}
                      onChange={(e) => setBibInputs((prev) => ({ ...prev, [i]: e.target.value }))}
                      className="w-20 rounded-lg border border-line px-2 py-1 text-center font-mono text-ink focus:border-signal focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleResolveBib(i)}
                      className="rounded-lg bg-signal px-3 py-1 text-xs font-medium text-white"
                    >
                      ✅ ยืนยัน
                    </button>
                  </div>
                  {resolveErrors[i] && <p className="mt-1 text-xs text-warn">{resolveErrors[i]}</p>}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
