const PACE_MIN_SEC = 240 // 4:00
const PACE_MAX_SEC = 1500 // 25:00
const ACT_MIN_SEC = 1500 // 25:00
const ACT_MAX_SEC = 5400 // 90:00
const TARGET_DEVIATION_WARN_SEC = 90
const ACTIVITY_INCONSISTENCY_TOLERANCE_PCT = 20

export function isPaceOutOfRange(sec: number): boolean {
  return sec < PACE_MIN_SEC || sec > PACE_MAX_SEC
}

export function isActivityOutOfRange(sec: number): boolean {
  return sec < ACT_MIN_SEC || sec > ACT_MAX_SEC
}

export function isFarFromTarget(actual: number, target: number): boolean {
  return Math.abs(actual - target) > TARGET_DEVIATION_WARN_SEC
}

type PaceInputs = {
  p1_sec: number
  p2_sec: number
  p3_sec: number
  act_sec: number
  d1_km?: number
  d2_km?: number
  d3_km?: number
}

export function isActivityInconsistentWithPaces(r: PaceInputs): boolean {
  if (r.d1_km == null || r.d2_km == null || r.d3_km == null) return false

  const expected = r.p1_sec * r.d1_km + r.p2_sec * r.d2_km + r.p3_sec * r.d3_km
  if (expected === 0) return false

  const pctOff = (Math.abs(r.act_sec - expected) / expected) * 100
  return pctOff > ACTIVITY_INCONSISTENCY_TOLERANCE_PCT
}
