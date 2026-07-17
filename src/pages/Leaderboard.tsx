import { useEffect, useState } from 'react'
import { Header } from '../components/Header'
import { isScoreable, missingFieldLabels, rank, scoreOf } from '../lib/scoring'
import { getConfig, getResults, getTeams } from '../lib/store'
import { formatSeconds } from '../lib/time'
import type { Config, Result, Scored, Team } from '../lib/types'

const MEDALS = ['🥇', '🥈', '🥉']

const SEGS = [
  { label: 'Road', p: 'p1_sec', d: 'd1_km' },
  { label: 'Trail', p: 'p2_sec', d: 'd2_km' },
  { label: 'Hilly', p: 'p3_sec', d: 'd3_km' },
] as const

// Shared column template so the header legend and every row line up exactly.
const GRID =
  'grid grid-cols-[1.75rem_minmax(3.5rem,1fr)_repeat(3,3rem)_3.25rem_3.5rem] items-center gap-x-5 px-4'

const km = (v: number | undefined) => (v != null ? v.toFixed(2) : '—')
const kmClass = (v: number | undefined) => (v != null ? 'text-muted' : 'text-line')

export function Leaderboard() {
  const [teams, setTeams] = useState<Team[]>([])
  const [results, setResults] = useState<Record<string, Result>>({})
  const [config, setConfig] = useState<Config | null>(null)

  useEffect(() => {
    getTeams().then(setTeams)
    getResults().then(setResults)
    getConfig().then(setConfig)
  }, [])

  const nameByBib = new Map(teams.map((t) => [t.bib, t.name]))
  const allResults = Object.values(results)
  const scoreableResults = allResults.filter(isScoreable)
  const unscoreableResults = allResults.filter((r) => !isScoreable(r))
  const ranked = config ? rank(scoreableResults.map((r) => scoreOf(r, config))) : []

  if (allResults.length === 0) {
    return (
      <div>
        <Header title="อันดับ" />
        <div className="mx-auto max-w-2xl">
          <p className="px-4 py-16 text-center text-sm text-muted">
            ยังไม่มีทีมบันทึกผล — อันดับจะขึ้นเมื่อกรอกผลทีมแรก
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Header title="อันดับ" />
      <div className="mx-auto max-w-2xl overflow-x-auto">
        <div className="min-w-[22rem]">
          {ranked.length > 0 && (
            <>
              <div
                className={`${GRID} border-b border-line py-2 text-[0.65rem] tracking-[0.08em] text-muted uppercase`}
              >
                <span />
                <span>ทีม</span>
                {SEGS.map((s) => (
                  <span key={s.label} className="text-center">
                    {s.label}
                  </span>
                ))}
                <span className="text-right">act</span>
                <span className="text-right">คะแนน</span>
              </div>
              <ol>
                {ranked.map((r, i) => (
                  <Row key={r.bib} r={r} i={i} name={nameByBib.get(r.bib) ?? r.name} />
                ))}
              </ol>
            </>
          )}

          {unscoreableResults.length > 0 && (
            <ul className="border-t border-line">
              {unscoreableResults.map((r) => (
                <li key={r.bib} className={`${GRID} border-b border-line py-3`}>
                  <span className="text-center text-base">⚠️</span>
                  <span className="min-w-0">
                    <span className="block truncate text-base text-ink">{nameByBib.get(r.bib) ?? r.name}</span>
                    <span className="font-mono text-xs text-muted">{r.bib}</span>
                  </span>
                  <span className="col-span-5 text-xs text-warn">ขาด: {missingFieldLabels(r).join(', ')}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

function Row({ r, i, name }: { r: Scored; i: number; name: string }) {
  const leader = i === 0
  return (
    <li className={`${GRID} border-b border-line py-3 ${leader ? 'bg-signal/5' : ''}`}>
      <span className={`text-center font-mono text-base ${leader ? 'font-semibold text-signal' : 'text-muted'}`}>
        {MEDALS[i] ?? i + 1}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-base text-ink">{name}</span>
        <span className="font-mono text-xs text-muted">{r.bib}</span>
      </span>
      {SEGS.map((s) => (
        <span key={s.label} className="text-center leading-tight">
          <span className="block font-mono text-sm text-ink">{formatSeconds(r[s.p])}</span>
          <span className={`block font-mono text-xs ${kmClass(r[s.d])}`}>{km(r[s.d])}</span>
        </span>
      ))}
      <span className="text-right font-mono text-sm text-muted">{formatSeconds(r.act_sec)}</span>
      <span className={`text-right font-mono text-lg ${leader ? 'font-semibold text-signal' : 'text-ink'}`}>
        {Math.round(r.total * 10) / 10}
      </span>
    </li>
  )
}
