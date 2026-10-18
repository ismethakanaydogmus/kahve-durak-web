import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/server'
import { api } from '../../test/handlers'
import { renderWithProviders } from '../../test/render'
import { useAuthStore } from '../../stores/authStore'
import type { AddressDto, AddressRequest } from '../../lib/types'
import { AccountPage } from '../account/AccountPage'
import { AddressForm } from './AddressForm'

const neighborhoods = [{ id: 1, name: 'Acıbadem' }, { id: 8, name: 'Bulgurlu' }, { id: 30, name: 'Ünalan' }]

/** In-memory address API, like the real one but per test. */
function addressApi(initial: AddressDto[] = []) {
  let rows = [...initial]
  let nextId = 100
  server.use(
    http.get(api('/api/shop/neighborhoods'), () => HttpResponse.json(neighborhoods)),
    http.get(api('/api/addresses'), () => HttpResponse.json(rows)),
    http.post(api('/api/addresses'), async ({ request }) => {
      const body = (await request.json()) as AddressRequest
      const row: AddressDto = {
        id: nextId++, title: body.title, neighborhoodId: body.neighborhoodId, line: body.line, directions: body.directions ?? null,
        neighborhoodName: neighborhoods.find((n) => n.id === body.neighborhoodId)!.name,
      }
      rows = [row, ...rows]
      return HttpResponse.json(row, { status: 201 })
    }),
    http.delete(api('/api/addresses/:id'), ({ params }) => {
      rows = rows.filter((r) => r.id !== Number(params.id))
      return new HttpResponse(null, { status: 204 })
    }),
    http.get(api('/api/orders'), () => HttpResponse.json([])),
  )
}

const home: AddressDto = { id: 5, title: 'Ev', neighborhoodId: 8, neighborhoodName: 'Bulgurlu', line: 'Demlik Sk. No:10', directions: null }

describe('AddressForm', () => {
  it('lists delivery neighborhoods', async () => {
    addressApi()
    renderWithProviders(<AddressForm onSaved={() => {}} />)

    const select = await screen.findByRole('combobox', { name: 'Mahalle' })
    await waitFor(() =>
      expect(within(select).getAllByRole('option').map((o) => o.textContent)).toEqual(['Mahalle seç', 'Acıbadem', 'Bulgurlu', 'Ünalan']),
    )
  })

  it('rejects a too-short address line before calling the API', async () => {
    addressApi()
    const onSaved = vi.fn()
    renderWithProviders(<AddressForm onSaved={onSaved} />)

    await userEvent.type(screen.getByLabelText('Adres adı'), 'Ev')
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(4))
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Mahalle' }), 'Bulgurlu')
    await userEvent.type(screen.getByLabelText('Sokak, bina, daire'), 'No:1')
    await userEvent.click(screen.getByRole('button', { name: 'Adresi kaydet' }))

    expect(await screen.findByText('Adres en az 5 karakter olmalı.')).toBeInTheDocument()
    expect(onSaved).not.toHaveBeenCalled()
  })

  it('saves and hands back the new address', async () => {
    addressApi()
    const onSaved = vi.fn()
    renderWithProviders(<AddressForm onSaved={onSaved} />)

    await userEvent.type(screen.getByLabelText('Adres adı'), 'İş')
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(4))
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Mahalle' }), 'Ünalan')
    await userEvent.type(screen.getByLabelText('Sokak, bina, daire'), 'Libadiye Cd. No:5')
    await userEvent.click(screen.getByRole('button', { name: 'Adresi kaydet' }))

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ title: 'İş', neighborhoodName: 'Ünalan' })))
  })
})

describe('AccountPage addresses', () => {
  it('deletes an address', async () => {
    addressApi([home])
    useAuthStore.getState().setAuth({
      token: 't', user: { id: 1, firstName: 'Ali', lastName: 'Y', email: 'a@x.com', phone: '', role: 'Customer' },
    })
    renderWithProviders(<AccountPage />)

    const list = await screen.findByRole('region', { name: 'Adreslerim' })
    expect(await within(list).findByText('Demlik Sk. No:10')).toBeInTheDocument()

    await userEvent.click(within(list).getByRole('button', { name: 'Sil' }))

    expect(await within(list).findByText('Kayıtlı adresin yok.')).toBeInTheDocument()
  })
})
