import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Header } from './Header'
import * as store from '../lib/store'
import * as download from '../lib/download'

describe('Header', () => {
  beforeEach(() => {
    vi.spyOn(store, 'getTeams').mockResolvedValue([{ bib: '001', name: 'ขาแรงกาแล' }])
    vi.spyOn(store, 'getResults').mockResolvedValue({})
    vi.spyOn(store, 'getConfig').mockResolvedValue({
      target_p1_sec: 503,
      target_p2_sec: 675,
      target_p3_sec: 645,
      target_act_sec: 2805,
      weight_pace: 1.0,
      weight_act: 0.2,
      gps_tolerance_pct: 10,
    })
  })

  it('shows the given title', () => {
    render(<Header title="รายชื่อทีม" />)
    expect(screen.getByText('รายชื่อทีม')).toBeInTheDocument()
  })

  it('exports a CSV built from the current store state when clicked', async () => {
    const triggerDownload = vi.spyOn(download, 'triggerDownload').mockImplementation(() => {})
    const user = userEvent.setup()

    render(<Header title="รายชื่อทีม" />)
    await user.click(screen.getByRole('button', { name: /export csv/i }))

    expect(triggerDownload).toHaveBeenCalledOnce()
    const [filename, content, mime] = triggerDownload.mock.calls[0]
    expect(filename).toMatch(/\.csv$/)
    expect(content).toContain('001,ขาแรงกาแล')
    expect(mime).toBe('text/csv')
  })
})
