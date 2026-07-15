import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Header } from '../components/Header'
import { TeamCountSetup } from '../components/TeamCountSetup'
import { WatchPhotoImport } from '../components/WatchPhotoImport'
import { normalizeBib } from '../lib/bib'
import { isComplete } from '../lib/scoring'
import { computeGpsFlags } from '../lib/gpsFlags'
import { deleteTeam, getConfig, getResults, getTeams, saveTeams } from '../lib/store'
import type { Config, Result, Team } from '../lib/types'

function seedTeams(count: number): Team[] {
  return Array.from({ length: count }, (_, i) => {
    const bib = String(i + 1).padStart(3, '0')
    return { bib, name: `ทีม ${bib}` }
  })
}

function StatusChip({ bib, results, flagged }: { bib: string; results: Record<string, Result>; flagged: Set<string> }) {
  const result = results[bib]
  if (result && !isComplete(result)) {
    return <span className="rounded-full bg-warn/10 px-2.5 py-1 text-xs font-medium text-warn">⚠️ ข้อมูลไม่ครบ</span>
  }
  if (flagged.has(bib)) {
    return <span className="rounded-full bg-warn/10 px-2.5 py-1 text-xs font-medium text-warn">⚠️ GPS ไม่ตรง</span>
  }
  if (result) {
    return <span className="rounded-full bg-ok/10 px-2.5 py-1 text-xs font-medium text-ok">✅ บันทึกแล้ว</span>
  }
  return <span className="px-2.5 py-1 text-xs text-muted">⏳ รอ</span>
}

export function TeamList() {
  const [teams, setTeams] = useState<Team[] | null>(null)
  const [results, setResults] = useState<Record<string, Result>>({})
  const [config, setConfig] = useState<Config | null>(null)
  const [query, setQuery] = useState('')
  const [confirmingBib, setConfirmingBib] = useState<string | null>(null)

  useEffect(() => {
    getTeams().then(setTeams)
    getResults().then(setResults)
    getConfig().then(setConfig)
  }, [])

  async function handleSetupSubmit(count: number) {
    const seeded = seedTeams(count)
    await saveTeams(seeded)
    setTeams(seeded)
  }

  function handleDeleteClick(bib: string) {
    if (confirmingBib !== bib) {
      setConfirmingBib(bib)
      return
    }
    setConfirmingBib(null)
    deleteTeam(bib)
    setTeams((prev) => prev?.filter((t) => t.bib !== bib) ?? null)
    setResults((prev) => {
      const next = { ...prev }
      delete next[bib]
      return next
    })
  }

  const flagged = useMemo(
    () => (config ? computeGpsFlags(Object.values(results), config.gps_tolerance_pct) : new Set<string>()),
    [results, config],
  )

  const visibleTeams = useMemo(() => {
    if (!teams) return []
    if (!query.trim()) return teams
    return teams.filter((team) => normalizeBib(team.bib).startsWith(query.trim()))
  }, [teams, query])

  return (
    <div>
      <Header title="รายชื่อทีม" />
      <div className="mx-auto max-w-2xl">
        <div className="px-4 pt-4 pb-2">
          <input
            role="searchbox"
            name="bib_search"
            type="text"
            inputMode="numeric"
            placeholder="ค้นหา bib"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full border-b border-line pb-2 font-mono text-lg text-ink placeholder:text-muted focus:border-ink focus:outline-none"
          />
        </div>
        <WatchPhotoImport teams={teams ?? []} />
        <ul>
          {visibleTeams.map((team) => (
            <li key={team.bib} className="flex items-center border-b border-line">
              <Link
                to={`/bib/${team.bib}`}
                className="flex flex-1 items-center gap-3 px-4 py-3.5 transition-colors hover:bg-ink/[0.02]"
              >
                <span className="font-mono text-base text-ink">{team.bib}</span>
                <span className="flex-1 truncate text-base text-ink">{team.name}</span>
                <StatusChip bib={team.bib} results={results} flagged={flagged} />
              </Link>
              <button
                type="button"
                onClick={() => handleDeleteClick(team.bib)}
                onBlur={() => setConfirmingBib(null)}
                className={`mr-4 shrink-0 px-2 py-1 text-xs transition-colors ${
                  confirmingBib === team.bib ? 'font-medium text-warn' : 'text-muted hover:text-warn'
                }`}
              >
                {confirmingBib === team.bib ? '⚠️ ยืนยันลบ' : '🗑️ ลบ'}
              </button>
            </li>
          ))}
        </ul>
      </div>
      {teams?.length === 0 && <TeamCountSetup onSubmit={handleSetupSubmit} />}
    </div>
  )
}
