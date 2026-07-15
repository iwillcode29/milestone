import { afterEach, describe, expect, it, vi } from 'vitest'
import { triggerDownload } from './download'

describe('triggerDownload', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('creates a download link with the given filename and clicks it', () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    triggerDownload('teams.csv', 'a,b\n1,2\n', 'text/csv')

    expect(clickSpy).toHaveBeenCalledOnce()
  })

  it('does not leave the link element in the document', () => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    triggerDownload('teams.csv', 'a,b\n1,2\n', 'text/csv')

    expect(document.querySelector('a[download="teams.csv"]')).toBeNull()
  })
})
