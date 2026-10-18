import { describe, expect, it } from 'vitest'
import { selectIsAdmin, useAuthStore } from './authStore'
import type { AuthResponse } from '../lib/types'

const response: AuthResponse = {
  token: 'jwt-token',
  user: { id: 7, firstName: 'Ali', lastName: 'Yılmaz', email: 'ali@x.com', phone: '+905551112233', role: 'Customer' },
}

describe('authStore', () => {
  it('persists token and user after setAuth', () => {
    useAuthStore.getState().setAuth(response)

    expect(useAuthStore.getState().token).toBe('jwt-token')
    const stored = JSON.parse(localStorage.getItem('auth') ?? '{}')
    expect(stored.state.token).toBe('jwt-token')
    expect(stored.state.user.email).toBe('ali@x.com')
  })

  it('clears everything on logout', () => {
    useAuthStore.getState().setAuth(response)

    useAuthStore.getState().logout()

    expect(useAuthStore.getState().token).toBeNull()
    expect(useAuthStore.getState().user).toBeNull()
    expect(JSON.parse(localStorage.getItem('auth') ?? '{}').state.token).toBeNull()
  })

  it('knows when the user is an admin', () => {
    useAuthStore.getState().setAuth({ ...response, user: { ...response.user, role: 'Admin' } })

    expect(selectIsAdmin(useAuthStore.getState())).toBe(true)
  })
})

describe('authStore rehydration', () => {
  const b64url = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '')
  const stored = (exp: number) =>
    JSON.stringify({ state: { token: `${b64url({ alg: 'HS256' })}.${b64url({ exp })}.sig`, user: response.user }, version: 0 })

  it('drops a stored session whose token expired', async () => {
    localStorage.setItem('auth', stored(Math.floor(Date.now() / 1000) - 60))

    await useAuthStore.persist.rehydrate()

    expect(useAuthStore.getState().token).toBeNull()
    expect(useAuthStore.getState().user).toBeNull()
  })

  it('keeps a stored session whose token is still valid', async () => {
    localStorage.setItem('auth', stored(Math.floor(Date.now() / 1000) + 3600))

    await useAuthStore.persist.rehydrate()

    expect(useAuthStore.getState().user?.firstName).toBe('Ali')
  })
})
