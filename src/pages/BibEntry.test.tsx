import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BibEntry } from './BibEntry'
import * as backup from '../lib/backup'
import * as store from '../lib/store'
import type { Config } from '../lib/types'

const config: Config = {
  target_p1_sec: 503,
  target_p2_sec: 675,
  target_p3_sec: 645,
  target_act_sec: 2805,
  weight_pace: 1.0,
  weight_act: 0.2,
  gps_tolerance_pct: 10,
}

function renderBibEntry() {
  return render(
    <MemoryRouter initialEntries={['/bib/001']}>
      <Routes>
        <Route path="/bib/:bib" element={<BibEntry />} />
        <Route path="/" element={<div>Home</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

async function typeDigits(user: ReturnType<typeof userEvent.setup>, digits: string) {
  for (const d of digits) {
    await user.click(screen.getByRole('button', { name: d }))
  }
}

describe('BibEntry', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(store, 'getTeams').mockResolvedValue([{ bib: '001', name: 'ขาแรงกาแล' }])
    vi.spyOn(store, 'getConfig').mockResolvedValue(config)
    vi.spyOn(store, 'getResults').mockResolvedValue({})
    vi.spyOn(store, 'saveResult').mockResolvedValue(undefined)
  })

  it('shows the bib and team name', async () => {
    renderBibEntry()
    expect(await screen.findByText('001 ขาแรงกาแล')).toBeInTheDocument()
  })

  it('fills the tapped field from the numpad, right-to-left like a stopwatch', async () => {
    const user = userEvent.setup()
    renderBibEntry()
    await screen.findByText('001 ขาแรงกาแล')

    await user.click(screen.getByTestId('field-p1'))
    await typeDigits(user, '823')

    expect(screen.getByTestId('field-p1')).toHaveTextContent('8:23')
  })

  it('blocks proceeding to review when a pace is outside 4:00-25:00', async () => {
    const user = userEvent.setup()
    renderBibEntry()
    await screen.findByText('001 ขาแรงกาแล')

    await user.click(screen.getByTestId('field-p1'))
    await typeDigits(user, '100') // 1:00 -> 60s, below the 240s floor

    await user.click(screen.getByRole('button', { name: 'ตรวจทาน' }))

    expect(await screen.findByText(/4:00-25:00/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'บันทึก' })).not.toBeInTheDocument()
  })

  it('warns but allows proceeding when a value is far from target, after confirming', async () => {
    const user = userEvent.setup()
    renderBibEntry()
    await screen.findByText('001 ขาแรงกาแล')

    // p1 target is 503s (8:23); 900s (15:00) is > 90s off -> warn, not hard-block
    await user.click(screen.getByTestId('field-p1'))
    await typeDigits(user, '1500')
    await user.click(screen.getByTestId('field-p2'))
    await typeDigits(user, '1115')
    await user.click(screen.getByTestId('field-p3'))
    await typeDigits(user, '1045')
    await user.click(screen.getByTestId('field-act'))
    await typeDigits(user, '4645')

    await user.click(screen.getByRole('button', { name: 'ตรวจทาน' }))

    expect(await screen.findByText(/ห่างเป้ามาก/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'ยืนยัน' }))

    expect(await screen.findByRole('button', { name: 'บันทึก' })).toBeInTheDocument()
  })

  it('saves the result and returns to the team list on บันทึก', async () => {
    const user = userEvent.setup()
    const saveResult = vi.spyOn(store, 'saveResult').mockResolvedValue(undefined)
    renderBibEntry()
    await screen.findByText('001 ขาแรงกาแล')

    await user.click(screen.getByTestId('field-p1'))
    await typeDigits(user, '823')
    await user.click(screen.getByTestId('field-p2'))
    await typeDigits(user, '1115')
    await user.click(screen.getByTestId('field-p3'))
    await typeDigits(user, '1045')
    await user.click(screen.getByTestId('field-act'))
    await typeDigits(user, '4645')

    await user.click(screen.getByRole('button', { name: 'ตรวจทาน' }))
    await user.click(await screen.findByRole('button', { name: 'บันทึก' }))

    expect(saveResult).toHaveBeenCalledWith(expect.objectContaining({ bib: '001', p1_sec: 8 * 60 + 23 }))
    expect(await screen.findByText('Home')).toBeInTheDocument()
  })

  it('runs the auto-backup check after saving', async () => {
    const user = userEvent.setup()
    const maybeAutoBackup = vi.spyOn(backup, 'maybeAutoBackup').mockResolvedValue(undefined)
    renderBibEntry()
    await screen.findByText('001 ขาแรงกาแล')

    await user.click(screen.getByTestId('field-p1'))
    await typeDigits(user, '823')
    await user.click(screen.getByTestId('field-p2'))
    await typeDigits(user, '1115')
    await user.click(screen.getByTestId('field-p3'))
    await typeDigits(user, '1045')
    await user.click(screen.getByTestId('field-act'))
    await typeDigits(user, '4645')

    await user.click(screen.getByRole('button', { name: 'ตรวจทาน' }))
    await user.click(await screen.findByRole('button', { name: 'บันทึก' }))

    await screen.findByText('Home')
    expect(maybeAutoBackup).toHaveBeenCalledOnce()
  })
})
