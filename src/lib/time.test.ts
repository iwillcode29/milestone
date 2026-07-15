import { describe, expect, it } from 'vitest'
import { formatSeconds, formatSignedSeconds } from './time'

describe('formatSeconds', () => {
  it('formats total seconds as m:ss', () => {
    expect(formatSeconds(511)).toBe('8:31')
    expect(formatSeconds(2847)).toBe('47:27')
    expect(formatSeconds(5)).toBe('0:05')
  })
})

describe('formatSignedSeconds', () => {
  it('prefixes a sign and a Thai unit suffix', () => {
    expect(formatSignedSeconds(8)).toBe('+8 วิ')
    expect(formatSignedSeconds(-2)).toBe('−2 วิ')
    expect(formatSignedSeconds(0)).toBe('+0 วิ')
  })
})
