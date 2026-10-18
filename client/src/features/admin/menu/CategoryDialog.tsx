import { useId, useState } from 'react'
import { Modal } from '../../../components/ui/Modal'
import { buttonClass } from '../../../components/ui/buttonClass'
import { ApiError } from '../../../lib/api'
import type { AdminCategoryDto } from '../../../lib/types'
import { FormField } from '../../auth/FormField'
import { ImageUpload } from '../ImageUpload'
import { send, useCatalogMutation } from './useAdminCatalog'

export function CategoryDialog({ initial, onClose }: { initial?: AdminCategoryDto; onClose: () => void }) {
  const titleId = useId()
  const [nameTr, setNameTr] = useState(initial?.nameTr ?? '')
  const [nameEn, setNameEn] = useState(initial?.nameEn ?? '')
  const [imageUrl, setImageUrl] = useState<string | null>(initial?.imageUrl ?? null)
  const [isActive, setIsActive] = useState(initial?.isActive ?? true)
  const [error, setError] = useState<string | null>(null)
  const save = useCatalogMutation((body: object) =>
    initial ? send(`/api/admin/categories/${initial.id}`, 'PUT', body) : send('/api/admin/categories', 'POST', body))

  const submit = () => {
    if (!nameTr.trim()) return setError('Ad (TR) zorunlu.')
    save.mutate({ nameTr, nameEn, imageUrl, isActive }, {
      onSuccess: onClose,
      onError: (e) => setError(e instanceof ApiError ? (e.problem?.title ?? 'Kaydedilemedi.') : 'Kaydedilemedi.'),
    })
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
        <h2 id={titleId} className="text-2xl text-bean">{initial ? 'Kategoriyi düzenle' : 'Yeni kategori'}</h2>
        {error && <p role="alert" className="rounded-2xl bg-red-50 px-4 py-2 text-sm text-red-900">{error}</p>}
        <FormField label="Ad (TR)" value={nameTr} maxLength={60} onChange={(e) => setNameTr(e.target.value)} />
        <FormField label="Ad (EN)" value={nameEn} maxLength={60} onChange={(e) => setNameEn(e.target.value)} />
        <ImageUpload label="Kategori görseli" value={imageUrl} onChange={setImageUrl} />
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="size-4 accent-bean" />
          Aktif (sitede görünsün)
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={buttonClass('ghost')}>Vazgeç</button>
          <button type="submit" disabled={save.isPending} className={buttonClass('primary')}>Kaydet</button>
        </div>
      </form>
    </Modal>
  )
}
