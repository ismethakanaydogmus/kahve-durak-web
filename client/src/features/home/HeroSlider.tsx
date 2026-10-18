import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import useEmblaCarousel from 'embla-carousel-react'
import Autoplay from 'embla-carousel-autoplay'
import { localize, useLang } from '../../lib/localize'
import type { SlideDto } from '../../lib/types'
import { buttonClass } from '../../components/ui/buttonClass'

/** A steam-like amber wave drawn under the headline. */
function SteamWave() {
  return (
    <svg aria-hidden viewBox="0 0 400 60" className="mt-2 h-6 w-56 text-amber sm:h-8 sm:w-80" fill="none">
      <path d="M4 30c33-24 67 24 100 0s67 24 100 0 67 24 100 0 50 18 92 0" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
    </svg>
  )
}

export function HeroSlider({ slides }: { slides: SlideDto[] }) {
  const { t } = useTranslation()
  const lang = useLang()
  const [emblaRef, embla] = useEmblaCarousel({ loop: true }, [Autoplay({ delay: 6000, stopOnInteraction: true })])
  const [selected, setSelected] = useState(0)

  const onSelect = useCallback(() => {
    if (embla) setSelected(embla.selectedScrollSnap())
  }, [embla])

  useEffect(() => {
    if (!embla) return
    embla.on('select', onSelect)
    return () => {
      embla.off('select', onSelect)
    }
  }, [embla, onSelect])

  return (
    <section aria-roledescription="carousel" className="relative">
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex">
          {slides.map((s, i) => (
            <div
              key={s.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} / ${slides.length}`}
              className="relative min-w-0 flex-[0_0_100%]"
            >
              <img
                src={s.imageUrl}
                alt=""
                className="h-[68vh] max-h-[760px] min-h-[420px] w-full object-cover sm:h-[72vh]"
                fetchPriority={i === 0 ? 'high' : 'auto'}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/40 to-ink/5 sm:bg-gradient-to-r sm:from-ink/80 sm:via-ink/40 sm:to-transparent" />
              <div className="absolute inset-x-0 bottom-0 mx-auto max-w-6xl px-4 pb-20 sm:pb-24">
                <h2 className="max-w-xl text-[2.6rem] font-semibold text-foam sm:text-6xl lg:text-7xl">
                  {localize(s.titleTr, s.titleEn, lang)}
                </h2>
                <SteamWave />
                {s.subtitleTr && (
                  <p className="mt-3 max-w-md text-lg text-crema">{localize(s.subtitleTr, s.subtitleEn, lang)}</p>
                )}
                {s.linkUrl && (
                  <Link to={s.linkUrl} className={buttonClass('secondary', 'mt-6')}>
                    {t('home.seeMenu')}
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      {slides.length > 1 && (
        <div className="absolute bottom-8 right-4 flex gap-2 sm:right-[max(1rem,calc((100vw-72rem)/2+1rem))]">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-label={t('home.slideLabel', { index: i + 1 })}
              aria-current={selected === i}
              onClick={() => embla?.scrollTo(i)}
              className={`h-2.5 rounded-full transition-all ${selected === i ? 'w-8 bg-crema' : 'w-2.5 bg-crema/50 hover:bg-crema/80'}`}
            />
          ))}
        </div>
      )}
    </section>
  )
}
