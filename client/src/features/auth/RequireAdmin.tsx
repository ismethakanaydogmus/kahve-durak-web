import type { ReactNode } from 'react'
import { Navigate } from 'react-router'
import { selectIsAdmin, useAuthStore } from '../../stores/authStore'
import { RequireAuth } from './RequireAuth'

export function RequireAdmin({ children }: { children: ReactNode }) {
  const isAdmin = useAuthStore(selectIsAdmin)
  const token = useAuthStore((s) => s.token)
  if (token && !isAdmin) return <Navigate to="/" replace />
  return <RequireAuth>{children}</RequireAuth>
}
