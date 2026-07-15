import { describe, expect, it } from 'vitest'
import { dev, rank, scoreOf } from './scoring'
import type { Config, Result } from './types'

const config: Config = {
  target_p1_sec: 503,
  target_p2_sec: 675,
  target_p3_sec: 645,
  target_act_sec: 2805,
  weight_pace: 1.0,
  weight_act: 0.2,
  gps_tolerance_pct: 10,
}

function makeResult(overrides: Partial<Result> = {}): Result {
  return {
    bib: '001',
    name: 'Test Team',
    p1_sec: 503,
    p2_sec: 675,
    p3_sec: 645,
    act_sec: 2805,
    recorded_at: 1000,
    ...overrides,
  }
}

describe('dev', () => {
  it('returns the absolute difference between actual and target', () => {
    expect(dev(511, 503)).toBe(8)
    expect(dev(495, 503)).toBe(8)
    expect(dev(503, 503)).toBe(0)
  })
})

describe('scoreOf', () => {
  it('computes per-segment deviations, maxDev, and weighted total', () => {
    const r = makeResult({ p1_sec: 511, p2_sec: 698, p3_sec: 643, act_sec: 2847 })
    const s = scoreOf(r, config)

    expect(s.d1).toBe(8)
    expect(s.d2).toBe(23)
    expect(s.d3).toBe(2)
    expect(s.da).toBe(42)
    expect(s.maxDev).toBe(23)
    expect(s.total).toBeCloseTo((8 + 23 + 2) * 1.0 + 42 * 0.2, 5)
  })

  it('is zero across the board for an exact-target result', () => {
    const s = scoreOf(makeResult(), config)
    expect(s).toMatchObject({ d1: 0, d2: 0, d3: 0, da: 0, maxDev: 0, total: 0 })
  })
})

describe('rank', () => {
  it('sorts ascending by total score (lower wins)', () => {
    const a = scoreOf(makeResult({ bib: 'A', p1_sec: 600 }), config)
    const b = scoreOf(makeResult({ bib: 'B', p1_sec: 520 }), config)

    const ranked = rank([a, b])

    expect(ranked.map((r) => r.bib)).toEqual(['B', 'A'])
  })

  it('breaks a total tie by the smaller maxDev', () => {
    // Same total (34), but A's worst segment is 20 vs B's worst is 30.
    const a = scoreOf(makeResult({ bib: 'A', p1_sec: 503 + 14, p2_sec: 675 + 20 }), config)
    const b = scoreOf(makeResult({ bib: 'B', p1_sec: 503 + 30, p2_sec: 675 + 4 }), config)

    expect(a.total).toBeCloseTo(b.total, 5)
    expect(rank([b, a]).map((r) => r.bib)).toEqual(['A', 'B'])
  })

  it('breaks a total+maxDev tie by closeness to the Trail (p2) target', () => {
    const a = scoreOf(
      makeResult({ bib: 'A', p1_sec: 503 + 10, p2_sec: 675 + 5, p3_sec: 645 + 5 }),
      config,
    )
    const b = scoreOf(
      makeResult({ bib: 'B', p1_sec: 503 + 5, p2_sec: 675 + 10, p3_sec: 645 + 5 }),
      config,
    )

    expect(a.total).toBeCloseTo(b.total, 5)
    expect(a.maxDev).toBe(b.maxDev)
    expect(rank([b, a]).map((r) => r.bib)).toEqual(['A', 'B'])
  })

  it('breaks a total+maxDev+d2 tie by earlier recorded_at', () => {
    const a = scoreOf(makeResult({ bib: 'A', recorded_at: 500 }), config)
    const b = scoreOf(makeResult({ bib: 'B', recorded_at: 1500 }), config)

    expect(rank([b, a]).map((r) => r.bib)).toEqual(['A', 'B'])
  })
})
