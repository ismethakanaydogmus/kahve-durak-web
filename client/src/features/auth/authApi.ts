import { ApiError, apiFetch } from '../../lib/api'
import type { AuthResponse } from '../../lib/types'

export interface LoginInput { email: string; password: string }
export interface RegisterInput { firstName: string; lastName: string; email: string; phone: string; password: string }

export const login = (input: LoginInput) =>
  apiFetch<AuthResponse>('/api/auth/login', { method: 'POST', body: JSON.stringify(input) })

export const register = (input: RegisterInput) =>
  apiFetch<AuthResponse>('/api/auth/register', { method: 'POST', body: JSON.stringify(input) })

/** i18n key for an auth request failure. */
export function authErrorKey(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'auth.invalidCredentials'
    if (error.status === 409) return 'auth.emailTaken'
  }
  return 'auth.genericError'
}
