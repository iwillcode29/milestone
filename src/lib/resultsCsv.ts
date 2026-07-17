import type { Result, Team } from './types'

function parseLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      fields.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  fields.push(current)
  return fields
}

// Header-driven so it accepts the app's own export
// (bib,name,p1_sec,p2_sec,p3_sec,act_sec,total_score,rank) as well as an
// extended sheet that also carries d1_km/d2_km/d3_km. Unknown columns are
// ignored; missing readings stay undefined.
export function parseResultsCsv(csv: string): { teams: Team[]; results: Record<string, Result> } {
  const lines = csv
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
  if (lines.length === 0) return { teams: [], results: {} }

  const header = parseLine(lines[0]).map((h) => h.trim().toLowerCase())
  const col = (name: string) => header.indexOf(name)
  const iBib = col('bib')
  const iName = col('name')
  const iNum = {
    p1_sec: col('p1_sec'),
    p2_sec: col('p2_sec'),
    p3_sec: col('p3_sec'),
    act_sec: col('act_sec'),
    d1_km: col('d1_km'),
    d2_km: col('d2_km'),
    d3_km: col('d3_km'),
  } as const

  const teams: Team[] = []
  const results: Record<string, Result> = {}

  lines.slice(1).forEach((line, i) => {
    const f = parseLine(line)
    const bib = (iBib >= 0 ? f[iBib] : f[0])?.trim() ?? ''
    if (!bib) return
    const name = (iName >= 0 ? f[iName] : '')?.trim() ?? ''
    teams.push({ bib, name })

    const num = (idx: number): number | undefined => {
      if (idx < 0) return undefined
      const raw = (f[idx] ?? '').trim()
      if (raw === '') return undefined
      const n = Number(raw)
      return Number.isFinite(n) ? n : undefined
    }

    const result: Result = {
      bib,
      name,
      p1_sec: num(iNum.p1_sec),
      p2_sec: num(iNum.p2_sec),
      p3_sec: num(iNum.p3_sec),
      act_sec: num(iNum.act_sec),
      d1_km: num(iNum.d1_km),
      d2_km: num(iNum.d2_km),
      d3_km: num(iNum.d3_km),
      recorded_at: i + 1,
    }

    const hasReading = [
      result.p1_sec,
      result.p2_sec,
      result.p3_sec,
      result.act_sec,
      result.d1_km,
      result.d2_km,
      result.d3_km,
    ].some((v) => v != null)
    if (hasReading) results[bib] = result
  })

  return { teams, results }
}
