import { useTranslation } from 'react-i18next'
import type { TestimonialDto } from '../../lib/types'

export function Testimonials({ items }: { items: TestimonialDto[] }) {
  const { t } = useTranslation()
  if (items.length === 0) return null
  return (
    <section aria-labelledby="reviews-title" className="mt-20 bg-crema/60 py-16">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <h2 id="reviews-title" className="text-3xl text-bean sm:text-4xl">{t('home.reviewsTitle')}</h2>
          <p className="text-sm text-muted">{t('home.reviewsSource')}</p>
        </div>
        {/* Columns instead of a grid so an odd number of reviews of uneven length still packs neatly. */}
        <ul className="mt-8 gap-8 sm:columns-2 lg:columns-3">
          {items.map((r) => (
            <li key={r.id} className="mb-8 break-inside-avoid">
              <figure>
                <p role="img" aria-label={t('home.ratingLabel', { rating: r.rating })} className="text-amber">
                  {'★'.repeat(r.rating)}
                  <span className="text-crema-deep">{'★'.repeat(5 - r.rating)}</span>
                </p>
                <blockquote className="mt-3 font-display text-xl leading-snug text-ink before:content-['“'] after:content-['”']">
                  {r.text}
                </blockquote>
                <figcaption className="mt-3 text-sm font-medium text-muted">{r.authorName}</figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
