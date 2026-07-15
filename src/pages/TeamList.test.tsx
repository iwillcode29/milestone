import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TeamList } from './TeamList'
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
  { bib: '001', name: 'ขาแรงกาแล' },
  { bib: '010', name: 'ทีม 010' },
  { bib: '025', name: 'ทีม 025' },
]

function mockStore(results: Record<string, Result>) {
  vi.spyOn(store, 'getTeams').mockResolvedValue(teams)
  vi.spyOn(store, 'getResults').mockResolvedValue(results)
  vi.spyOn(store, 'getConfig').mockResolvedValue(config)
}

function renderTeamList() {
  return render(
    <MemoryRouter>
      <TeamList />
    </MemoryRouter>,
  )
}

describe('TeamList', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('shows a waiting chip for every team when nothing is recorded yet', async () => {
    mockStore({})
    renderTeamList()

    expect(await screen.findAllByText('⏳ รอ')).toHaveLength(3)
  })

  it('shows a recorded chip for teams with a saved result', async () => {
    mockStore({
      '001': {
        bib: '001',
        name: 'ขาแรงกาแล',
        p1_sec: 511,
        p2_sec: 698,
        p3_sec: 643,
        act_sec: 2847,
        recorded_at: 1000,
      },
    })
    renderTeamList()

    await waitFor(() => expect(screen.getByText('✅ บันทึกแล้ว')).toBeInTheDocument())
    expect(screen.getAllByText('⏳ รอ')).toHaveLength(2)
  })

  it('matches bib search by leading digits, ignoring zero-padding', async () => {
    mockStore({})
    const user = userEvent.setup()
    renderTeamList()
    await screen.findAllByText('⏳ รอ')

    await user.type(screen.getByRole('searchbox'), '1')

    expect(screen.getByText('ขาแรงกาแล')).toBeInTheDocument()
    expect(screen.getByText('ทีม 010')).toBeInTheDocument()
    expect(screen.queryByText('ทีม 025')).not.toBeInTheDocument()
  })
})
