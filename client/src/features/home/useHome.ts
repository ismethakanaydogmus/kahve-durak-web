import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../../lib/api'
import type { HomeDto } from '../../lib/types'

export const useHome = () => useQuery({ queryKey: ['home'], queryFn: () => apiFetch<HomeDto>('/api/home') })
