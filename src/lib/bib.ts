import type { Team } from './types'

export function normalizeBib(bib: string): string {
  return String(Number(bib))
}

export function findTeamByBib(teams: Team[], input: string): Team | undefined {
  const target = normalizeBib(input)
  return teams.find((t) => normalizeBib(t.bib) === target)
}
