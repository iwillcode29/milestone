import { resultsToCsv } from '../lib/csv'
import { triggerDownload } from '../lib/download'
import { getConfig, getResults, getTeams } from '../lib/store'

export function Header({ title }: { title: string }) {
  async function handleExport() {
    const [teams, results, config] = await Promise.all([getTeams(), getResults(), getConfig()])
    triggerDownload(`milestones-results-${Date.now()}.csv`, resultsToCsv(teams, results, config), 'text/csv')
  }

  return (
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
  )
}
