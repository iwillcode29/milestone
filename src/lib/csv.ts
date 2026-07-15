import { isScoreable, rank, scoreOf } from './scoring'
import type { Config, Result, Team } from './types'

const HEADER = 'bib,name,p1_sec,p2_sec,p3_sec,act_sec,total_score,rank'

function csvField(value: string): string {
  return value.includes(',') ? `"${value}"` : value
}

export function resultsToCsv(
  teams: Team[],
  results: Record<string, Result>,
  config: Config,
): string {
  const ranked = rank(Object.values(results).filter(isScoreable).map((r) => scoreOf(r, config)))
  const rankByBib = new Map(ranked.map((r, i) => [r.bib, i + 1]))

  const rows = teams.map((team) => {
    const scored = ranked.find((r) => r.bib === team.bib)
    if (!scored) return `${team.bib},${csvField(team.name)},,,,,,`
    const place = rankByBib.get(team.bib)
    return [
      team.bib,
      csvField(team.name),
      scored.p1_sec,
      scored.p2_sec,
      scored.p3_sec,
      scored.act_sec,
      scored.total,
      place,
    ].join(',')
  })

  return [HEADER, ...rows].join('\n') + '\n'
}
