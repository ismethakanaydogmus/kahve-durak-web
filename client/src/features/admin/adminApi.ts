import { ApiError, apiFetch } from '../../lib/api'

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

/** Uploads an image and returns its public URL. The server re-checks size and type from the bytes. */
export async function uploadImage(file: File): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  const { url } = await apiFetch<{ url: string }>('/api/admin/uploads', { method: 'POST', body: form })
  return url
}

export const postJson = <T>(path: string, body: unknown, method: 'POST' | 'PUT' | 'PATCH' = 'POST') =>
  apiFetch<T>(path, { method, body: JSON.stringify(body) })

/** Server problems in one line: the field messages of a validation problem, or its title. */
export function problemText(e: unknown): string {
  if (!(e instanceof ApiError) || !e.problem) return 'Kaydedilemedi. Biraz sonra tekrar dene.'
  const fields = e.problem.errors ? Object.values(e.problem.errors).flat() : []
  return fields.length > 0 ? fields.join(' ') : (e.problem.title ?? 'Kaydedilemedi.')
}
