import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import i18n from '../../i18n'
import { ShopStatusBadge } from './ShopStatusBadge'

// 2026-10-20 01:00Z = Tuesday 04:00 Istanbul.
const now = new Date('2026-10-20T01:00:00Z')

describe('ShopStatusBadge', () => {
  it('shows closing time when open', () => {
    render(<ShopStatusBadge status={{ isOpen: true, closesAt: '2026-10-20T00:00:00+00:00', nextOpensAt: null }} now={now} />)

    expect(screen.getByText("Şu an açık · 03:00'e kadar")).toBeInTheDocument()
  })

  it('shows opening time when closed and opening later today', () => {
    render(<ShopStatusBadge status={{ isOpen: false, closesAt: null, nextOpensAt: '2026-10-20T07:00:00+00:00' }} now={now} />)

    expect(screen.getByText("Şu an kapalı · 10:00'da açılıyor")).toBeInTheDocument()
  })

  it('names the day when opening on another day', () => {
    render(<ShopStatusBadge status={{ isOpen: false, closesAt: null, nextOpensAt: '2026-10-21T07:00:00+00:00' }} now={now} />)

    expect(screen.getByText("Şu an kapalı · Çarşamba 10:00'da açılıyor")).toBeInTheDocument()
  })

  it('renders in English', async () => {
    await i18n.changeLanguage('en')
    render(<ShopStatusBadge status={{ isOpen: true, closesAt: '2026-10-20T00:00:00+00:00', nextOpensAt: null }} now={now} />)

    expect(screen.getByText('Open now · until 03:00')).toBeInTheDocument()
  })
})
