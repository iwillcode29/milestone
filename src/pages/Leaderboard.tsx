import { useEffect, useState } from 'react'
import { Header } from '../components/Header'
import { rank, scoreOf } from '../lib/scoring'
import { getConfig, getResults, getTeams } from '../lib/store'
import type { Config, Result, Team } from '../lib/types'

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
      <ol>
        {ranked.map((r, i) => (
          <li key={r.bib} role="listitem" className="flex items-center gap-3 border-b border-muted px-4 py-3">
            <span className="w-8 font-mono text-lg">{i + 1}</span>
            <span className="font-mono">{r.bib}</span>
            <span className="flex-1 px-2">{nameByBib.get(r.bib) ?? r.name}</span>
            <span className="font-mono text-lg">{Math.round(r.total * 10) / 10}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
