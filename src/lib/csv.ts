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
    if (scored) {
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
    }

    // No score yet (no result at all, or one missing too much to rank) —
    // still surface whatever pace/activity values were captured, so a
    // partially-read bulk import isn't invisible in the one export staff
    // actually rely on as a safety net.
    const partial = results[team.bib]
    return [
      team.bib,
      csvField(team.name),
      partial?.p1_sec ?? '',
      partial?.p2_sec ?? '',
      partial?.p3_sec ?? '',
      partial?.act_sec ?? '',
      '',
      '',
    ].join(',')
  })

  return [HEADER, ...rows].join('\n') + '\n'
}
