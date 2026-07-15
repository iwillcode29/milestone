import { describe, expect, it } from 'vitest'
import {
  isActivityInconsistentWithPaces,
  isActivityOutOfRange,
  isFarFromTarget,
  isPaceOutOfRange,
} from './validate'

describe('isPaceOutOfRange', () => {
  it('is false within 4:00-25:00', () => {
    expect(isPaceOutOfRange(240)).toBe(false)
    expect(isPaceOutOfRange(1500)).toBe(false)
    expect(isPaceOutOfRange(503)).toBe(false)
  })

  it('is true outside 4:00-25:00', () => {
    expect(isPaceOutOfRange(239)).toBe(true)
    expect(isPaceOutOfRange(1501)).toBe(true)
  })
})

describe('isActivityOutOfRange', () => {
  it('is false within 25:00-90:00', () => {
    expect(isActivityOutOfRange(1500)).toBe(false)
    expect(isActivityOutOfRange(5400)).toBe(false)
  })

  it('is true outside 25:00-90:00', () => {
    expect(isActivityOutOfRange(1499)).toBe(true)
    expect(isActivityOutOfRange(5401)).toBe(true)
  })
})

describe('isFarFromTarget', () => {
  it('warns when deviation exceeds 90 seconds', () => {
    expect(isFarFromTarget(503 + 91, 503)).toBe(true)
    expect(isFarFromTarget(503 + 90, 503)).toBe(false)
  })
})

describe('isActivityInconsistentWithPaces', () => {
  it('skips the check when any distance is missing', () => {
    expect(
      isActivityInconsistentWithPaces({
        p1_sec: 500,
        p2_sec: 670,
        p3_sec: 640,
        act_sec: 2800,
      }),
    ).toBe(false)
  })

  it('is false when activity time roughly matches sum of pace*distance', () => {
    expect(
      isActivityInconsistentWithPaces({
        p1_sec: 500,
        p2_sec: 670,
        p3_sec: 640,
        act_sec: 500 * 1.5 + 670 * 1.2 + 640 * 1.3,
        d1_km: 1.5,
        d2_km: 1.2,
        d3_km: 1.3,
      }),
    ).toBe(false)
  })

  it('is true when activity time is far off from the expected total', () => {
    const expected = 500 * 1.5 + 670 * 1.2 + 640 * 1.3
    expect(
      isActivityInconsistentWithPaces({
        p1_sec: 500,
        p2_sec: 670,
        p3_sec: 640,
        act_sec: expected * 2,
        d1_km: 1.5,
        d2_km: 1.2,
        d3_km: 1.3,
      }),
    ).toBe(true)
  })
})
