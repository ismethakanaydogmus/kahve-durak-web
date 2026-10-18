import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/server'
import { api } from '../../test/handlers'
import { renderWithProviders } from '../../test/render'
import { ImageUpload } from './ImageUpload'

const png = (size = 100) => new File([new Uint8Array(size)], 'foto.png', { type: 'image/png' })

describe('ImageUpload', () => {
  it('uploads the chosen file and reports its url', async () => {
    let contentType: string | null = null
    server.use(http.post(api('/api/admin/uploads'), ({ request }) => {
      contentType = request.headers.get('content-type')
      return HttpResponse.json({ url: 'http://localhost:5080/uploads/abc.png' }, { status: 201 })
    }))
    const onChange = vi.fn()
    renderWithProviders(<ImageUpload label="Ürün görseli" value={null} onChange={onChange} />)

    await userEvent.upload(screen.getByLabelText('Ürün görseli'), png())

    await waitFor(() => expect(onChange).toHaveBeenCalledWith('http://localhost:5080/uploads/abc.png'))
    expect(contentType).toMatch(/^multipart\/form-data/)
  })

  it('rejects big or unsupported files before uploading', async () => {
    let calls = 0
    server.use(http.post(api('/api/admin/uploads'), () => { calls++; return HttpResponse.json({ url: 'x' }, { status: 201 }) }))
    renderWithProviders(<ImageUpload label="Ürün görseli" value={null} onChange={() => {}} />)
    const input = screen.getByLabelText('Ürün görseli')

    await userEvent.upload(input, png(6 * 1024 * 1024))
    expect(await screen.findByText('Görsel en fazla 5 MB olabilir.')).toBeInTheDocument()

    await userEvent.upload(input, new File(['GIF89a'], 'a.gif', { type: 'image/gif' }), { applyAccept: false })
    expect(await screen.findByText('Sadece JPG, PNG ya da WebP yükleyebilirsin.')).toBeInTheDocument()
    expect(calls).toBe(0)
  })

  it('shows the server message when the upload is refused', async () => {
    server.use(http.post(api('/api/admin/uploads'), () =>
      HttpResponse.json({ title: 'Sadece JPG, PNG ya da WebP yükleyebilirsin.', status: 400 }, { status: 400 })))
    renderWithProviders(<ImageUpload label="Ürün görseli" value={null} onChange={() => {}} />)

    await userEvent.upload(screen.getByLabelText('Ürün görseli'), png())

    expect(await screen.findByRole('alert')).toHaveTextContent('Sadece JPG, PNG ya da WebP')
  })

  it('shows the current image and can remove it', async () => {
    const onChange = vi.fn()
    renderWithProviders(<ImageUpload label="Ürün görseli" value="http://localhost:5080/uploads/abc.png" onChange={onChange} />)

    expect(screen.getByRole('img', { name: 'Ürün görseli' })).toHaveAttribute('src', 'http://localhost:5080/uploads/abc.png')
    await userEvent.click(screen.getByRole('button', { name: 'Kaldır' }))
    expect(onChange).toHaveBeenCalledWith(null)
  })
})
