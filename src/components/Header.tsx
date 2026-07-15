import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { EXPORT_WARN_THRESHOLD, getBackupState, recordExport, unexportedCount } from '../lib/backup'
import { resultsToCsv } from '../lib/csv'
import { triggerDownload } from '../lib/download'
import { getConfig, getResults, getTeams } from '../lib/store'

const NAV_ITEMS = [
  { to: '/', label: 'รายชื่อทีม', end: true },
  { to: '/leaderboard', label: 'อันดับ', end: false },
  { to: '/settings', label: 'ตั้งค่า', end: false },
]

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
    <div className="sticky top-0 z-10 border-b border-line bg-paper">
      <div className="mx-auto max-w-2xl">
        <header className="flex items-center justify-between gap-4 px-4 pt-4 pb-3">
          <h1 className="truncate text-[1.375rem] font-medium tracking-tight text-ink">{title}</h1>
          <button
            type="button"
            onClick={handleExport}
            className="shrink-0 font-mono text-xs tracking-[0.08em] text-muted uppercase transition-colors hover:text-ink"
          >
            Export CSV
          </button>
        </header>
        <nav className="flex gap-1 px-2">
          {NAV_ITEMS.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `border-b-2 px-2 py-2.5 text-sm transition-colors ${
                  isActive ? 'border-signal font-medium text-ink' : 'border-transparent text-muted hover:text-ink'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
      {unexported > EXPORT_WARN_THRESHOLD && (
        <div role="alert" className="border-l-4 border-warn bg-warn/[0.06] px-4 py-2 text-sm text-warn">
          ยังไม่ได้สำรอง {unexported} รายการ
        </div>
      )}
    </div>
  )
}
