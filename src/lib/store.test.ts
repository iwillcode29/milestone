import { clear } from 'idb-keyval'
import { beforeEach, describe, expect, it } from 'vitest'
import { getConfig, getResults, getTeams, saveConfig, saveResult, saveTeams } from './store'

beforeEach(async () => {
  await clear()
})

describe('getConfig', () => {
  it('returns the spec default targets/weights on first call', async () => {
    const config = await getConfig()
    expect(config).toEqual({
      target_p1_sec: 503,
      target_p2_sec: 675,
      target_p3_sec: 645,
      target_act_sec: 2805,
      weight_pace: 1.0,
      weight_act: 0.2,
      gps_tolerance_pct: 10,
    })
  })
})

describe('saveConfig', () => {
  it('persists changes so a later getConfig sees them', async () => {
    const config = await getConfig()
    await saveConfig({ ...config, weight_act: 0.5 })

    expect((await getConfig()).weight_act).toBe(0.5)
  })
})

describe('getTeams', () => {
  it('seeds 25 zero-padded placeholder teams on first call', async () => {
    const teams = await getTeams()
    expect(teams).toHaveLength(25)
    expect(teams[0]).toEqual({ bib: '001', name: expect.any(String) })
    expect(teams[24].bib).toBe('025')
  })
})

describe('saveTeams', () => {
  it('overwrites the team list, and getTeams no longer re-seeds', async () => {
    await saveTeams([{ bib: '001', name: 'ขาแรงกาแล' }])

    const teams = await getTeams()
    expect(teams).toEqual([{ bib: '001', name: 'ขาแรงกาแล' }])
  })
})

describe('getResults', () => {
  it('is an empty record on first call', async () => {
    expect(await getResults()).toEqual({})
  })
})

describe('saveResult', () => {
  it('stores a result keyed by bib, mergeable with the existing record', async () => {
    await saveResult({
      bib: '001',
      name: 'ขาแรงกาแล',
      p1_sec: 511,
      p2_sec: 698,
      p3_sec: 643,
      act_sec: 2847,
      recorded_at: 1000,
    })

    const results = await getResults()
    expect(Object.keys(results)).toEqual(['001'])
    expect(results['001'].act_sec).toBe(2847)
  })
})
