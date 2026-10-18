import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse, delay } from 'msw'
import i18n from '../../i18n'
import { server } from '../../test/server'
import { api } from '../../test/handlers'
import { homeFixture } from '../../test/fixtures'
import { renderWithProviders } from '../../test/render'
import { HomePage } from './HomePage'

describe('HomePage', () => {
  it('renders slides, categories, featured products, reviews and contact', async () => {
    renderWithProviders(<HomePage />)

    expect(await screen.findByRole('heading', { name: 'Mahallenin kahve durağı' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Soğuk kahve sezonu: Cold Brew' })).toBeInTheDocument()

    const categories = screen.getByRole('region', { name: 'Ne içmek istersin?' })
    for (const name of ['Sıcak İçecekler', 'Soğuk Kahveler', 'Soğuk İçecekler', 'Çaylar']) {
      expect(within(categories).getByRole('link', { name: new RegExp(name) })).toBeInTheDocument()
    }

    const featured = screen.getByRole('region', { name: 'Öne çıkanlar' })
    const latteCard = within(featured).getByRole('link', { name: /Latte/ })
    expect(latteCard).toHaveTextContent('₺180,00')
    expect(latteCard).toHaveAttribute('href', '/menu?urun=2')

    expect(screen.getByText("Mahallenin en iyi latte'si.")).toBeInTheDocument()
    expect(screen.getByText('Google Haritalar yorumlarından')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '+90 555 000 0000' })).toHaveAttribute('href', 'tel:+905550000000')
  })

  it('shows a loading placeholder while fetching', async () => {
    server.use(http.get(api('/api/home'), async () => { await delay('infinite'); return HttpResponse.json(homeFixture) }))
    renderWithProviders(<HomePage />)

    expect(await screen.findByRole('status')).toBeInTheDocument()
  })

  it('shows an error with retry that recovers', async () => {
    let calls = 0
    server.use(http.get(api('/api/home'), () => {
      calls++
      return calls === 1 ? new HttpResponse(null, { status: 500 }) : HttpResponse.json(homeFixture)
    }))
    renderWithProviders(<HomePage />)

    await userEvent.click(await screen.findByRole('button', { name: 'Tekrar dene' }))

    expect(await screen.findByRole('heading', { name: 'Mahallenin kahve durağı' })).toBeInTheDocument()
  })

  it('falls back to the Turkish name when English is missing', async () => {
    await i18n.changeLanguage('en')
    renderWithProviders(<HomePage />)

    const featured = await screen.findByRole('region', { name: 'Featured' })
    expect(within(featured).getByRole('link', { name: /Lotuslu Sıcak Çikolata/ })).toBeInTheDocument()
    expect(within(featured).getByRole('link', { name: /Cold Brew/ })).toBeInTheDocument()
  })
})

describe('HomePage deep link', () => {
  it('scrolls to the contact section for /#iletisim once loaded', async () => {
    const scroll = vi.spyOn(Element.prototype, 'scrollIntoView')
    renderWithProviders(<HomePage />, { route: '/#iletisim' })

    await screen.findByRole('heading', { name: 'Bizi bul' })

    await waitFor(() => expect(scroll.mock.contexts).toContain(document.getElementById('iletisim')))
    scroll.mockRestore()
  })
})
