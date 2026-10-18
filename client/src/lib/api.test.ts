import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../test/server'
import { api } from '../test/handlers'
import { useAuthStore } from '../stores/authStore'
import { apiFetch } from './api'

const signIn = () =>
  useAuthStore.getState().setAuth({
    token: 't', user: { id: 1, firstName: 'Ali', lastName: 'Y', email: 'a@x.com', phone: '', role: 'Customer' },
  })

describe('apiFetch 401 handling', () => {
  it('keeps the session when a login attempt fails', async () => {
    signIn()
    server.use(http.post(api('/api/auth/login'), () => HttpResponse.json({ title: 'x' }, { status: 401 })))

    await expect(apiFetch('/api/auth/login', { method: 'POST', body: '{}' })).rejects.toMatchObject({ status: 401 })

    expect(useAuthStore.getState().token).toBe('t')
  })

  it('logs out when an authenticated call is rejected', async () => {
    signIn()
    server.use(http.get(api('/api/orders'), () => new HttpResponse(null, { status: 401 })))

    await expect(apiFetch('/api/orders')).rejects.toMatchObject({ status: 401 })

    expect(useAuthStore.getState().token).toBeNull()
  })
})
