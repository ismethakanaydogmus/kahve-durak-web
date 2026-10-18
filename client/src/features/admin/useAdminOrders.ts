import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../../lib/api'
import type { AdminOrderDetailDto, AdminOrderSummaryDto, DashboardDto } from '../../lib/types'

export type AdminOrderFilter = 'active' | 'completed' | 'cancelled' | 'failed' | 'all'

// RealtimeBridge invalidates these keys when orders change.
export const useAdminOrders = (filter: AdminOrderFilter) =>
  useQuery({
    queryKey: ['admin', 'orders', filter],
    queryFn: () => apiFetch<AdminOrderSummaryDto[]>(`/api/admin/orders?filter=${filter}`),
  })

export const useAdminOrder = (id: number) =>
  useQuery({
    queryKey: ['admin', 'order', id],
    queryFn: () => apiFetch<AdminOrderDetailDto>(`/api/admin/orders/${id}`),
    retry: false,
  })

export const useDashboard = () =>
  useQuery({ queryKey: ['admin', 'dashboard'], queryFn: () => apiFetch<DashboardDto>('/api/admin/dashboard') })
