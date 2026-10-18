import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../../lib/api'
import type { AddressDto, AddressRequest, NeighborhoodDto } from '../../lib/types'

export const useNeighborhoods = () =>
  useQuery({
    queryKey: ['neighborhoods'],
    queryFn: () => apiFetch<NeighborhoodDto[]>('/api/shop/neighborhoods'),
    staleTime: Infinity,
  })

export const useAddresses = () =>
  useQuery({ queryKey: ['addresses'], queryFn: () => apiFetch<AddressDto[]>('/api/addresses') })

export function useSaveAddress() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id?: number; body: AddressRequest }) =>
      apiFetch<AddressDto>(id ? `/api/addresses/${id}` : '/api/addresses', {
        method: id ? 'PUT' : 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['addresses'] }),
  })
}

export function useDeleteAddress() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiFetch<void>(`/api/addresses/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['addresses'] }),
  })
}
