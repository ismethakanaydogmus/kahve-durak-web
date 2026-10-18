import { useId, useState } from 'react'
import { Modal } from '../../../components/ui/Modal'
import { buttonClass } from '../../../components/ui/buttonClass'
import { ApiError } from '../../../lib/api'
import type { AdminSlideDto } from '../../../lib/types'
import { FormField } from '../../auth/FormField'
import { ImageUpload } from '../ImageUpload'
import { send, useContentMutation } from './useAdminContent'

// Site-internal targets only (the API rejects anything else).
const links = [
  { value: '/menu', label: 'Menü' },
  { value: '/#iletisim', label: 'İletişim' },
  { value: '', label: 'Yok' },
]

export function SlideDialog({ initial, onClose }: { initial?: AdminSlideDto; onClose: () => void }) {
  const titleId = useId()
  const [titleTr, setTitleTr] = useState(initial?.titleTr ?? '')
  const [titleEn, setTitleEn] = useState(initial?.titleEn ?? '')
  const [subtitleTr, setSubtitleTr] = useState(initial?.subtitleTr ?? '')
  const [subtitleEn, setSubtitleEn] = useState(initial?.subtitleEn ?? '')
  const [imageUrl, setImageUrl] = useState<string | null>(initial?.imageUrl ?? null)
  const [linkUrl, setLinkUrl] = useState(initial?.linkUrl ?? '/menu')
  const [isActive, setIsActive] = useState(initial?.isActive ?? true)
  const [error, setError] = useState<string | null>(null)
  const save = useContentMutation((body: object) =>
    initial ? send(`/api/admin/slides/${initial.id}`, 'PUT', body) : send('/api/admin/slides', 'POST', body))

  const submit = () => {
    if (!titleTr.trim()) return setError('Başlık (TR) zorunlu.')
    if (!imageUrl) return setError('Görsel zorunlu.')
    save.mutate({ titleTr, titleEn, subtitleTr, subtitleEn, imageUrl, linkUrl: linkUrl || null, isActive }, {
      onSuccess: onClose,
      onError: (e) => setError(e instanceof ApiError ? (e.problem?.title ?? 'Kaydedilemedi.') : 'Kaydedilemedi.'),
    })
  }

  return (
    <Modal labelledBy={titleId} onClose={onClose} className="m-auto w-[min(34rem,calc(100vw-2rem))]">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
        className="max-h-[90dvh] space-y-4 overflow-y-auto rounded-3xl bg-foam p-6"
      >
        <h2 id={titleId} className="text-2xl text-bean">{initial ? 'Slaytı düzenle' : 'Yeni slayt'}</h2>
        {error && <p role="alert" className="rounded-2xl bg-red-50 px-4 py-2 text-sm text-red-900">{error}</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Başlık (TR)" value={titleTr} maxLength={80} onChange={(e) => setTitleTr(e.target.value)} />
          <FormField label="Başlık (EN)" value={titleEn} maxLength={80} onChange={(e) => setTitleEn(e.target.value)} />
          <FormField label="Alt yazı (TR)" value={subtitleTr} maxLength={140} onChange={(e) => setSubtitleTr(e.target.value)} />
          <FormField label="Alt yazı (EN)" value={subtitleEn} maxLength={140} onChange={(e) => setSubtitleEn(e.target.value)} />
        </div>
        <ImageUpload label="Slayt görseli" value={imageUrl} onChange={setImageUrl} />
        <fieldset>
          <legend className="text-sm font-semibold">Buton nereye gitsin?</legend>
          <div className="mt-1.5 flex gap-4">
            {links.map((l) => (
              <label key={l.label} className="flex items-center gap-2">
                <input type="radio" name="link" checked={linkUrl === l.value} onChange={() => setLinkUrl(l.value)} className="size-4 accent-bean" />
                {l.label}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="size-4 accent-bean" />
          Aktif (slider'da görünsün)
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={buttonClass('ghost')}>Vazgeç</button>
          <button type="submit" disabled={save.isPending} className={buttonClass('primary')}>Kaydet</button>
        </div>
      </form>
    </Modal>
  )
}
