import { describe, expect, it } from 'vitest'
import { defaultSelection, selectionErrors, unitPrice } from './cartPricing'
import { espresso, latte } from '../test/fixtures'

describe('cartPricing', () => {
  it('adds option deltas to the base price', () => {
    expect(unitPrice(latte, [102])).toBe(210)
    expect(unitPrice(espresso, [12])).toBe(120)
  })

  it('preselects the first option of each required group', () => {
    expect(defaultSelection(latte)).toEqual([101])
    expect(defaultSelection(espresso)).toEqual([11])
  })

  it('reports a missing required choice', () => {
    expect(selectionErrors(latte, [])).toEqual([{ groupId: 10, reason: 'required' }])
  })

  it('reports too many choices in a single-choice group', () => {
    expect(selectionErrors(latte, [101, 102])).toEqual([{ groupId: 10, reason: 'tooMany' }])
  })

  it('accepts a valid selection', () => {
    expect(selectionErrors(latte, [102])).toEqual([])
  })
})
