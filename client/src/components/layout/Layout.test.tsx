import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../test/render'
import { Layout } from './Layout'
import { useAuthStore } from '../../stores/authStore'

describe('Layout', () => {
  it('shows the demo banner in Turkish by default', () => {
    renderWithProviders(<Layout />)

    expect(screen.getByRole('note')).toHaveTextContent('Bu bir demo projedir, siparişler gerçek değildir.')
  })

  it('switches language to English and remembers it', async () => {
    renderWithProviders(<Layout />)

    await userEvent.click(screen.getByRole('button', { name: 'English' }))

    expect(screen.getByRole('note')).toHaveTextContent('This is a demo project, orders are not real.')
    expect(localStorage.getItem('lang')).toBe('en')
    expect(document.documentElement.lang).toBe('en')
  })
})

describe('Header account area', () => {
  it('shows the user name and logs out', async () => {
    useAuthStore.getState().setAuth({
      token: 't',
      user: { id: 1, firstName: 'Ali', lastName: 'Y', email: 'a@x.com', phone: '', role: 'Customer' },
    })
    renderWithProviders(<Layout />)

    expect(screen.getByRole('link', { name: 'Merhaba, Ali' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Yönetim' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Çıkış yap' }))

    expect(useAuthStore.getState().token).toBeNull()
    expect(screen.getByRole('link', { name: 'Giriş yap' })).toBeInTheDocument()
  })
})

describe('Header cart badge', () => {
  it('shows how many items are in the cart', async () => {
    const { latte } = await import('../../test/fixtures')
    const { useCartStore } = await import('../../stores/cartStore')
    useCartStore.getState().add(latte, [101], 3)
    renderWithProviders(<Layout />)

    const button = screen.getByRole('button', { name: 'Sepet, 3 ürün' })
    expect(button).toHaveTextContent('3')
  })
})

describe('Layout cart drawer', () => {
  it('opens the cart from the header and closes it again', async () => {
    renderWithProviders(<Layout />)

    await userEvent.click(screen.getByRole('button', { name: 'Sepet, 0 ürün' }))
    expect(await screen.findByRole('dialog', { name: 'Sepetin' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Kapat' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('Modal focus', () => {
  it('returns focus to the cart button after the drawer closes', async () => {
    renderWithProviders(<Layout />)
    const cart = screen.getByRole('button', { name: 'Sepet, 0 ürün' })

    await userEvent.click(cart)
    await userEvent.click(await screen.findByRole('button', { name: 'Kapat' }))

    expect(document.activeElement).toBe(cart)
  })
})

describe('Footer address', () => {
  it('comes from the shop settings', async () => {
    const { http, HttpResponse } = await import('msw')
    const { server } = await import('../../test/server')
    const { api } = await import('../../test/handlers')
    const { homeFixture } = await import('../../test/fixtures')
    server.use(http.get(api('/api/home'), () =>
      HttpResponse.json({ ...homeFixture, shop: { ...homeFixture.shop, address: 'Yeni Sk. No:1, Üsküdar' } })))
    renderWithProviders(<Layout />)

    expect(await screen.findByText('Yeni Sk. No:1, Üsküdar')).toBeInTheDocument()
  })
})
