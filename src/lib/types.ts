export type Team = {
  bib: string
  name: string
}

export type Result = {
  bib: string
  name: string
  p1_sec: number
  p2_sec: number
  p3_sec: number
  act_sec: number
  d1_km?: number
  d2_km?: number
  d3_km?: number
  recorded_at: number
}

export type Config = {
  target_p1_sec: number
  target_p2_sec: number
  target_p3_sec: number
  target_act_sec: number
  weight_pace: number
  weight_act: number
  gps_tolerance_pct: number
}

export type Scored = Result & {
  d1: number
  d2: number
  d3: number
  da: number
  maxDev: number
  total: number
}
