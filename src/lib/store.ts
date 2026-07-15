import { get, set } from 'idb-keyval'
import type { Config, Result, Team } from './types'

const DEFAULT_CONFIG: Config = {
  target_p1_sec: 503,
  target_p2_sec: 675,
  target_p3_sec: 645,
  target_act_sec: 2805,
  weight_pace: 1.0,
  weight_act: 0.2,
  gps_tolerance_pct: 10,
}

export async function getTeams(): Promise<Team[]> {
  return (await get<Team[]>('teams')) ?? []
}

export const saveTeams = (teams: Team[]) => set('teams', teams)

export async function getResults(): Promise<Record<string, Result>> {
  return (await get<Record<string, Result>>('results')) ?? {}
}

export async function saveResult(result: Result): Promise<void> {
  const results = await getResults()
  results[result.bib] = result
  await set('results', results)
}

export async function getConfig(): Promise<Config> {
  return (await get<Config>('config')) ?? DEFAULT_CONFIG
}

export const saveConfig = (config: Config) => set('config', config)
