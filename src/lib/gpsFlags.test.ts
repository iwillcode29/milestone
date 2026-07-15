import { describe, expect, it } from 'vitest'
import { computeGpsFlags } from './gpsFlags'
import type { Result } from './types'

function makeResult(overrides: Partial<Result>): Result {
  return {
    bib: '001',
    name: 'Test',
    p1_sec: 500,
    p2_sec: 670,
    p3_sec: 640,
    act_sec: 2800,
    recorded_at: 1,
    ...overrides,
  }
}

describe('computeGpsFlags', () => {
  it('flags no one when every team is within tolerance of the median', () => {
    const results = [
      makeResult({ bib: '001', d1_km: 1.5 }),
      makeResult({ bib: '002', d1_km: 1.52 }),
      makeResult({ bib: '003', d1_km: 1.48 }),
    ]

    expect(computeGpsFlags(results, 10)).toEqual(new Set())
  })

  it('flags a team whose distance is more than tolerance away from the median', () => {
    const results = [
      makeResult({ bib: '001', d1_km: 1.5 }),
      makeResult({ bib: '002', d1_km: 1.5 }),
      makeResult({ bib: '003', d1_km: 2.0 }), // >10% away from median 1.5
    ]

    expect(computeGpsFlags(results, 10)).toEqual(new Set(['003']))
  })

  it('checks all three distance segments independently', () => {
    const results = [
      makeResult({ bib: '001', d1_km: 1.5, d2_km: 1.2, d3_km: 1.3 }),
      makeResult({ bib: '002', d1_km: 1.5, d2_km: 1.2, d3_km: 1.3 }),
      makeResult({ bib: '003', d1_km: 1.5, d2_km: 1.2, d3_km: 2.0 }),
    ]

    expect(computeGpsFlags(results, 10)).toEqual(new Set(['003']))
  })

  it('does not flag anyone when distances are missing', () => {
    const results = [makeResult({ bib: '001' }), makeResult({ bib: '002' })]

    expect(computeGpsFlags(results, 10)).toEqual(new Set())
  })
})
