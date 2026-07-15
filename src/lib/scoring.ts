import type { Config, Result, Scored } from './types'

export const dev = (actual: number, target: number) => Math.abs(actual - target)

export function scoreOf(r: Result, c: Config): Scored {
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
