import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../../../lib/api'
import type { AdminCategoryDto } from '../../../lib/types'

export const useAdminCatalog = () =>
  useQuery({ queryKey: ['admin', 'catalog'], queryFn: () => apiFetch<AdminCategoryDto[]>('/api/admin/catalog') })

/** Any catalog write: on success the admin list and the public menu/home are refetched. */
export function useCatalogMutation<TVars>(fn: (vars: TVars) => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'catalog'] })
      void queryClient.invalidateQueries({ queryKey: ['menu'] })
      void queryClient.invalidateQueries({ queryKey: ['home'] })
    },
  })
}

export const send = (path: string, method: 'POST' | 'PUT' | 'PATCH' | 'DELETE', body?: unknown) =>
  apiFetch<unknown>(path, { method, body: body === undefined ? undefined : JSON.stringify(body) })

/** Swaps item i with its neighbour in direction d and returns the new id order. */
export function moved(ids: number[], index: number, direction: -1 | 1): number[] | null {
  const target = index + direction
  if (target < 0 || target >= ids.length) return null
  const next = [...ids]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}
