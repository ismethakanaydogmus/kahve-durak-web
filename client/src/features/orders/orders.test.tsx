import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/server'
import { api } from '../../test/handlers'
import { latte } from '../../test/fixtures'
import { renderWithProviders } from '../../test/render'
import { useAuthStore } from '../../stores/authStore'
import { useCartStore } from '../../stores/cartStore'
import type { OrderDetailDto, OrderSummaryDto } from '../../lib/types'
import { AccountPage } from '../account/AccountPage'
import { OrderDetailPage } from './OrderDetailPage'

const order = (over: Partial<OrderDetailDto> = {}): OrderDetailDto => ({
  id: 7, status: 'Received', fulfilment: 'Pickup',
  items: [{ nameTr: 'Latte', nameEn: 'Latte', options: [{ nameTr: 'Yulaf', nameEn: 'Oat' }], unitPrice: 210, quantity: 2, lineTotal: 420 }],
  subtotal: 420, deliveryFee: 0, total: 420, note: null, address: null,
  history: [{ status: 'PendingPayment', at: '2026-10-19T09:00:00Z' }, { status: 'Received', at: '2026-10-19T09:01:00Z' }],
  createdAt: '2026-10-19T09:00:00Z', ...over,
})

const serve = (detail: OrderDetailDto | null) =>
  server.use(http.get(api('/api/orders/:id'), () => (detail ? HttpResponse.json(detail) : new HttpResponse(null, { status: 404 }))))

const at = (route: string) => renderWithProviders(<OrderDetailPage />, { path: '/siparis/:id', route })

describe('OrderDetailPage', () => {
  it('confirms a successful payment and empties the cart', async () => {
    useCartStore.getState().add(latte, [102], 2)
    serve(order())
    at('/siparis/7?odeme=basarili')

    expect(await screen.findByText('Ödemen alındı')).toBeInTheDocument()
    expect(useCartStore.getState().lines).toEqual([])
    expect(screen.getByRole('heading', { name: 'Sipariş #7' })).toBeInTheDocument()
    expect(screen.getByText('Yulaf')).toBeInTheDocument()
  })

  it('keeps the cart and offers a retry after a failed payment', async () => {
    useCartStore.getState().add(latte, [102], 2)
    serve(order({ status: 'PaymentFailed', history: [{ status: 'PendingPayment', at: '2026-10-19T09:00:00Z' }, { status: 'PaymentFailed', at: '2026-10-19T09:01:00Z' }] }))
    at('/siparis/7?odeme=basarisiz')

    expect(await screen.findByText('Ödeme tamamlanamadı')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Tekrar dene' })).toHaveAttribute('href', '/odeme')
    expect(useCartStore.getState().lines).toHaveLength(1)
  })

  it('shows the delivery steps with the finished ones marked', async () => {
    serve(order({
      fulfilment: 'Delivery', status: 'Preparing', deliveryFee: 30, total: 450,
      address: { title: 'Ev', neighborhood: 'Bulgurlu', line: 'Demlik Sk. No:10', directions: null },
      history: [
        { status: 'PendingPayment', at: '2026-10-19T09:00:00Z' },
        { status: 'Received', at: '2026-10-19T09:01:00Z' },
        { status: 'Preparing', at: '2026-10-19T09:05:00Z' },
      ],
    }))
    at('/siparis/7')

    const steps = within(await screen.findByRole('list', { name: 'Sipariş durumu' })).getAllByRole('listitem')
    expect(steps.map((s) => s.querySelector('[data-step-label]')?.textContent)).toEqual(['Alındı', 'Hazırlanıyor', 'Yolda', 'Teslim edildi'])
    expect(steps.map((s) => s.dataset.state)).toEqual(['done', 'current', 'todo', 'todo'])
    expect(steps[1]).toHaveAttribute('aria-current', 'step')
    expect(steps[1]).toHaveTextContent('12:05')
    expect(screen.getByText(/Demlik Sk. No:10/)).toBeInTheDocument()
  })

  it('says when the order does not exist', async () => {
    serve(null)
    at('/siparis/999')

    expect(await screen.findByText('Sipariş bulunamadı.')).toBeInTheDocument()
  })
})

describe('AccountPage orders', () => {
  it('lists orders with status and links', async () => {
    const summaries: OrderSummaryDto[] = [
      { id: 9, status: 'Preparing', fulfilment: 'Delivery', total: 450, itemCount: 2, createdAt: '2026-10-19T09:00:00Z' },
      { id: 7, status: 'Completed', fulfilment: 'Pickup', total: 180, itemCount: 1, createdAt: '2026-10-18T09:00:00Z' },
    ]
    server.use(
      http.get(api('/api/orders'), () => HttpResponse.json(summaries)),
      http.get(api('/api/addresses'), () => HttpResponse.json([])),
    )
    useAuthStore.getState().setAuth({
      token: 't', user: { id: 1, firstName: 'Ali', lastName: 'Y', email: 'a@x.com', phone: '', role: 'Customer' },
    })
    renderWithProviders(<AccountPage />)

    const list = await screen.findByRole('region', { name: 'Siparişlerim' })
    const first = await within(list).findByRole('link', { name: /Sipariş #9/ })
    expect(first).toHaveAttribute('href', '/siparis/9')
    expect(first).toHaveTextContent('Hazırlanıyor')
    expect(first).toHaveTextContent('₺450,00')
    expect(within(list).getByRole('link', { name: /Sipariş #7/ })).toHaveTextContent('Teslim edildi')
  })
})

describe('OrderDetailPage while the payment is being checked', () => {
  it('says the payment is being checked and keeps the cart', async () => {
    useCartStore.getState().add(latte, [102], 1)
    serve(order({ status: 'PendingPayment', history: [{ status: 'PendingPayment', at: '2026-10-19T09:00:00Z' }] }))
    at('/siparis/7?odeme=kontrol')

    expect(await screen.findByText('Ödemen kontrol ediliyor')).toBeInTheDocument()
    expect(useCartStore.getState().lines).toHaveLength(1)
    expect(screen.queryByText('Ödeme tamamlanamadı')).not.toBeInTheDocument()
  })

  it('empties the cart once a checked payment turns out paid', async () => {
    useCartStore.getState().add(latte, [102], 1)
    serve(order({ status: 'Received' }))
    at('/siparis/7?odeme=kontrol')

    expect(await screen.findByText('Ödemen alındı')).toBeInTheDocument()
    expect(useCartStore.getState().lines).toEqual([])
  })

  it('does not claim the card was not charged after a failure', async () => {
    serve(order({ status: 'PaymentFailed' }))
    at('/siparis/7?odeme=basarisiz')

    await screen.findByText('Ödeme tamamlanamadı')
    expect(document.body.textContent).not.toContain('para çekilmedi')
  })
})
