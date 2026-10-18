import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../../../lib/api'
import type { AdminSlideDto, AdminTestimonialDto } from '../../../lib/types'

export const useAdminSlides = () =>
  useQuery({ queryKey: ['admin', 'slides'], queryFn: () => apiFetch<AdminSlideDto[]>('/api/admin/slides') })

export const useAdminTestimonials = () =>
  useQuery({ queryKey: ['admin', 'testimonials'], queryFn: () => apiFetch<AdminTestimonialDto[]>('/api/admin/testimonials') })

/** Content writes refresh the admin lists and the public home page. */
export function useContentMutation<TVars>(fn: (vars: TVars) => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'slides'] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'testimonials'] })
      void queryClient.invalidateQueries({ queryKey: ['home'] })
    },
  })
}

export const send = (path: string, method: 'POST' | 'PUT' | 'DELETE', body?: unknown) =>
  apiFetch<unknown>(path, { method, body: body === undefined ? undefined : JSON.stringify(body) })
