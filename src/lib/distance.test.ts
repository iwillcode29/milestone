import { describe, expect, it } from 'vitest'
import { formatDistance, toDistanceKm } from './distance'

describe('formatDistance', () => {
  it('inserts a decimal point 2 digits from the right', () => {
    expect(formatDistance('152')).toBe('1.52')
    expect(formatDistance('52')).toBe('0.52')
    expect(formatDistance('')).toBe('')
  })
})

describe('toDistanceKm', () => {
  it('converts digit-fill into a km number', () => {
    expect(toDistanceKm('152')).toBe(1.52)
  })

  it('returns undefined for empty input, since distance entry is skippable', () => {
    expect(toDistanceKm('')).toBeUndefined()
  })
})
