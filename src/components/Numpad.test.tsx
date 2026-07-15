import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Numpad, formatDigits, toSeconds } from './Numpad'

describe('formatDigits', () => {
  it('shows 0:00 for empty input', () => {
    expect(formatDigits('')).toBe('0:00')
  })

  it('fills seconds from the right like a stopwatch', () => {
    expect(formatDigits('8')).toBe('0:08')
    expect(formatDigits('82')).toBe('0:82')
    expect(formatDigits('823')).toBe('8:23')
  })
})

describe('toSeconds', () => {
  it('converts digit-fill display into total seconds', () => {
    expect(toSeconds('823')).toBe(8 * 60 + 23)
    expect(toSeconds('')).toBe(0)
  })
})

describe('Numpad', () => {
  it('appends a pressed digit to the value via onChange', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Numpad value="8" onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: '2' }))

    expect(onChange).toHaveBeenCalledWith('82')
  })

  it('removes the last digit on backspace', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Numpad value="82" onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: '⌫' }))

    expect(onChange).toHaveBeenCalledWith('8')
  })

  it('ignores digit presses once at the max length', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Numpad value="2500" onChange={onChange} maxDigits={4} />)

    await user.click(screen.getByRole('button', { name: '1' }))

    expect(onChange).not.toHaveBeenCalled()
  })

  it('calls onNext when the next button is pressed', async () => {
    const onNext = vi.fn()
    const user = userEvent.setup()
    render(<Numpad value="823" onChange={vi.fn()} onNext={onNext} />)

    await user.click(screen.getByRole('button', { name: '→' }))

    expect(onNext).toHaveBeenCalled()
  })
})
