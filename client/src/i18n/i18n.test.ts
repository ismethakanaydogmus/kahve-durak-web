import { describe, expect, it } from 'vitest'
import tr from './tr.json'
import en from './en.json'

type Tree = { [k: string]: string | Tree }

function flatten(tree: Tree, prefix = ''): Record<string, string> {
  return Object.entries(tree).reduce<Record<string, string>>((acc, [k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k
    return typeof v === 'string' ? { ...acc, [key]: v } : { ...acc, ...flatten(v, key) }
  }, {})
}

describe('translations', () => {
  const trFlat = flatten(tr as Tree)
  const enFlat = flatten(en as Tree)

  it('have the same keys in Turkish and English', () => {
    expect(Object.keys(enFlat).sort()).toEqual(Object.keys(trFlat).sort())
  })

  it('address the customer as "sen" in Turkish', () => {
    const formal = Object.entries(trFlat).filter(([, v]) => /(girin|deneyin|edebilirsiniz|Bağlantınızı)/.test(v))
    expect(formal).toEqual([])
  })

  it('has a message for every checkout error code', () => {
    const codes = ['EMPTY_CART', 'QUANTITY_INVALID', 'PRODUCT_UNAVAILABLE', 'OPTION_INVALID', 'OPTION_REQUIRED', 'SHOP_CLOSED',
      'ADDRESS_REQUIRED', 'ADDRESS_INVALID', 'NEIGHBORHOOD_NOT_SERVED', 'BELOW_MINIMUM', 'NOTE_TOO_LONG']
    for (const code of codes) expect(trFlat[`checkout.errors.${code}`], code).toBeTruthy()
  })

  it('has a label for every order status', () => {
    for (const s of ['PendingPayment', 'PaymentFailed', 'Received', 'Preparing', 'Ready', 'OnTheWay', 'Completed', 'Cancelled'])
      expect(trFlat[`status.${s}`], s).toBeTruthy()
  })
})
