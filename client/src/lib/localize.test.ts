import { describe, expect, it } from 'vitest'
import { localize } from './localize'

describe('localize', () => {
  it('uses English when available', () => {
    expect(localize('Su', 'Water', 'en')).toBe('Water')
  })

  it.each([[''], [null], [undefined], ['  ']])('falls back to Turkish when English is %j', (en) => {
    expect(localize('Su', en, 'en')).toBe('Su')
  })

  it('uses Turkish for tr', () => {
    expect(localize('Su', 'Water', 'tr')).toBe('Su')
  })
})
