import type { ProductDto } from './types'

/** True when some option changes the price, so the base price is a starting price. */
export function hasVariablePrice(product: ProductDto): boolean {
  return product.optionGroups.some((g) => g.options.some((o) => o.priceDelta > 0))
}
