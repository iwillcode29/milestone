import { clear } from 'idb-keyval'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AUTO_BACKUP_INTERVAL,
  EXPORT_WARN_THRESHOLD,
  getBackupState,
  maybeAutoBackup,
  recordExport,
  unexportedCount,
} from './backup'
import * as download from './download'
import type { Result } from './types'

function makeResults(count: number): Record<string, Result> {
  const results: Record<string, Result> = {}
  for (let i = 0; i < count; i++) {
    const bib = String(i + 1).padStart(3, '0')
    results[bib] = {
      bib,
      name: '',
      p1_sec: 503,
      p2_sec: 675,
      p3_sec: 645,
      act_sec: 2805,
      recorded_at: i,
    }
  }
  return results
}

beforeEach(async () => {
  await clear()
  vi.restoreAllMocks()
})

describe('maybeAutoBackup', () => {
  it('downloads a JSON snapshot once the count reaches the backup interval', async () => {
    const triggerDownload = vi.spyOn(download, 'triggerDownload').mockImplementation(() => {})

    await maybeAutoBackup(makeResults(AUTO_BACKUP_INTERVAL))

    expect(triggerDownload).toHaveBeenCalledOnce()
    const [filename, , mime] = triggerDownload.mock.calls[0]
    expect(filename).toMatch(/\.json$/)
    expect(mime).toBe('application/json')
  })

  it('does not download before the interval is reached', async () => {
    const triggerDownload = vi.spyOn(download, 'triggerDownload').mockImplementation(() => {})

    await maybeAutoBackup(makeResults(AUTO_BACKUP_INTERVAL - 1))

    expect(triggerDownload).not.toHaveBeenCalled()
  })

  it('does not repeat the backup for the same count on a second call', async () => {
    const triggerDownload = vi.spyOn(download, 'triggerDownload').mockImplementation(() => {})

    await maybeAutoBackup(makeResults(AUTO_BACKUP_INTERVAL))
    await maybeAutoBackup(makeResults(AUTO_BACKUP_INTERVAL))

    expect(triggerDownload).toHaveBeenCalledOnce()
  })
})

describe('unexportedCount / recordExport', () => {
  it('counts every result as unexported before any export has happened', async () => {
    const state = await getBackupState()
    expect(unexportedCount(makeResults(3), state.lastExportCount)).toBe(3)
  })

  it('drops to zero right after an export is recorded', async () => {
    await recordExport(7)
    const state = await getBackupState()
    expect(unexportedCount(makeResults(7), state.lastExportCount)).toBe(0)
  })

  it('exposes the warn threshold used for the banner', () => {
    expect(EXPORT_WARN_THRESHOLD).toBe(10)
  })
})
