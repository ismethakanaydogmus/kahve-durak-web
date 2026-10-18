import { useId, useState } from 'react'
import { Modal } from '../../../components/ui/Modal'
import { buttonClass } from '../../../components/ui/buttonClass'
import type { AdminTestimonialDto } from '../../../lib/types'
import { FormField } from '../../auth/FormField'
import { send, useContentMutation } from './useAdminContent'

export function TestimonialDialog({ initial, onClose }: { initial?: AdminTestimonialDto; onClose: () => void }) {
  const titleId = useId()
  const textId = useId()
  const [authorName, setAuthorName] = useState(initial?.authorName ?? '')
  const [text, setText] = useState(initial?.text ?? '')
  const [rating, setRating] = useState(initial?.rating ?? 5)
  const [isPublished, setIsPublished] = useState(initial?.isPublished ?? true)
  const [error, setError] = useState<string | null>(null)
  const save = useContentMutation((body: object) =>
    initial ? send(`/api/admin/testimonials/${initial.id}`, 'PUT', body) : send('/api/admin/testimonials', 'POST', body))

  const submit = () => {
    if (!authorName.trim() || !text.trim()) return setError('Ad ve yorum zorunlu.')
    save.mutate({ authorName, text, rating, isPublished }, { onSuccess: onClose, onError: () => setError('Kaydedilemedi.') })
  }

  return (
    <Modal labelledBy={titleId} onClose={onClose} className="m-auto w-[min(30rem,calc(100vw-2rem))]">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
        className="space-y-4 rounded-3xl bg-foam p-6"
      >
        <h2 id={titleId} className="text-2xl text-bean">{initial ? 'Yorumu düzenle' : 'Yeni yorum'}</h2>
        {error && <p role="alert" className="rounded-2xl bg-red-50 px-4 py-2 text-sm text-red-900">{error}</p>}
        <FormField label="Ad" value={authorName} maxLength={40} placeholder="Ad Soyadın baş harfi" onChange={(e) => setAuthorName(e.target.value)} />
        <div>
          <label htmlFor={textId} className="block text-sm font-semibold">Yorum</label>
          <textarea id={textId} value={text} maxLength={500} rows={4} onChange={(e) => setText(e.target.value)} className="mt-1.5 w-full rounded-2xl border border-crema-deep bg-foam px-4 py-3" />
        </div>
        <fieldset>
          <legend className="text-sm font-semibold">Puan</legend>
          <div className="mt-1.5 flex gap-3">
            {[1, 2, 3, 4, 5].map((n) => (
              <label key={n} className="flex items-center gap-1">
                <input type="radio" name="rating" aria-label={`${n} yıldız`} checked={rating === n} onChange={() => setRating(n)} className="size-4 accent-bean" />
                <span aria-hidden className="text-amber">{'★'.repeat(n)}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} className="size-4 accent-bean" />
          Yayında
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={buttonClass('ghost')}>Vazgeç</button>
          <button type="submit" disabled={save.isPending} className={buttonClass('primary')}>Kaydet</button>
        </div>
      </form>
    </Modal>
  )
}
