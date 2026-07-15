import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TeamCountSetup } from './TeamCountSetup'

describe('TeamCountSetup', () => {
  it('submits the entered team count', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<TeamCountSetup onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText('จำนวนทีม'), '25')
    await user.click(screen.getByRole('button', { name: '🚀 เริ่มใช้งาน' }))

    expect(onSubmit).toHaveBeenCalledWith(25)
  })

  it('disables submit until a positive whole number is entered', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<TeamCountSetup onSubmit={onSubmit} />)

    const button = screen.getByRole('button', { name: '🚀 เริ่มใช้งาน' })
    expect(button).toBeDisabled()

    await user.type(screen.getByLabelText('จำนวนทีม'), '0')
    expect(button).toBeDisabled()

    await user.clear(screen.getByLabelText('จำนวนทีม'))
    await user.type(screen.getByLabelText('จำนวนทีม'), '5')
    expect(button).toBeEnabled()
  })
})
