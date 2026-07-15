import { useEffect, useState } from 'react'
import { EXPORT_WARN_THRESHOLD, getBackupState, recordExport, unexportedCount } from '../lib/backup'
import { resultsToCsv } from '../lib/csv'
import { triggerDownload } from '../lib/download'
import { getConfig, getResults, getTeams } from '../lib/store'

export function Header({ title }: { title: string }) {
  const [unexported, setUnexported] = useState(0)

  useEffect(() => {
    refreshUnexported()
  }, [])

  async function refreshUnexported() {
    const [results, state] = await Promise.all([getResults(), getBackupState()])
    setUnexported(unexportedCount(results, state.lastExportCount))
  }

  async function handleExport() {
    const [teams, results, config] = await Promise.all([getTeams(), getResults(), getConfig()])
    triggerDownload(`milestones-results-${Date.now()}.csv`, resultsToCsv(teams, results, config), 'text/csv')
    await recordExport(Object.keys(results).length)
    setUnexported(0)
  }

  return (
    <>
      <header className="sticky top-0 flex items-center justify-between border-b border-muted bg-paper px-4 py-3">
        <h1 className="text-lg font-semibold text-ink">{title}</h1>
        <button
          type="button"
          onClick={handleExport}
          className="rounded-md border border-ink px-3 py-2 font-mono text-sm text-ink"
        >
          Export CSV
        </button>
      </header>
      {unexported > EXPORT_WARN_THRESHOLD && (
        <div role="alert" className="bg-warn/10 px-4 py-2 text-sm text-warn">
          ยังไม่ได้สำรอง {unexported} รายการ
        </div>
      )}
    </>
  )
}
