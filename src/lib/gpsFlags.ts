import type { Result } from './types'

const DIST_KEYS = ['d1_km', 'd2_km', 'd3_km'] as const

function median(nums: number[]): number {
  const sorted = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

export function computeGpsFlags(results: Result[], tolerancePct: number): Set<string> {
  const flagged = new Set<string>()

  for (const key of DIST_KEYS) {
    const withDistance = results.filter((r) => r[key] != null)
    if (withDistance.length < 2) continue

    const m = median(withDistance.map((r) => r[key] as number))
    if (m === 0) continue

    for (const r of withDistance) {
      const pctOff = (Math.abs((r[key] as number) - m) / m) * 100
      if (pctOff > tolerancePct) flagged.add(r.bib)
    }
  }

  return flagged
}
