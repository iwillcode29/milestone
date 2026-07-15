import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Settings } from './Settings'
import * as store from '../lib/store'
import * as wipe from '../lib/wipe'
import type { Config } from '../lib/types'

function renderSettings() {
  return render(
    <MemoryRouter>
      <Settings />
    </MemoryRouter>,
  )
}

const config: Config = {
  target_p1_sec: 503,
  target_p2_sec: 675,
  target_p3_sec: 645,
  target_act_sec: 2805,
  weight_pace: 1.0,
  weight_act: 0.2,
  gps_tolerance_pct: 10,
}

describe('Settings', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(store, 'getConfig').mockResolvedValue(config)
    vi.spyOn(store, 'getTeams').mockResolvedValue([])
    vi.spyOn(store, 'getResults').mockResolvedValue({})
  })

  it('shows the current weight_act value', async () => {
    renderSettings()
    expect(await screen.findByLabelText('weight_act')).toHaveValue(0.2)
  })

  it('saves a changed weight through the store', async () => {
    const saveConfig = vi.spyOn(store, 'saveConfig').mockResolvedValue(undefined)
    renderSettings()

    const input = await screen.findByLabelText('weight_act')
    fireEvent.change(input, { target: { value: '0.5' } })

    expect(saveConfig).toHaveBeenLastCalledWith(expect.objectContaining({ weight_act: 0.5 }))
  })

  it('imports teams from an uploaded CSV file', async () => {
    const saveTeams = vi.spyOn(store, 'saveTeams').mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderSettings()
    await screen.findByLabelText('weight_act')

    const file = new File(['bib,name\n001,ขาแรงกาแล\n'], 'teams.csv', { type: 'text/csv' })
    await user.upload(screen.getByLabelText('นำเข้าทีมจาก CSV'), file)

    expect(saveTeams).toHaveBeenCalledWith([{ bib: '001', name: 'ขาแรงกาแล' }])
    expect(await screen.findByText(/นำเข้า 1 ทีมแล้ว/)).toBeInTheDocument()
  })

  it('only enables wipe after typing the confirm word', async () => {
    const wipeAllData = vi.spyOn(wipe, 'wipeAllData').mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderSettings()
    await screen.findByLabelText('weight_act')

    const wipeButton = screen.getByRole('button', { name: 'ล้างข้อมูล' })
    expect(wipeButton).toBeDisabled()

    await user.type(screen.getByLabelText('พิมพ์ "ลบทั้งหมด" เพื่อยืนยัน'), 'ลบทั้งหมด')
    expect(wipeButton).toBeEnabled()

    await user.click(wipeButton)
    expect(wipeAllData).toHaveBeenCalledOnce()
  })
})
