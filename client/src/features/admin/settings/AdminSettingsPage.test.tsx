import { describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../../../test/server'
import { api } from '../../../test/handlers'
import { renderWithProviders } from '../../../test/render'
import type { ShopSettingsDto } from '../../../lib/types'
import { AdminSettingsPage } from './AdminSettingsPage'

const settings = (): ShopSettingsDto => ({
  deliveryFee: 30, minOrderAmount: 200, phone: '+90 555 000 0000', address: 'Bulgurlu, Demlik Sk. No:4A',
  mapEmbedUrl: 'https://www.google.com/maps?q=uskudar&output=embed',
  openingHours: [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, opens: '10:00', closes: '03:00', isClosed: false })),
  neighborhoods: [{ id: 1, name: 'Acıbadem', isActive: true }, { id: 8, name: 'Bulgurlu', isActive: true }],
})

function backend(status = 200) {
  const sent: ShopSettingsDto[] = []
  server.use(
    http.get(api('/api/admin/settings'), () => HttpResponse.json(settings())),
    http.put(api('/api/admin/settings'), async ({ request }) => {
      const body = (await request.json()) as ShopSettingsDto
      sent.push(body)
      return status === 200
        ? HttpResponse.json(body)
        : HttpResponse.json({ title: 'One or more validation errors occurred.', errors: { MapEmbedUrl: ["Harita linki Google Maps'ten olmalı."] } }, { status })
    }),
  )
  return sent
}

describe('AdminSettingsPage', () => {
  it('saves hours and the delivery fee', async () => {
    const sent = backend()
    renderWithProviders(<AdminSettingsPage />)

    const monday = await screen.findByRole('group', { name: 'Pazartesi' })
    await userEvent.click(within(monday).getByRole('switch', { name: 'Pazartesi açık' }))
    const fee = screen.getByLabelText('Teslimat ücreti (₺)')
    await userEvent.clear(fee)
    await userEvent.type(fee, '40')
    await userEvent.click(screen.getByRole('button', { name: 'Kaydet' }))

    expect(await screen.findByText('Ayarlar kaydedildi.')).toBeInTheDocument()
    expect(sent[0].deliveryFee).toBe(40)
    expect(sent[0].openingHours.find((h) => h.day === 1)).toMatchObject({ isClosed: true })
    expect(sent[0].openingHours.find((h) => h.day === 2)).toMatchObject({ isClosed: false, opens: '10:00', closes: '03:00' })
  })

  it('notes when closing time is the next day', async () => {
    backend()
    renderWithProviders(<AdminSettingsPage />)

    expect(within(await screen.findByRole('group', { name: 'Salı' })).getByText('ertesi gün')).toBeInTheDocument()
  })

  it('switches every neighborhood off at once', async () => {
    const sent = backend()
    renderWithProviders(<AdminSettingsPage />)

    await userEvent.click(await screen.findByRole('button', { name: 'Hiçbiri' }))
    expect(screen.getByRole('checkbox', { name: 'Bulgurlu' })).not.toBeChecked()
    await userEvent.click(screen.getByRole('button', { name: 'Kaydet' }))

    await waitFor(() => expect(sent[0].neighborhoods.every((n) => !n.isActive)).toBe(true))
  })

  it('shows the server validation message', async () => {
    backend(400)
    renderWithProviders(<AdminSettingsPage />)

    await screen.findByRole('group', { name: 'Pazartesi' })
    await userEvent.click(screen.getByRole('button', { name: 'Kaydet' }))

    expect(await screen.findByRole('alert')).toHaveTextContent("Harita linki Google Maps'ten olmalı.")
  })
})
