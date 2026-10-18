import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse, delay } from 'msw'
import { server } from '../../test/server'
import { api } from '../../test/handlers'
import { espresso, latte } from '../../test/fixtures'
import { renderWithProviders } from '../../test/render'
import { useCartStore } from '../../stores/cartStore'
import type { AddressDto, CheckoutRequest, QuoteDto } from '../../lib/types'
import { redirectTo } from '../../lib/redirect'
import { CheckoutPage } from './CheckoutPage'

vi.mock('../../lib/redirect', () => ({ redirectTo: vi.fn() }))

const addresses: AddressDto[] = [
  { id: 5, title: 'Ev', neighborhoodId: 8, neighborhoodName: 'Bulgurlu', line: 'Demlik Sk. No:10', directions: null },
  { id: 6, title: 'İş', neighborhoodId: 30, neighborhoodName: 'Ünalan', line: 'Libadiye Cd. No:5', directions: null },
]

const quote = (over: Partial<QuoteDto> = {}): QuoteDto => ({
  lines: [{ productId: 2, nameTr: 'Latte', nameEn: 'Latte', options: [{ nameTr: 'Yulaf', nameEn: 'Oat' }], unitPrice: 210, quantity: 1, lineTotal: 210 }],
  subtotal: 210, deliveryFee: 0, total: 210, minOrderAmount: 200, errors: [], canOrder: true, ...over,
})

let quoteRequests: CheckoutRequest[] = []

function backend(respond: (req: CheckoutRequest) => QuoteDto = () => quote()) {
  quoteRequests = []
  server.use(
    http.get(api('/api/addresses'), () => HttpResponse.json(addresses)),
    http.get(api('/api/shop/neighborhoods'), () => HttpResponse.json([])),
    http.post(api('/api/orders/quote'), async ({ request }) => {
      const body = (await request.json()) as CheckoutRequest
      quoteRequests.push(body)
      return HttpResponse.json(respond(body))
    }),
  )
}

describe('CheckoutPage', () => {
  beforeEach(() => {
    vi.mocked(redirectTo).mockReset()
    useCartStore.getState().add(latte, [102], 1)
  })

  it('shows the server total, not the cart estimate, for pickup', async () => {
    backend(() => quote({ subtotal: 999, total: 999, lines: [{ ...quote().lines[0], unitPrice: 999, lineTotal: 999 }] }))
    renderWithProviders(<CheckoutPage />)

    const summary = await screen.findByRole('region', { name: 'Sipariş özeti' })
    await waitFor(() => expect(within(summary).getByText('Toplam').parentElement).toHaveTextContent('₺999,00'))
    expect(within(summary).queryByText('Teslimat ücreti')).not.toBeInTheDocument()
    expect(quoteRequests.at(-1)).toMatchObject({ fulfilment: 'Pickup', addressId: null, items: [{ productId: 2, optionIds: [102], quantity: 1 }] })
  })

  it('selects the first saved address for delivery and quotes with it', async () => {
    backend((req) => quote(req.fulfilment === 'Delivery' ? { deliveryFee: 30, total: 240 } : {}))
    renderWithProviders(<CheckoutPage />)

    await userEvent.click(await screen.findByRole('radio', { name: /Adrese teslim/ }))

    expect(await screen.findByRole('radio', { name: /Ev/ })).toBeChecked()
    await waitFor(() => expect(quoteRequests.at(-1)).toMatchObject({ fulfilment: 'Delivery', addressId: 5 }))
    expect(await screen.findByText('Teslimat ücreti')).toBeInTheDocument()
  })

  it('explains the delivery minimum and blocks payment', async () => {
    useCartStore.getState().clear()
    useCartStore.getState().add(espresso, [11], 1)
    backend(() => quote({ subtotal: 105, deliveryFee: 30, total: 135, errors: [{ code: 'BELOW_MINIMUM', productId: null }], canOrder: false }))
    renderWithProviders(<CheckoutPage />)

    expect(await screen.findByText('Adrese teslim için en az ₺200,00 sipariş gerekli. ₺95,00 daha ekle.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Öde/ })).toBeDisabled()
  })

  it('lets the customer remove an item that is no longer available', async () => {
    backend(() => quote({ errors: [{ code: 'PRODUCT_UNAVAILABLE', productId: 2 }], canOrder: false }))
    renderWithProviders(<CheckoutPage />)

    await userEvent.click(await screen.findByRole('button', { name: 'Sepetten çıkar' }))

    expect(useCartStore.getState().lines).toEqual([])
  })

  it('creates one order and goes to the payment page', async () => {
    backend()
    let creates = 0
    server.use(http.post(api('/api/orders'), async () => {
      creates++
      await delay(50)
      return HttpResponse.json({ orderId: 42, paymentPageUrl: 'https://pay.test/42' }, { status: 201 })
    }))
    renderWithProviders(<CheckoutPage />)

    const pay = await screen.findByRole('button', { name: 'Öde · ₺210,00' })
    await waitFor(() => expect(pay).toBeEnabled())
    await userEvent.dblClick(pay)

    await waitFor(() => expect(redirectTo).toHaveBeenCalledWith('https://pay.test/42'))
    expect(creates).toBe(1)
  })

  it('shows the reason when the order is refused', async () => {
    backend()
    server.use(http.post(api('/api/orders'), () =>
      HttpResponse.json(quote({ errors: [{ code: 'SHOP_CLOSED', productId: null }], canOrder: false }), { status: 422 })))
    renderWithProviders(<CheckoutPage />)

    const pay = await screen.findByRole('button', { name: 'Öde · ₺210,00' })
    await waitFor(() => expect(pay).toBeEnabled())
    await userEvent.click(pay)

    expect(await screen.findByText('Kafe şu an kapalı.')).toBeInTheDocument()
    expect(redirectTo).not.toHaveBeenCalled()
  })

  it('goes back to the menu when the cart is empty', async () => {
    useCartStore.getState().clear()
    backend()
    const { router } = renderWithProviders(<CheckoutPage />, { routes: [{ path: '/menu', element: <p>Menü sayfası</p> }] })

    expect(await screen.findByText('Menü sayfası')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/menu')
  })
})

describe('CheckoutPage after a refusal', () => {
  it('lets the customer pay again once they change the order', async () => {
    useCartStore.getState().add(latte, [102], 1)
    backend()
    let attempt = 0
    server.use(http.post(api('/api/orders'), () => {
      attempt++
      return attempt === 1
        ? HttpResponse.json(quote({ errors: [{ code: 'NOTE_TOO_LONG', productId: null }], canOrder: false }), { status: 422 })
        : HttpResponse.json({ orderId: 43, paymentPageUrl: 'https://pay.test/43' }, { status: 201 })
    }))
    renderWithProviders(<CheckoutPage />)

    const pay = await screen.findByRole('button', { name: 'Öde · ₺210,00' })
    await waitFor(() => expect(pay).toBeEnabled())
    await userEvent.click(pay)
    expect(await screen.findByText('Not en fazla 500 karakter olabilir.')).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('Sipariş notu (isteğe bağlı)'), 'x')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Öde · ₺210,00' })).toBeEnabled())
    await userEvent.click(screen.getByRole('button', { name: 'Öde · ₺210,00' }))

    await waitFor(() => expect(redirectTo).toHaveBeenCalledWith('https://pay.test/43'))
  })
})
