import { describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/server'
import { api } from '../../test/handlers'
import { renderWithProviders } from '../../test/render'
import type { AdminOrderDetailDto, OrderDetailDto, OrderStatus } from '../../lib/types'
import { AdminOrderDetailPage } from './AdminOrderDetailPage'

const order = (status: OrderStatus, over: Partial<OrderDetailDto> = {}): OrderDetailDto => ({
  id: 12, status, fulfilment: 'Pickup',
  items: [{ nameTr: 'Latte', nameEn: 'Latte', options: [{ nameTr: 'Yulaf', nameEn: 'Oat' }], unitPrice: 210, quantity: 2, lineTotal: 420 }],
  subtotal: 420, deliveryFee: 0, total: 420, note: 'Şekersiz', address: null,
  history: [{ status: 'PendingPayment', at: '2026-10-19T09:00:00Z' }, { status: 'Received', at: '2026-10-19T09:01:00Z' }],
  createdAt: '2026-10-19T09:00:00Z', ...over,
})

const next: Record<string, OrderStatus | null> = { Received: 'Preparing', Preparing: 'Ready', Ready: 'Completed', OnTheWay: 'Completed' }

const detail = (status: OrderStatus, over: Partial<OrderDetailDto> = {}): AdminOrderDetailDto => {
  const o = order(status, over)
  return {
    order: o,
    customer: { name: 'Ayşe Demir', email: 'ayse@example.com', phone: '+905551112233' },
    next: o.fulfilment === 'Delivery' && status === 'Preparing' ? 'OnTheWay' : (next[status] ?? null),
    canCancel: status === 'Received' || status === 'Preparing',
  }
}

const at = () => renderWithProviders(<AdminOrderDetailPage />, { path: '/admin/siparisler/:id', route: '/admin/siparisler/12' })

describe('AdminOrderDetailPage', () => {
  it('starts preparing and shows the next action', async () => {
    let current = detail('Received')
    const bodies: unknown[] = []
    server.use(
      http.get(api('/api/admin/orders/12'), () => HttpResponse.json(current)),
      http.post(api('/api/admin/orders/12/advance'), async ({ request }) => {
        bodies.push(await request.json())
        current = detail('Preparing')
        return HttpResponse.json(current)
      }),
    )
    at()

    expect(await screen.findByRole('link', { name: '+905551112233' })).toHaveAttribute('href', 'tel:+905551112233')
    expect(screen.getByText('Şekersiz')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Hazırlamaya başla' }))

    expect(await screen.findByRole('button', { name: 'Hazır, müşteriye haber ver' })).toBeInTheDocument()
    expect(bodies).toEqual([{ expected: 'Received' }])
  })

  it('offers "on the way" for a delivery being prepared', async () => {
    server.use(http.get(api('/api/admin/orders/12'), () => HttpResponse.json(detail('Preparing', {
      fulfilment: 'Delivery', deliveryFee: 30, total: 450,
      address: { title: 'Ev', neighborhood: 'Bulgurlu', line: 'Demlik Sk. No:10', directions: 'Fırının yanı' },
    }))))
    at()

    expect(await screen.findByRole('button', { name: 'Yola çıktı' })).toBeInTheDocument()
    expect(screen.getByText(/Demlik Sk. No:10/)).toHaveTextContent('Fırının yanı')
  })

  it('hides cancel once the order is ready', async () => {
    server.use(http.get(api('/api/admin/orders/12'), () => HttpResponse.json(detail('Ready'))))
    at()

    expect(await screen.findByRole('button', { name: 'Teslim edildi' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Siparişi iptal et' })).not.toBeInTheDocument()
  })

  it('cancels after confirmation', async () => {
    let cancelled = false
    server.use(
      http.get(api('/api/admin/orders/12'), () => HttpResponse.json(detail(cancelled ? 'Cancelled' : 'Received'))),
      http.post(api('/api/admin/orders/12/cancel'), () => {
        cancelled = true
        return HttpResponse.json(detail('Cancelled'))
      }),
    )
    at()

    await userEvent.click(await screen.findByRole('button', { name: 'Siparişi iptal et' }))
    const dialog = screen.getByRole('dialog', { name: 'Sipariş #12 iptal edilsin mi?' })
    expect(dialog).toHaveTextContent('iade')
    await userEvent.click(within(dialog).getByRole('button', { name: 'İptal et' }))

    await waitFor(() => expect(cancelled).toBe(true))
    expect(await screen.findByText('İptal edildi')).toBeInTheDocument()
  })

  it('explains a conflict and reloads the order', async () => {
    let gets = 0
    server.use(
      http.get(api('/api/admin/orders/12'), () => {
        gets++
        return HttpResponse.json(detail(gets === 1 ? 'Received' : 'Preparing'))
      }),
      http.post(api('/api/admin/orders/12/advance'), () =>
        HttpResponse.json({ title: 'Sipariş az önce güncellendi. Güncel durumu görmek için sayfayı yenile.', status: 409 }, { status: 409 })),
    )
    at()

    await userEvent.click(await screen.findByRole('button', { name: 'Hazırlamaya başla' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Sipariş az önce güncellendi')
    await waitFor(() => expect(gets).toBe(2))
    expect(await screen.findByRole('button', { name: 'Hazır, müşteriye haber ver' })).toBeInTheDocument()
  })
})
