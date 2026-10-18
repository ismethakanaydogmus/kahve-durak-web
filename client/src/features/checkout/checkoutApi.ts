import { apiFetch } from '../../lib/api'
import type { CheckoutRequest, CreateOrderResponse, Fulfilment, QuoteDto } from '../../lib/types'
import type { Lang } from '../../lib/localize'
import type { CartLine } from '../../stores/cartStore'

export function toCheckoutRequest(
  lines: CartLine[], fulfilment: Fulfilment, addressId: number | null, note: string, lang: Lang,
): CheckoutRequest {
  return {
    items: lines.map((l) => ({ productId: l.productId, optionIds: l.optionIds, quantity: l.quantity })),
    fulfilment,
    addressId: fulfilment === 'Delivery' ? addressId : null,
    note: note.trim() ? note.trim() : null,
    lang,
  }
}

export const fetchQuote = (request: CheckoutRequest) =>
  apiFetch<QuoteDto>('/api/orders/quote', { method: 'POST', body: JSON.stringify(request) })

/** 422 carries a QuoteDto in ApiError.problem. */
export const createOrder = (request: CheckoutRequest) =>
  apiFetch<CreateOrderResponse>('/api/orders', { method: 'POST', body: JSON.stringify(request) })
