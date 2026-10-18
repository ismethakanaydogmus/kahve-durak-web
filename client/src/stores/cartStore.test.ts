import { describe, expect, it } from 'vitest'
import { lineKey, selectCount, selectSubtotal, useCartStore } from './cartStore'
import { espresso, latte } from '../test/fixtures'

const store = () => useCartStore.getState()

describe('cartStore', () => {
  it('merges the same product and options regardless of option order', () => {
    store().add(espresso, [12, 11], 1)
    store().add(espresso, [11, 12], 2)

    expect(store().lines).toHaveLength(1)
    expect(store().lines[0].quantity).toBe(3)
    expect(store().lines[0].key).toBe(lineKey(1, [11, 12]))
  })

  it('stores a snapshot with option names and unit price', () => {
    store().add(latte, [102], 1)

    const line = store().lines[0]
    expect(line.unitPrice).toBe(210)
    expect(line.options).toEqual([{ nameTr: 'Yulaf', nameEn: 'Oat' }])
    expect(line.categoryId).toBe(1)
  })

  it('caps quantity at 20', () => {
    store().add(latte, [101], 15)
    store().add(latte, [101], 10)

    expect(store().lines[0].quantity).toBe(20)
  })

  it('removes a line when quantity is set to 0', () => {
    store().add(latte, [101], 1)

    store().setQuantity(store().lines[0].key, 0)

    expect(store().lines).toEqual([])
  })

  it('counts items and estimates the subtotal', () => {
    store().add(latte, [102], 2)
    store().add(espresso, [11], 1)

    expect(selectCount(store())).toBe(3)
    expect(selectSubtotal(store())).toBe(2 * 210 + 105)
  })

  it('persists to localStorage', async () => {
    store().add(latte, [101], 2)
    const saved = localStorage.getItem('cart') ?? '{}'
    expect(JSON.parse(saved).state.lines).toHaveLength(1)

    useCartStore.setState({ lines: [] })
    localStorage.setItem('cart', saved) // as if the page were reloaded
    await useCartStore.persist.rehydrate()

    expect(store().lines[0].quantity).toBe(2)
  })
})
