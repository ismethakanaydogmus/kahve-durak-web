import { useState } from 'react'
import { LoadingRegion, Skeleton } from '../../../components/ui/Skeleton'
import { buttonClass } from '../../../components/ui/buttonClass'
import type { AdminSlideDto, AdminTestimonialDto } from '../../../lib/types'
import { ConfirmDialog } from '../ConfirmDialog'
import { Switch } from '../Switch'
import { moved } from '../menu/useAdminCatalog'
import { SlideDialog } from './SlideDialog'
import { TestimonialDialog } from './TestimonialDialog'
import { send, useAdminSlides, useAdminTestimonials, useContentMutation } from './useAdminContent'

const small = buttonClass('ghost', 'px-3 py-1.5 text-sm')
const arrow = 'grid size-8 place-items-center rounded-full text-bean hover:bg-crema disabled:opacity-30'

type Deleting = { kind: 'slide'; item: AdminSlideDto } | { kind: 'review'; item: AdminTestimonialDto } | null

export function AdminContentPage() {
  const slides = useAdminSlides()
  const reviews = useAdminTestimonials()
  const [slideDialog, setSlideDialog] = useState<AdminSlideDto | 'new' | null>(null)
  const [reviewDialog, setReviewDialog] = useState<AdminTestimonialDto | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Deleting>(null)
  const mutate = useContentMutation(({ path, method, body }: { path: string; method: 'POST' | 'PUT' | 'DELETE'; body?: unknown }) =>
    send(path, method, body))

  const reorder = (kind: 'slides' | 'testimonials', ids: number[], i: number, d: -1 | 1) => {
    const next = moved(ids, i, d)
    if (next) mutate.mutate({ path: `/api/admin/${kind}/reorder`, method: 'POST', body: { ids: next } })
  }
  const slideIds = slides.data?.map((s) => s.id) ?? []
  const reviewIds = reviews.data?.map((r) => r.id) ?? []

  return (
    <div className="space-y-10">
      <h1 className="text-3xl text-bean">İçerik</h1>

      <section aria-labelledby="slides-title" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="slides-title" className="text-2xl text-bean">Slider</h2>
          <button type="button" onClick={() => setSlideDialog('new')} className={buttonClass('secondary')}>Slayt ekle</button>
        </div>
        {slides.isPending && <LoadingRegion><Skeleton className="h-32" /></LoadingRegion>}
        <ul className="space-y-2">
          {slides.data?.map((s, i) => (
            <li key={s.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-foam p-3">
              <img src={s.imageUrl} alt="" className="h-14 w-24 shrink-0 rounded-xl object-cover" />
              <span className="min-w-40 flex-1 font-semibold">{s.titleTr}</span>
              {!s.isActive && <span className="rounded-full bg-muted/15 px-2.5 py-0.5 text-xs font-semibold text-muted">Pasif</span>}
              <button type="button" aria-label={`${s.titleTr} slaytını yukarı taşı`} disabled={i === 0} onClick={() => reorder('slides', slideIds, i, -1)} className={arrow}>↑</button>
              <button type="button" aria-label={`${s.titleTr} slaytını aşağı taşı`} disabled={i === slideIds.length - 1} onClick={() => reorder('slides', slideIds, i, 1)} className={arrow}>↓</button>
              <button type="button" onClick={() => setSlideDialog(s)} className={small}>Düzenle</button>
              <button type="button" onClick={() => setDeleting({ kind: 'slide', item: s })} className={small}>Sil</button>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="reviews-title" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="reviews-title" className="text-2xl text-bean">Yorumlar</h2>
          <button type="button" onClick={() => setReviewDialog('new')} className={buttonClass('secondary')}>Yorum ekle</button>
        </div>
        {reviews.isPending && <LoadingRegion><Skeleton className="h-32" /></LoadingRegion>}
        <ul className="space-y-2">
          {reviews.data?.map((r, i) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-foam p-3">
              <span className="min-w-48 flex-1">
                <span className="font-semibold">{r.authorName}</span>
                <span aria-label={`${r.rating} yıldız`} className="ml-2 text-amber">{'★'.repeat(r.rating)}</span>
                <span className="block truncate text-sm text-muted">{r.text}</span>
              </span>
              <span className="flex items-center gap-2 text-sm">
                <Switch
                  checked={r.isPublished}
                  label={`Yayında: ${r.authorName}`}
                  onChange={(isPublished) => mutate.mutate({ path: `/api/admin/testimonials/${r.id}`, method: 'PUT', body: { ...r, isPublished } })}
                />
                Yayında
              </span>
              <button type="button" aria-label={`${r.authorName} yorumunu yukarı taşı`} disabled={i === 0} onClick={() => reorder('testimonials', reviewIds, i, -1)} className={arrow}>↑</button>
              <button type="button" aria-label={`${r.authorName} yorumunu aşağı taşı`} disabled={i === reviewIds.length - 1} onClick={() => reorder('testimonials', reviewIds, i, 1)} className={arrow}>↓</button>
              <button type="button" onClick={() => setReviewDialog(r)} className={small}>Düzenle</button>
              <button type="button" onClick={() => setDeleting({ kind: 'review', item: r })} className={small}>Sil</button>
            </li>
          ))}
        </ul>
      </section>

      {slideDialog && <SlideDialog initial={slideDialog === 'new' ? undefined : slideDialog} onClose={() => setSlideDialog(null)} />}
      {reviewDialog && <TestimonialDialog initial={reviewDialog === 'new' ? undefined : reviewDialog} onClose={() => setReviewDialog(null)} />}
      {deleting && (
        <ConfirmDialog
          title={deleting.kind === 'slide' ? `"${deleting.item.titleTr}" slaytı silinsin mi?` : `${deleting.item.authorName} yorumu silinsin mi?`}
          confirmLabel="Sil"
          onConfirm={() => mutate.mutate({ path: `/api/admin/${deleting.kind === 'slide' ? 'slides' : 'testimonials'}/${deleting.item.id}`, method: 'DELETE' })}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  )
}
