import { useEffect, useState } from 'react'
import { Header } from '../components/Header'
import { rank, scoreOf } from '../lib/scoring'
import { getConfig, getResults, getTeams } from '../lib/store'
import type { Config, Result, Team } from '../lib/types'

const MEDALS = ['🥇', '🥈', '🥉']

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
  const ranked = config ? rank(Object.values(results).map((r) => scoreOf(r, config))) : []

  return (
    <div>
      <Header title="อันดับ" />
      <div className="mx-auto max-w-2xl">
        {ranked.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted">ยังไม่มีทีมบันทึกผล — อันดับจะขึ้นเมื่อกรอกผลทีมแรก</p>
        ) : (
          <ol>
            {ranked.map((r, i) => (
              <li key={r.bib} role="listitem" className="flex items-center gap-4 border-b border-line px-4 py-3.5">
                <span className={`w-6 font-mono text-lg ${i === 0 ? 'font-semibold text-signal' : 'text-muted'}`}>
                  {MEDALS[i] ?? i + 1}
                </span>
                <span className="font-mono text-base text-ink">{r.bib}</span>
                <span className="flex-1 truncate text-base text-ink">{nameByBib.get(r.bib) ?? r.name}</span>
                <span className="font-mono text-lg text-ink">{Math.round(r.total * 10) / 10}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}
