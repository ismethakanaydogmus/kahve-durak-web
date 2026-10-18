import type { OptionDto, ProductDto } from './types'

// Mirrors the server rules in api/.../Features/Orders/CheckoutService.cs. The server is authoritative;
// these only drive the product dialog and the cart estimate.

export type SelectionError = { groupId: number; reason: 'required' | 'tooMany' }

export function unitPrice(product: ProductDto, optionIds: number[]): number {
  const chosen = new Set(optionIds)
  return product.optionGroups
    .flatMap((g) => g.options)
    .filter((o) => chosen.has(o.id))
    .reduce((sum, o) => sum + o.priceDelta, product.price)
}

/** First option of every required group, so a drink can go to the cart in one tap. */
export function defaultSelection(product: ProductDto): number[] {
  return product.optionGroups.filter((g) => g.isRequired && g.options.length > 0).map((g) => g.options[0].id)
}

export function selectionErrors(product: ProductDto, optionIds: number[]): SelectionError[] {
  const chosen = new Set(optionIds)
  return product.optionGroups.flatMap((g): SelectionError[] => {
    const count = g.options.filter((o) => chosen.has(o.id)).length
    if (count > g.maxSelect) return [{ groupId: g.id, reason: 'tooMany' }]
    if (g.isRequired && count < Math.max(1, g.minSelect)) return [{ groupId: g.id, reason: 'required' }]
    return []
  })
}

/** Chosen options in display order (group order, then option order). */
export function selectedOptions(product: ProductDto, optionIds: number[]): OptionDto[] {
  const chosen = new Set(optionIds)
  return product.optionGroups.flatMap((g) => g.options.filter((o) => chosen.has(o.id)))
}
