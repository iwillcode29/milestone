import type { CompleteResult, Config, Result, Scored, ScoreableResult } from './types'

export const dev = (actual: number, target: number) => Math.abs(actual - target)

const REQUIRED_FIELDS = ['p1_sec', 'd1_km', 'p2_sec', 'd2_km', 'p3_sec', 'd3_km', 'act_sec'] as const

const FIELD_LABELS: Record<(typeof REQUIRED_FIELDS)[number], string> = {
  p1_sec: 'Road เพซ',
  d1_km: 'Road ระยะ',
  p2_sec: 'Trail เพซ',
  d2_km: 'Trail ระยะ',
  p3_sec: 'Hilly เพซ',
  d3_km: 'Hilly ระยะ',
  act_sec: 'Activity',
}

export function isScoreable(r: Result): r is ScoreableResult {
  return r.p1_sec != null && r.p2_sec != null && r.p3_sec != null && r.act_sec != null
}

export function isComplete(r: Result): r is CompleteResult {
  return isScoreable(r) && r.d1_km != null && r.d2_km != null && r.d3_km != null
}

export function missingFieldLabels(r: Result): string[] {
  return REQUIRED_FIELDS.filter((key) => r[key] == null).map((key) => FIELD_LABELS[key])
}

export function scoreOf(r: ScoreableResult, c: Config): Scored {
  const d1 = dev(r.p1_sec, c.target_p1_sec)
  const d2 = dev(r.p2_sec, c.target_p2_sec)
  const d3 = dev(r.p3_sec, c.target_p3_sec)
  const da = dev(r.act_sec, c.target_act_sec)
  return {
    ...r,
    d1,
    d2,
    d3,
    da,
    maxDev: Math.max(d1, d2, d3),
    total: (d1 + d2 + d3) * c.weight_pace + da * c.weight_act,
  }
}

// คะแนนน้อยชนะ
// ตัดสินเสมอ: 1) ช่วงที่พลาดมากสุด พลาดน้อยกว่าชนะ
//             2) ใกล้เป้า Trail มากกว่าชนะ
//             3) เข้าเส้นก่อนชนะ
export const rank = (rs: Scored[]) =>
  [...rs].sort(
    (a, b) => a.total - b.total || a.maxDev - b.maxDev || a.d2 - b.d2 || a.recorded_at - b.recorded_at,
  )
