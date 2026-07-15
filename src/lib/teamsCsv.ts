import type { Team } from './types'

function parseLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      fields.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  fields.push(current)
  return fields
}

export function parseTeamsCsv(csv: string): Team[] {
  const lines = csv.split('\n').map((l) => l.trim()).filter((l) => l.length > 0)
  const [, ...dataLines] = lines
  return dataLines.map((line) => {
    const [bib, name] = parseLine(line)
    return { bib, name }
  })
}
