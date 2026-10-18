import { describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../../../test/server'
import { api } from '../../../test/handlers'
import { renderWithProviders } from '../../../test/render'
import type { AdminSlideDto, AdminTestimonialDto } from '../../../lib/types'
import { AdminContentPage } from './AdminContentPage'

function contentApi() {
  let slides: AdminSlideDto[] = [
    { id: 1, titleTr: 'Mahallenin kahve durağı', titleEn: null, subtitleTr: null, subtitleEn: null, imageUrl: '/seed/slide-1.svg', linkUrl: '/menu', isActive: true },
  ]
  let reviews: AdminTestimonialDto[] = [{ id: 7, authorName: 'Zeynep K.', text: 'Çok keyifli bir kafe.', rating: 5, isPublished: true }]
  const sent: { method: string; path: string; body: Record<string, unknown> }[] = []
  const record = async (request: Request) => {
    const body = (await request.json()) as Record<string, unknown>
    sent.push({ method: request.method, path: new URL(request.url).pathname, body })
    return body
  }
  server.use(
    http.get(api('/api/admin/slides'), () => HttpResponse.json(slides)),
    http.get(api('/api/admin/testimonials'), () => HttpResponse.json(reviews)),
    http.post(api('/api/admin/uploads'), () => HttpResponse.json({ url: 'http://localhost:5080/uploads/new.png' }, { status: 201 })),
    http.post(api('/api/admin/slides'), async ({ request }) => {
      const body = await record(request)
      slides = [...slides, { ...(body as unknown as AdminSlideDto), id: 2 }]
      return HttpResponse.json(slides.at(-1), { status: 201 })
    }),
    http.put(api('/api/admin/testimonials/:id'), async ({ request }) => {
      const body = await record(request)
      reviews = reviews.map((r) => ({ ...r, ...(body as object) }))
      return HttpResponse.json(reviews[0])
    }),
    http.post(api('/api/admin/testimonials'), async ({ request }) => {
      const body = await record(request)
      reviews = [...reviews, { ...(body as unknown as AdminTestimonialDto), id: 8 }]
      return HttpResponse.json(reviews.at(-1), { status: 201 })
    }),
  )
  return sent
}

describe('AdminContentPage', () => {
  it('adds a slide only with an image', async () => {
    const sent = contentApi()
    renderWithProviders(<AdminContentPage />)

    await userEvent.click(await screen.findByRole('button', { name: 'Slayt ekle' }))
    const dialog = screen.getByRole('dialog', { name: 'Yeni slayt' })
    await userEvent.type(within(dialog).getByLabelText('Başlık (TR)'), 'Kış menüsü')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Kaydet' }))
    expect(await within(dialog).findByText('Görsel zorunlu.')).toBeInTheDocument()

    await userEvent.upload(within(dialog).getByLabelText('Slayt görseli'), new File([new Uint8Array(10)], 's.png', { type: 'image/png' }))
    await waitFor(() => expect(within(dialog).getByRole('img', { name: 'Slayt görseli' })).toBeInTheDocument())
    await userEvent.click(within(dialog).getByRole('button', { name: 'Kaydet' }))

    expect(await screen.findByText('Kış menüsü')).toBeInTheDocument()
    expect(sent[0]).toMatchObject({ method: 'POST', body: { titleTr: 'Kış menüsü', imageUrl: 'http://localhost:5080/uploads/new.png', linkUrl: '/menu', isActive: true } })
  })

  it('unpublishes a review', async () => {
    const sent = contentApi()
    renderWithProviders(<AdminContentPage />)

    await userEvent.click(await screen.findByRole('switch', { name: 'Yayında: Zeynep K.' }))

    await waitFor(() => expect(sent).toContainEqual(expect.objectContaining({ method: 'PUT', path: '/api/admin/testimonials/7', body: expect.objectContaining({ isPublished: false }) })))
  })

  it('adds a review with a rating', async () => {
    const sent = contentApi()
    renderWithProviders(<AdminContentPage />)

    await userEvent.click(await screen.findByRole('button', { name: 'Yorum ekle' }))
    const dialog = screen.getByRole('dialog', { name: 'Yeni yorum' })
    await userEvent.type(within(dialog).getByLabelText('Ad'), 'Can B.')
    await userEvent.type(within(dialog).getByLabelText('Yorum'), 'Latte harika.')
    await userEvent.click(within(dialog).getByRole('radio', { name: '4 yıldız' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Kaydet' }))

    await waitFor(() => expect(sent[0]).toMatchObject({ method: 'POST', body: { authorName: 'Can B.', text: 'Latte harika.', rating: 4, isPublished: true } }))
  })
})
