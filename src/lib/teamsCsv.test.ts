import { describe, expect, it } from 'vitest'
import { parseTeamsCsv } from './teamsCsv'

describe('parseTeamsCsv', () => {
  it('skips the header row and parses bib,name rows', () => {
    const csv = 'bib,name\n001,ขาแรงกาแล\n002,ทีม 002\n'
    expect(parseTeamsCsv(csv)).toEqual([
      { bib: '001', name: 'ขาแรงกาแล' },
      { bib: '002', name: 'ทีม 002' },
    ])
  })

  it('ignores blank lines', () => {
    const csv = 'bib,name\n001,A\n\n002,B\n'
    expect(parseTeamsCsv(csv)).toEqual([
      { bib: '001', name: 'A' },
      { bib: '002', name: 'B' },
    ])
  })

  it('unquotes a name containing a comma', () => {
    const csv = 'bib,name\n001,"Team, Inc"\n'
    expect(parseTeamsCsv(csv)).toEqual([{ bib: '001', name: 'Team, Inc' }])
  })
})
