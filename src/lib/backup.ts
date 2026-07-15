import { get, set } from 'idb-keyval'
import { triggerDownload } from './download'
import type { Result } from './types'

export const AUTO_BACKUP_INTERVAL = 5
export const EXPORT_WARN_THRESHOLD = 10

type BackupState = { lastAutoBackupCount: number; lastExportCount: number }
const DEFAULT_STATE: BackupState = { lastAutoBackupCount: 0, lastExportCount: 0 }

export async function getBackupState(): Promise<BackupState> {
  return (await get<BackupState>('backupState')) ?? DEFAULT_STATE
}

const saveBackupState = (state: BackupState) => set('backupState', state)

export async function maybeAutoBackup(results: Record<string, Result>): Promise<void> {
  const count = Object.keys(results).length
  const state = await getBackupState()
  if (count > 0 && count - state.lastAutoBackupCount >= AUTO_BACKUP_INTERVAL) {
    triggerDownload(`milestones-backup-${count}.json`, JSON.stringify(results, null, 2), 'application/json')
    await saveBackupState({ ...state, lastAutoBackupCount: count })
  }
}

export async function recordExport(count: number): Promise<void> {
  const state = await getBackupState()
  await saveBackupState({ ...state, lastExportCount: count })
}

export function unexportedCount(results: Record<string, Result>, lastExportCount: number): number {
  return Object.keys(results).length - lastExportCount
}
