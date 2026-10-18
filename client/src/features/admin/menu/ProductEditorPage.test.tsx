import { describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../../../test/server'
import { api } from '../../../test/handlers'
import { renderWithProviders } from '../../../test/render'
import type { AdminCategoryDto } from '../../../lib/types'
import { ProductEditorPage } from './ProductEditorPage'

const catalog: AdminCategoryDto[] = [
  {
    id: 1, nameTr: 'Sıcak İçecekler', nameEn: 'Hot Drinks', imageUrl: null, isActive: true, products: [{
      id: 10, categoryId: 1, nameTr: 'Latte', nameEn: 'Latte', descriptionTr: 'Bol sütlü.', descriptionEn: null, price: 180,
      imageUrl: null, isAvailable: true, isFeatured: true, optionGroups: [
        { id: 5, nameTr: 'Süt', nameEn: 'Milk', isRequired: true, maxSelect: 1, options: [
          { id: 101, nameTr: 'Normal', nameEn: 'Regular', priceDelta: 0 },
          { id: 102, nameTr: 'Laktozsuz', nameEn: 'Lactose-free', priceDelta: 20 },
          { id: 103, nameTr: 'Yulaf', nameEn: 'Oat', priceDelta: 30 },
        ] },
      ],
    }],
  },
  { id: 2, nameTr: 'Çaylar', nameEn: 'Teas', imageUrl: null, isActive: true, products: [] },
]

function backend(status = 200, problem?: object) {
  const sent: { method: string; body: Record<string, unknown> }[] = []
  const handler = async ({ request }: { request: Request }) => {
    sent.push({ method: request.method, body: (await request.json()) as Record<string, unknown> })
    return status === 200 ? HttpResponse.json(catalog[0].products[0], { status: request.method === 'POST' ? 201 : 200 }) : HttpResponse.json(problem, { status })
  }
  server.use(
    http.get(api('/api/admin/catalog'), () => HttpResponse.json(catalog)),
    http.put(api('/api/admin/products/10'), handler),
    http.post(api('/api/admin/products'), handler),
  )
  return sent
}

const routes = [{ path: '/admin/menu', element: <p>Menü listesi</p> }]

describe('ProductEditorPage', () => {
  it('keeps option ids when an option price changes', async () => {
    const sent = backend()
    renderWithProviders(<ProductEditorPage />, { path: '/admin/menu/urun/:id', route: '/admin/menu/urun/10', routes })

    const milk = await screen.findByRole('group', { name: 'Seçenek grubu: Süt' })
    const deltas = within(milk).getAllByLabelText(/fiyat farkı/)
    await userEvent.clear(deltas[2])
    await userEvent.type(deltas[2], '35')
    await userEvent.click(screen.getByRole('button', { name: 'Kaydet' }))

    expect(await screen.findByText('Menü listesi')).toBeInTheDocument()
    const body = sent[0].body as { optionGroups: { id: number; options: { id: number; nameTr: string; priceDelta: number }[] }[] }
    expect(sent[0].method).toBe('PUT')
    expect(body.optionGroups[0].id).toBe(5)
    expect(body.optionGroups[0].options[2]).toMatchObject({ id: 103, nameTr: 'Yulaf', priceDelta: 35 })
  })

  it('creates a product in the chosen category and accepts a comma price', async () => {
    const sent = backend()
    renderWithProviders(<ProductEditorPage />, { path: '/admin/menu/urun/yeni', route: '/admin/menu/urun/yeni?kategori=2', routes })

    await userEvent.type(await screen.findByLabelText('Ad (TR)'), 'Adaçayı')
    await userEvent.type(screen.getByLabelText('Fiyat (₺)'), '180,50')
    await userEvent.click(screen.getByRole('button', { name: 'Kaydet' }))

    await waitFor(() => expect(sent).toHaveLength(1))
    expect(sent[0]).toMatchObject({ method: 'POST', body: { categoryId: 2, nameTr: 'Adaçayı', price: 180.5, optionGroups: [] } })
  })

  it('requires an option in every group', async () => {
    const sent = backend()
    renderWithProviders(<ProductEditorPage />, { path: '/admin/menu/urun/yeni', route: '/admin/menu/urun/yeni?kategori=1', routes })

    await userEvent.type(await screen.findByLabelText('Ad (TR)'), 'Mocha')
    await userEvent.type(screen.getByLabelText('Fiyat (₺)'), '200')
    await userEvent.click(screen.getByRole('button', { name: 'Grup ekle' }))
    await userEvent.type(screen.getByLabelText('Grup adı (TR)'), 'Boy')
    await userEvent.click(screen.getByRole('button', { name: 'Kaydet' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Her grupta en az bir seçenek olmalı.')
    expect(sent).toHaveLength(0)
  })

  it('rejects a zero price', async () => {
    backend()
    renderWithProviders(<ProductEditorPage />, { path: '/admin/menu/urun/yeni', route: '/admin/menu/urun/yeni?kategori=1', routes })

    await userEvent.type(await screen.findByLabelText('Ad (TR)'), 'Su')
    await userEvent.type(screen.getByLabelText('Fiyat (₺)'), '0')
    await userEvent.click(screen.getByRole('button', { name: 'Kaydet' }))

    expect(await screen.findByRole('alert')).toHaveTextContent("Fiyat 0'dan büyük olmalı.")
  })

  it('shows the server validation message', async () => {
    backend(400, { title: 'One or more validation errors occurred.', status: 400, errors: { NameTr: ["'Name Tr' must be 60 characters or fewer."] } })
    renderWithProviders(<ProductEditorPage />, { path: '/admin/menu/urun/:id', route: '/admin/menu/urun/10', routes })

    await screen.findByRole('group', { name: 'Seçenek grubu: Süt' })
    await userEvent.click(screen.getByRole('button', { name: 'Kaydet' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('must be 60 characters or fewer')
  })
})
