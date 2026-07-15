import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { clear } from 'idb-keyval'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Header } from './Header'
import * as store from '../lib/store'
import * as download from '../lib/download'
import type { Result } from '../lib/types'

function makeResults(count: number): Record<string, Result> {
  const results: Record<string, Result> = {}
  for (let i = 0; i < count; i++) {
    const bib = String(i + 1).padStart(3, '0')
    results[bib] = {
      bib,
      name: '',
      p1_sec: 503,
      p2_sec: 675,
      p3_sec: 645,
      act_sec: 2805,
      recorded_at: i,
    }
  }
  return results
}

describe('Header', () => {
  beforeEach(async () => {
    await clear()
    vi.restoreAllMocks()
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

  it('shows a warning banner once more than 10 results are unexported', async () => {
    vi.spyOn(store, 'getResults').mockResolvedValue(makeResults(11))

    render(<Header title="รายชื่อทีม" />)

    expect(await screen.findByText(/ยังไม่ได้สำรอง 11 รายการ/)).toBeInTheDocument()
  })

  it('hides the banner again right after exporting', async () => {
    vi.spyOn(store, 'getResults').mockResolvedValue(makeResults(11))
    vi.spyOn(download, 'triggerDownload').mockImplementation(() => {})
    const user = userEvent.setup()

    render(<Header title="รายชื่อทีม" />)
    await screen.findByText(/ยังไม่ได้สำรอง 11 รายการ/)

    await user.click(screen.getByRole('button', { name: /export csv/i }))

    await waitFor(() => expect(screen.queryByText(/ยังไม่ได้สำรอง/)).not.toBeInTheDocument())
  })
})
