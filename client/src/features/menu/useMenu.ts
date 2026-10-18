import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../../lib/api'
import type { MenuCategoryDto } from '../../lib/types'

export const useMenu = () => useQuery({ queryKey: ['menu'], queryFn: () => apiFetch<MenuCategoryDto[]>('/api/menu') })
