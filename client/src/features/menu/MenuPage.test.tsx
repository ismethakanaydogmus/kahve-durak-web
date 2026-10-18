import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/server'
import { api } from '../../test/handlers'
import { renderWithProviders } from '../../test/render'
import { MenuPage } from './MenuPage'

describe('MenuPage', () => {
  afterEach(() => vi.restoreAllMocks())

  it('lists category tabs in order and scrolls to a section when one is clicked', async () => {
    const scroll = vi.spyOn(Element.prototype, 'scrollIntoView')
    renderWithProviders(<MenuPage />, { route: '/menu' })

    const nav = await screen.findByRole('navigation', { name: 'Menü' })
    const tabs = within(nav).getAllByRole('button').map((b) => b.textContent)
    expect(tabs).toEqual(['Sıcak İçecekler', 'Soğuk Kahveler', 'Soğuk İçecekler', 'Çaylar'])

    await userEvent.click(within(nav).getByRole('button', { name: 'Çaylar' }))

    expect(scroll).toHaveBeenCalled()
    expect(scroll.mock.contexts.at(-1)).toBe(document.getElementById('cat-4'))
  })

  it('marks unavailable products as sold out', async () => {
    renderWithProviders(<MenuPage />, { route: '/menu' })

    const soda = await screen.findByRole('article', { name: /Soda/ })
    expect(soda).toHaveAttribute('aria-disabled', 'true')
    expect(within(soda).getByText('Tükendi')).toBeInTheDocument()
  })

  it('shows a starting price for products whose options change the price', async () => {
    renderWithProviders(<MenuPage />, { route: '/menu' })

    const espresso = await screen.findByRole('article', { name: /Espresso/ })
    expect(espresso).toHaveTextContent('₺105,00 ve üzeri')
    const tea = screen.getByRole('article', { name: /Çay/ })
    expect(tea).toHaveTextContent('₺50,00')
    expect(tea).not.toHaveTextContent('ve üzeri')
  })

  it('scrolls to the category in the URL hash on load', async () => {
    const scroll = vi.spyOn(Element.prototype, 'scrollIntoView')
    renderWithProviders(<MenuPage />, { route: '/menu#cat-2' })

    await screen.findByRole('navigation', { name: 'Menü' })

    await waitFor(() => expect(scroll.mock.contexts).toContain(document.getElementById('cat-2')))
  })

  it('shows an error state when the menu fails to load', async () => {
    server.use(http.get(api('/api/menu'), () => new HttpResponse(null, { status: 500 })))
    renderWithProviders(<MenuPage />, { route: '/menu' })

    expect(await screen.findByRole('button', { name: 'Tekrar dene' })).toBeInTheDocument()
  })
})

describe('MenuPage product dialog', () => {
  it('opens the product named in ?urun', async () => {
    renderWithProviders(<MenuPage />, { route: '/menu?urun=2' })

    expect(await screen.findByRole('dialog', { name: 'Latte' })).toBeInTheDocument()
  })

  it('opens a product when its card is clicked, but not a sold-out one', async () => {
    renderWithProviders(<MenuPage />, { route: '/menu' })

    await userEvent.click(await screen.findByRole('article', { name: /Soda/ }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Espresso Yoğun espresso/ }))
    expect(await screen.findByRole('dialog', { name: 'Espresso' })).toBeInTheDocument()
  })
})

describe('MenuPage add to cart', () => {
  it('announces the item was added', async () => {
    renderWithProviders(<MenuPage />, { route: '/menu?urun=2' })

    await userEvent.click(await screen.findByRole('button', { name: 'Sepete ekle · ₺180,00' }))

    expect(await screen.findByText('Sepete eklendi')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
