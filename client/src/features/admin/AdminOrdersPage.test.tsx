import { describe, expect, it } from 'vitest'
import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/server'
import { api } from '../../test/handlers'
import { renderWithProviders } from '../../test/render'
import { useAuthStore } from '../../stores/authStore'
import type { AdminOrderSummaryDto } from '../../lib/types'
import { RequireAdmin } from '../auth/RequireAdmin'
import { AdminLayout } from './AdminLayout'
import { AdminOrdersPage } from './AdminOrdersPage'
import { orderAlerts } from './orderAlert'

const summary = (over: Partial<AdminOrderSummaryDto>): AdminOrderSummaryDto => ({
  id: 12, status: 'Received', fulfilment: 'Pickup', total: 450, itemCount: 2, createdAt: '2026-10-19T09:05:00Z',
  customerName: 'Ayşe Demir', customerPhone: '+905551112233', neighborhood: null, ...over,
})

const active = [
  summary({ id: 12 }),
  summary({ id: 13, status: 'Preparing', customerName: 'Mert A.' }),
  summary({ id: 14, status: 'OnTheWay', fulfilment: 'Delivery', neighborhood: 'Bulgurlu' }),
]

const signInAdmin = () =>
  useAuthStore.getState().setAuth({
    token: 't', user: { id: 1, firstName: 'Admin', lastName: 'G', email: 'admin@kahvedurak.local', phone: '', role: 'Admin' },
  })

function serve() {
  const filters: string[] = []
  server.use(http.get(api('/api/admin/orders'), ({ request }) => {
    const filter = new URL(request.url).searchParams.get('filter') ?? 'active'
    filters.push(filter)
    return HttpResponse.json(filter === 'active' ? active : [summary({ id: 9, status: 'Completed' })])
  }))
  return filters
}

describe('AdminOrdersPage', () => {
  it('groups active orders into columns by stage', async () => {
    serve()
    renderWithProviders(<AdminOrdersPage />)

    const fresh = await screen.findByRole('region', { name: 'Yeni' })
    expect(within(fresh).getByRole('link', { name: /#12/ })).toHaveAttribute('href', '/admin/siparisler/12')
    expect(within(screen.getByRole('region', { name: 'Hazırlanıyor' })).getByRole('link', { name: /#13/ })).toBeInTheDocument()
    const ready = within(screen.getByRole('region', { name: 'Hazır / Yolda' })).getByRole('link', { name: /#14/ })
    expect(ready).toHaveTextContent('Bulgurlu')
    expect(ready).toHaveTextContent('Teslimat')
  })

  it('switches the filter', async () => {
    const filters = serve()
    renderWithProviders(<AdminOrdersPage />)
    await screen.findByRole('region', { name: 'Yeni' })

    await userEvent.click(screen.getByRole('button', { name: 'Tamamlanan' }))

    expect(await screen.findByRole('link', { name: /#9/ })).toBeInTheDocument()
    expect(filters).toContain('completed')
  })
})

describe('AdminLayout alerts', () => {
  it('shows a toast for a new order', async () => {
    serve()
    renderWithProviders(<AdminLayout />)

    act(() => orderAlerts.emit(summary({ id: 12 })))

    const toast = await screen.findByText(/Yeni sipariş #12/)
    expect(toast).toHaveTextContent('Ayşe Demir')
    expect(toast).toHaveTextContent('₺450,00')
  })

  it('offers to enable sound when the browser cannot play it', async () => {
    serve()
    renderWithProviders(<AdminLayout />)

    act(() => orderAlerts.emit(summary({ id: 15 })))

    expect(await screen.findByRole('button', { name: 'Sesli bildirimi aç' })).toBeInTheDocument()
  })

  it('remembers the sound preference', async () => {
    serve()
    renderWithProviders(<AdminLayout />)

    await userEvent.click(screen.getByRole('button', { name: 'Sesli bildirim: Açık' }))
    expect(localStorage.getItem('adminSound')).toBe('off')

    await userEvent.click(screen.getByRole('button', { name: 'Sesli bildirim: Kapalı' }))
    expect(localStorage.getItem('adminSound')).toBe('on')
  })

  it('keeps customers out', async () => {
    useAuthStore.getState().setAuth({
      token: 't', user: { id: 2, firstName: 'Ali', lastName: 'Y', email: 'a@x.com', phone: '', role: 'Customer' },
    })
    const { router } = renderWithProviders(<RequireAdmin><AdminLayout /></RequireAdmin>, {
      path: '/admin/*', route: '/admin/siparisler', routes: [{ path: '/', element: <p>Ana sayfa</p> }],
    })

    expect(await screen.findByText('Ana sayfa')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
  })

  it('lets admins in', async () => {
    serve()
    signInAdmin()
    renderWithProviders(<RequireAdmin><AdminLayout /></RequireAdmin>, { path: '/admin/*', route: '/admin/siparisler' })

    expect(await screen.findByRole('link', { name: 'Siparişler' })).toBeInTheDocument()
  })
})

describe('AdminLayout tabs', () => {
  it('links every admin section', async () => {
    serve()
    renderWithProviders(<AdminLayout />)

    const nav = screen.getByRole('navigation', { name: 'Yönetim' })
    expect(within(nav).getAllByRole('link').map((l) => l.textContent)).toEqual(['Siparişler', 'Menü', 'İçerik', 'Ayarlar', 'Özet'])
  })
})
