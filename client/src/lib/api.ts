import { useAuthStore } from '../stores/authStore'
import type { ProblemDetails } from './types'

export const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:5080'

export class ApiError extends Error {
  readonly status: number
  readonly problem?: ProblemDetails

  constructor(status: number, problem?: ProblemDetails) {
    super(problem?.title ?? `Request failed with status ${status}`)
    this.status = status
    this.problem = problem
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  const token = useAuthStore.getState().token
  if (token) headers.set('Authorization', `Bearer ${token}`)
  // JSON for string bodies; FormData sets its own multipart boundary.
  if (typeof init.body === 'string' && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')

  const response = await fetch(`${API_URL}${path}`, { ...init, headers })

  if (!response.ok) {
    // A failed login must not end the current session; any other 401 means the token is no longer valid.
    if (response.status === 401 && token && !path.startsWith('/api/auth/')) useAuthStore.getState().logout()
    let problem: ProblemDetails | undefined
    try { problem = await response.json() } catch { /* empty or non-JSON body */ }
    throw new ApiError(response.status, problem)
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}
