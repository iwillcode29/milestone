import { describe, expect, it } from 'vitest'
import { resultsToCsv } from './csv'
import type { Config, Result, Team } from './types'

const config: Config = {
  target_p1_sec: 503,
  target_p2_sec: 675,
  target_p3_sec: 645,
  target_act_sec: 2805,
  weight_pace: 1.0,
  weight_act: 0.2,
  gps_tolerance_pct: 10,
}

const teams: Team[] = [
  { bib: '001', name: 'ขาแรงกาแล' },
  { bib: '002', name: 'ทีม 002' },
]

describe('resultsToCsv', () => {
  it('emits a header row and one row per team, ranked teams first', () => {
    const results: Record<string, Result> = {
      '001': {
        bib: '001',
        name: 'ขาแรงกาแล',
        p1_sec: 511,
        p2_sec: 698,
        p3_sec: 643,
        act_sec: 2847,
        recorded_at: 1000,
      },
    }

    const csv = resultsToCsv(teams, results, config)
    const lines = csv.trim().split('\n')

    expect(lines[0]).toBe('bib,name,p1_sec,p2_sec,p3_sec,act_sec,total_score,rank')
    expect(lines[1]).toBe('001,ขาแรงกาแล,511,698,643,2847,41.4,1')
    expect(lines[2]).toBe('002,ทีม 002,,,,,,')
  })

  it('quotes names containing a comma', () => {
    const csv = resultsToCsv([{ bib: '001', name: 'Team, Inc' }], {}, config)
    expect(csv.trim().split('\n')[1]).toBe('001,"Team, Inc",,,,,,')
  })
})
