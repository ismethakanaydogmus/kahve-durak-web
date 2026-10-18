import { describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/server'
import { api } from '../../test/handlers'
import { renderWithProviders } from '../../test/render'
import { useAuthStore } from '../../stores/authStore'
import type { AuthResponse, Role } from '../../lib/types'
import { LoginPage } from './LoginPage'
import { RegisterPage } from './RegisterPage'
import { RequireAdmin } from './RequireAdmin'
import { RequireAuth } from './RequireAuth'

const authResponse = (role: Role = 'Customer'): AuthResponse => ({
  token: 'jwt-token',
  user: { id: 1, firstName: 'Ali', lastName: 'Yılmaz', email: 'ali@x.com', phone: '+905551112233', role },
})

const targets = [
  { path: '/', element: <p>Ana sayfa içeriği</p> },
  { path: '/hesap', element: <p>Hesap içeriği</p> },
]

async function fillLogin() {
  await userEvent.type(screen.getByLabelText('E-posta'), 'ali@x.com')
  await userEvent.type(screen.getByLabelText('Şifre'), 'Sifre-1234')
  await userEvent.click(screen.getByRole('button', { name: 'Giriş yap' }))
}

describe('LoginPage', () => {
  it('stores the token and returns to the redirect target', async () => {
    server.use(http.post(api('/api/auth/login'), () => HttpResponse.json(authResponse())))
    const { router } = renderWithProviders(<LoginPage />, { path: '/giris', route: '/giris?redirect=/hesap', routes: targets })

    await fillLogin()

    expect(await screen.findByText('Hesap içeriği')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/hesap')
    expect(useAuthStore.getState().token).toBe('jwt-token')
  })

  it('ignores redirects to other sites', async () => {
    server.use(http.post(api('/api/auth/login'), () => HttpResponse.json(authResponse())))
    const { router } = renderWithProviders(<LoginPage />, { path: '/giris', route: '/giris?redirect=//evil.com', routes: targets })

    await fillLogin()

    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  })

  it('shows a message for wrong credentials', async () => {
    server.use(http.post(api('/api/auth/login'), () =>
      HttpResponse.json({ title: 'E-posta veya şifre hatalı.', status: 401 }, { status: 401 })))
    renderWithProviders(<LoginPage />, { path: '/giris', route: '/giris' })

    await fillLogin()

    expect(await screen.findByRole('alert')).toHaveTextContent('E-posta veya şifre hatalı.')
    expect(useAuthStore.getState().token).toBeNull()
  })
})

describe('RegisterPage', () => {
  async function fillRegister(password: string) {
    await userEvent.type(screen.getByLabelText('Ad'), 'Ali')
    await userEvent.type(screen.getByLabelText('Soyad'), 'Yılmaz')
    await userEvent.type(screen.getByLabelText('E-posta'), 'ali@x.com')
    await userEvent.type(screen.getByLabelText('Telefon'), '0555 111 22 33')
    await userEvent.type(screen.getByLabelText(/Şifre/), password)
    await userEvent.click(screen.getByRole('button', { name: 'Hesap oluştur' }))
  }

  it('rejects a short password before calling the API', async () => {
    let called = false
    server.use(http.post(api('/api/auth/register'), () => { called = true; return HttpResponse.json(authResponse(), { status: 201 }) }))
    renderWithProviders(<RegisterPage />, { path: '/kayit', route: '/kayit' })

    await fillRegister('1234567')

    expect(await screen.findByText('Şifre en az 8 karakter olmalı.')).toBeInTheDocument()
    expect(called).toBe(false)
  })

  it('shows a message when the email is taken', async () => {
    server.use(http.post(api('/api/auth/register'), () =>
      HttpResponse.json({ title: 'Bu e-posta zaten kayıtlı.', status: 409 }, { status: 409 })))
    renderWithProviders(<RegisterPage />, { path: '/kayit', route: '/kayit' })

    await fillRegister('Sifre-1234')

    expect(await screen.findByRole('alert')).toHaveTextContent('Bu e-posta zaten kayıtlı.')
  })

  it('logs the new user in and goes home', async () => {
    server.use(http.post(api('/api/auth/register'), () => HttpResponse.json(authResponse(), { status: 201 })))
    renderWithProviders(<RegisterPage />, { path: '/kayit', route: '/kayit', routes: targets })

    await fillRegister('Sifre-1234')

    expect(await screen.findByText('Ana sayfa içeriği')).toBeInTheDocument()
    expect(useAuthStore.getState().user?.firstName).toBe('Ali')
  })
})

describe('route guards', () => {
  const login = { path: '/giris', element: <p>Giriş sayfası</p> }

  it('sends anonymous users to login with a redirect back', async () => {
    const { router } = renderWithProviders(<RequireAuth><p>Gizli</p></RequireAuth>, { path: '/hesap', route: '/hesap', routes: [login] })

    expect(await screen.findByText('Giriş sayfası')).toBeInTheDocument()
    expect(router.state.location.search).toBe('?redirect=%2Fhesap')
  })

  it('sends customers away from admin pages', async () => {
    useAuthStore.getState().setAuth(authResponse('Customer'))
    renderWithProviders(<RequireAdmin><p>Yönetim paneli</p></RequireAdmin>, { path: '/admin', route: '/admin', routes: [...targets, login] })

    expect(await screen.findByText('Ana sayfa içeriği')).toBeInTheDocument()
    expect(screen.queryByText('Yönetim paneli')).not.toBeInTheDocument()
  })

  it('lets admins in', async () => {
    useAuthStore.getState().setAuth(authResponse('Admin'))
    renderWithProviders(<RequireAdmin><p>Yönetim paneli</p></RequireAdmin>, { path: '/admin', route: '/admin', routes: [...targets, login] })

    expect(await screen.findByText('Yönetim paneli')).toBeInTheDocument()
  })
})
