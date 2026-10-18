import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../../lib/api'
import type { OrderDetailDto, OrderSummaryDto } from '../../lib/types'

export const useOrders = () =>
  useQuery({ queryKey: ['orders'], queryFn: () => apiFetch<OrderSummaryDto[]>('/api/orders') })

/** Refetches when the tab regains focus; Plan 3 will also invalidate it from SignalR. */
export const useOrder = (id: number) =>
  useQuery({
    queryKey: ['order', id],
    queryFn: () => apiFetch<OrderDetailDto>(`/api/orders/${id}`),
    refetchOnWindowFocus: true,
    // While the payment is unconfirmed, keep asking until the callback settles it.
    refetchInterval: (query) => (query.state.data?.status === 'PendingPayment' ? 5000 : false),
    retry: false,
  })
