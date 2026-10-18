import { useId, useRef, useState } from 'react'
import { ApiError } from '../../lib/api'
import { buttonClass } from '../../components/ui/buttonClass'
import { IMAGE_TYPES, MAX_IMAGE_BYTES, uploadImage } from './adminApi'

interface Props {
  label: string
  value: string | null
  onChange: (url: string | null) => void
}

/** Pick, preview and upload one image. Admin UI: Turkish only. */
export function ImageUpload({ label, value, onChange }: Props) {
  const inputId = useId()
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pick = async (file: File | undefined) => {
    if (!file) return
    setError(null)
    // Quick checks for a friendly message; the server decides from the file's bytes.
    if (file.size > MAX_IMAGE_BYTES) return setError('Görsel en fazla 5 MB olabilir.')
    if (!IMAGE_TYPES.includes(file.type)) return setError('Sadece JPG, PNG ya da WebP yükleyebilirsin.')
    setBusy(true)
    try {
      onChange(await uploadImage(file))
    } catch (e) {
      setError(e instanceof ApiError && e.problem?.title ? e.problem.title : 'Görsel yüklenemedi. Tekrar dene.')
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  return (
    <div>
      <span className="block text-sm font-semibold text-ink">{label}</span>
      <div className="mt-1.5 flex items-center gap-4">
        <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-2xl bg-crema text-xs text-muted">
          {value ? <img src={value} alt={label} className="size-full object-cover" /> : 'Görsel yok'}
        </div>
        <div className="flex flex-wrap gap-2">
          <label htmlFor={inputId} className={buttonClass('secondary', `cursor-pointer ${busy ? 'opacity-60' : ''}`)}>
            {busy ? 'Yükleniyor…' : 'Görsel seç'}
          </label>
          <input
            id={inputId}
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            aria-label={label}
            disabled={busy}
            onChange={(e) => void pick(e.target.files?.[0])}
            className="sr-only"
          />
          {value && (
            <button type="button" onClick={() => onChange(null)} className={buttonClass('ghost')}>Kaldır</button>
          )}
        </div>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-red-800">{error}</p>}
    </div>
  )
}
