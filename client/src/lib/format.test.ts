import { describe, expect, it } from 'vitest'
import { formatPrice } from './format'

describe('formatPrice', () => {
  it('uses the lira sign in Turkish', () => {
    expect(formatPrice(105, 'tr')).toBe('₺105,00')
  })

  it('uses the lira sign in English too', () => {
    expect(formatPrice(105, 'en')).toBe('₺105.00')
  })
})
