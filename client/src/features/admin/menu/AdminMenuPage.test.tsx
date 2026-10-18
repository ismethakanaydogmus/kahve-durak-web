import { describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../../../test/server'
import { api } from '../../../test/handlers'
import { renderWithProviders } from '../../../test/render'
import type { AdminCategoryDto, AdminProductDto } from '../../../lib/types'
import { AdminMenuPage } from './AdminMenuPage'

const product = (id: number, categoryId: number, nameTr: string, over: Partial<AdminProductDto> = {}): AdminProductDto => ({
  id, categoryId, nameTr, nameEn: nameTr, descriptionTr: null, descriptionEn: null, price: 180, imageUrl: null,
  isAvailable: true, isFeatured: false, optionGroups: [], ...over,
})

function catalogApi() {
  let catalog: AdminCategoryDto[] = [
    { id: 1, nameTr: 'Sıcak İçecekler', nameEn: 'Hot Drinks', imageUrl: null, isActive: true,
      products: [product(10, 1, 'Latte', { isFeatured: true }), product(11, 1, 'Mocha', { price: 200 })] },
    { id: 2, nameTr: 'Çaylar', nameEn: 'Teas', imageUrl: null, isActive: false, products: [] },
  ]
  const calls: { method: string; path: string; body: unknown }[] = []
  const record = async (request: Request) => {
    const body = request.headers.get('content-type')?.includes('json') ? await request.json() : null
    calls.push({ method: request.method, path: new URL(request.url).pathname, body })
    return body
  }
  server.use(
    http.get(api('/api/admin/catalog'), () => HttpResponse.json(catalog)),
    http.patch(api('/api/admin/products/:id/availability'), async ({ request }) => { await record(request); return new HttpResponse(null, { status: 204 }) }),
    http.post(api('/api/admin/categories/reorder'), async ({ request }) => { await record(request); return new HttpResponse(null, { status: 204 }) }),
    http.post(api('/api/admin/categories'), async ({ request }) => {
      const body = (await record(request)) as { nameTr: string }
      catalog = [...catalog, { id: 3, nameTr: body.nameTr, nameEn: null, imageUrl: null, isActive: true, products: [] }]
      return HttpResponse.json(catalog.at(-1), { status: 201 })
    }),
    http.delete(api('/api/admin/categories/:id'), async ({ request }) => {
      await record(request)
      return HttpResponse.json({ title: 'Bu kategoride ürün var. Önce ürünleri taşı ya da sil.', status: 409 }, { status: 409 })
    }),
  )
  return calls
}

describe('AdminMenuPage', () => {
  it('lists categories with their products', async () => {
    catalogApi()
    renderWithProviders(<AdminMenuPage />)

    const hot = await screen.findByRole('region', { name: 'Sıcak İçecekler' })
    expect(within(hot).getByText('Latte')).toBeInTheDocument()
    expect(within(hot).getByText('₺200,00')).toBeInTheDocument()
    expect(within(hot).getByText('Öne çıkan')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Çaylar' })).getByText('Pasif')).toBeInTheDocument()
    expect(within(hot).getByRole('link', { name: 'Latte ürününü düzenle' })).toHaveAttribute('href', '/admin/menu/urun/10')
  })

  it('marks a product sold out', async () => {
    const calls = catalogApi()
    renderWithProviders(<AdminMenuPage />)

    await userEvent.click(await screen.findByRole('switch', { name: 'Tükendi: Latte' }))

    await waitFor(() => expect(calls).toContainEqual({ method: 'PATCH', path: '/api/admin/products/10/availability', body: { isAvailable: false } }))
  })

  it('moves a category down', async () => {
    const calls = catalogApi()
    renderWithProviders(<AdminMenuPage />)

    await userEvent.click(await screen.findByRole('button', { name: 'Sıcak İçecekler kategorisini aşağı taşı' }))

    await waitFor(() => expect(calls).toContainEqual({ method: 'POST', path: '/api/admin/categories/reorder', body: { ids: [2, 1] } }))
  })

  it('explains why a category with products cannot be deleted', async () => {
    catalogApi()
    renderWithProviders(<AdminMenuPage />)

    await userEvent.click(await screen.findByRole('button', { name: 'Sıcak İçecekler kategorisini sil' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Sil' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Bu kategoride ürün var')
  })

  it('adds a category', async () => {
    catalogApi()
    renderWithProviders(<AdminMenuPage />)

    await userEvent.click(await screen.findByRole('button', { name: 'Kategori ekle' }))
    const dialog = screen.getByRole('dialog', { name: 'Yeni kategori' })
    await userEvent.type(within(dialog).getByLabelText('Ad (TR)'), 'Tatlılar')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Kaydet' }))

    expect(await screen.findByRole('region', { name: 'Tatlılar' })).toBeInTheDocument()
  })
})
