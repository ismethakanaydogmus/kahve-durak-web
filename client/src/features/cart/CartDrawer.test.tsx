import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/server'
import { api } from '../../test/handlers'
import { espresso, homeFixture, latte } from '../../test/fixtures'
import { renderWithProviders } from '../../test/render'
import { useCartStore } from '../../stores/cartStore'
import { RequireAuth } from '../auth/RequireAuth'
import { CartDrawer } from './CartDrawer'

const routes = [
  { path: '/odeme', element: <RequireAuth><p>Ödeme sayfası</p></RequireAuth> },
  { path: '/giris', element: <p>Giriş sayfası</p> },
]

describe('CartDrawer', () => {
  it('invites to the menu when empty', async () => {
    renderWithProviders(<CartDrawer open onClose={() => {}} />)

    expect(await screen.findByText('Sepetin boş. Menüden bir içecek seç.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Menüye git' })).toHaveAttribute('href', '/menu')
  })

  it('changes quantities, updates the subtotal and removes lines', async () => {
    useCartStore.getState().add(latte, [102], 1)
    useCartStore.getState().add(espresso, [11], 1)
    renderWithProviders(<CartDrawer open onClose={() => {}} />)

    const dialog = await screen.findByRole('dialog', { name: 'Sepetin' })
    expect(dialog).toHaveTextContent('₺315,00')
    const latteRow = within(dialog).getByRole('listitem', { name: /Latte/ })
    expect(latteRow).toHaveTextContent('Yulaf')

    await userEvent.click(within(latteRow).getByRole('button', { name: 'Artır' }))
    expect(dialog).toHaveTextContent('₺525,00')

    await userEvent.click(within(latteRow).getByRole('button', { name: 'Kaldır' }))
    expect(within(dialog).queryByRole('listitem', { name: /Latte/ })).not.toBeInTheDocument()
    expect(dialog).toHaveTextContent('₺105,00')
  })

  it('blocks checkout while the café is closed', async () => {
    server.use(http.get(api('/api/home'), () => HttpResponse.json({
      ...homeFixture,
      shop: { ...homeFixture.shop, status: { isOpen: false, closesAt: null, nextOpensAt: '2099-01-01T07:00:00+00:00' } },
    })))
    useCartStore.getState().add(latte, [101], 1)
    renderWithProviders(<CartDrawer open onClose={() => {}} />)

    expect(await screen.findByText(/Şu an sipariş alamıyoruz\..*10:00'da açılıyor/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Siparişi tamamla' })).toBeDisabled()
  })

  it('sends guests to log in before checkout', async () => {
    useCartStore.getState().add(latte, [101], 1)
    const { router } = renderWithProviders(<CartDrawer open onClose={() => {}} />, { routes })

    await userEvent.click(await screen.findByRole('link', { name: 'Siparişi tamamla' }))

    expect(await screen.findByText('Giriş sayfası')).toBeInTheDocument()
    expect(router.state.location.search).toBe('?redirect=%2Fodeme')
  })
})
