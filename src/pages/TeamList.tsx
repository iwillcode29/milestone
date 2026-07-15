import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Header } from '../components/Header'
import { computeGpsFlags } from '../lib/gpsFlags'
import { getConfig, getResults, getTeams } from '../lib/store'
import type { Config, Result, Team } from '../lib/types'

function normalizeBib(bib: string): string {
  return String(Number(bib))
}

function statusOf(bib: string, results: Record<string, Result>, flagged: Set<string>): string {
  if (flagged.has(bib)) return '⚠️'
  return results[bib] ? 'บันทึกแล้ว' : 'รอ'
}

export function TeamList() {
  const [teams, setTeams] = useState<Team[]>([])
  const [results, setResults] = useState<Record<string, Result>>({})
  const [config, setConfig] = useState<Config | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    getTeams().then(setTeams)
    getResults().then(setResults)
    getConfig().then(setConfig)
  }, [])

  const flagged = useMemo(
    () => (config ? computeGpsFlags(Object.values(results), config.gps_tolerance_pct) : new Set<string>()),
    [results, config],
  )

  const visibleTeams = useMemo(() => {
    if (!query.trim()) return teams
    return teams.filter((team) => normalizeBib(team.bib).startsWith(query.trim()))
  }, [teams, query])

  return (
    <div>
      <Header title="รายชื่อทีม" />
      <input
        role="searchbox"
        name="bib_search"
        type="text"
        inputMode="numeric"
        placeholder="ค้นหา bib"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="m-4 w-[calc(100%-2rem)] rounded-md border border-muted px-3 py-2 font-mono text-lg"
      />
      <ul>
        {visibleTeams.map((team) => (
          <li key={team.bib}>
            <Link
              to={`/bib/${team.bib}`}
              className="flex items-center justify-between border-b border-muted px-4 py-3"
            >
              <span className="font-mono text-lg">{team.bib}</span>
              <span className="flex-1 px-3 text-left">{team.name}</span>
              <span>{statusOf(team.bib, results, flagged)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
