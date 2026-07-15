import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Leaderboard } from './Leaderboard'
import * as store from '../lib/store'
import type { Config, Result, Team } from '../lib/types'

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
  { bib: '001', name: 'ทีมช้า' },
  { bib: '002', name: 'ทีมเร็ว' },
]

function makeResult(bib: string, overrides: Partial<Result>): Result {
  return {
    bib,
    name: '',
    p1_sec: 503,
    p2_sec: 675,
    p3_sec: 645,
    act_sec: 2805,
    recorded_at: 1,
    ...overrides,
  }
}

describe('Leaderboard', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(store, 'getTeams').mockResolvedValue(teams)
    vi.spyOn(store, 'getConfig').mockResolvedValue(config)
  })

  it('ranks recorded teams best score first, skipping teams with no result', async () => {
    vi.spyOn(store, 'getResults').mockResolvedValue({
      '001': makeResult('001', { p1_sec: 600 }), // far off target, worse score
      '002': makeResult('002', { p1_sec: 505 }), // close to target, better score
    })

    render(
      <MemoryRouter>
        <Leaderboard />
      </MemoryRouter>,
    )

    const rows = await screen.findAllByRole('listitem')
    expect(rows).toHaveLength(2)
    expect(within(rows[0]).getByText('ทีมเร็ว')).toBeInTheDocument()
    expect(within(rows[1]).getByText('ทีมช้า')).toBeInTheDocument()
  })
})
