import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmScreen } from './ConfirmScreen'
import { scoreOf } from '../lib/scoring'
import type { Config, ScoreableResult } from '../lib/types'

const config: Config = {
  target_p1_sec: 503,
  target_p2_sec: 675,
  target_p3_sec: 645,
  target_act_sec: 2805,
  weight_pace: 1.0,
  weight_act: 0.2,
  gps_tolerance_pct: 10,
}

const result: ScoreableResult = {
  bib: '001',
  name: 'ขาแรงกาแล',
  p1_sec: 511,
  p2_sec: 698,
  p3_sec: 643,
  act_sec: 2847,
  recorded_at: 1000,
}

const scored = scoreOf(result, config)

describe('ConfirmScreen', () => {
  it('shows each segment time, signed delta, and the total score', () => {
    render(<ConfirmScreen scored={scored} config={config} onEdit={vi.fn()} onSave={vi.fn()} saving={false} />)

    expect(screen.getByText('8:31')).toBeInTheDocument()
    expect(screen.getByText('+8 วิ')).toBeInTheDocument()
    expect(screen.getByText('11:38')).toBeInTheDocument()
    expect(screen.getByText('+23 วิ')).toBeInTheDocument()
    expect(screen.getByText('10:43')).toBeInTheDocument()
    expect(screen.getByText('−2 วิ')).toBeInTheDocument()
    expect(screen.getByText('47:27')).toBeInTheDocument()
    expect(screen.getByText('+42 วิ')).toBeInTheDocument()
    expect(screen.getByText('41.4')).toBeInTheDocument()
  })

  it('calls onEdit when แก้ไข is pressed', async () => {
    const onEdit = vi.fn()
    const user = userEvent.setup()
    render(<ConfirmScreen scored={scored} config={config} onEdit={onEdit} onSave={vi.fn()} saving={false} />)

    await user.click(screen.getByRole('button', { name: '✏️ แก้ไข' }))
    expect(onEdit).toHaveBeenCalledOnce()
  })

  it('calls onSave when บันทึก is pressed, and disables the button while saving', async () => {
    const onSave = vi.fn()
    const user = userEvent.setup()
    const { rerender } = render(
      <ConfirmScreen scored={scored} config={config} onEdit={vi.fn()} onSave={onSave} saving={false} />,
    )

    await user.click(screen.getByRole('button', { name: '💾 บันทึก' }))
    expect(onSave).toHaveBeenCalledOnce()

    rerender(<ConfirmScreen scored={scored} config={config} onEdit={vi.fn()} onSave={onSave} saving={true} />)
    expect(screen.getByRole('button', { name: '💾 บันทึก' })).toBeDisabled()
  })
})
