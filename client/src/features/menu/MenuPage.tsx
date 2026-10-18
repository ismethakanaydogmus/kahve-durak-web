import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ErrorState } from '../../components/ui/ErrorState'
import { LoadingRegion, Skeleton } from '../../components/ui/Skeleton'
import { localize, useLang } from '../../lib/localize'
import { useHashScroll } from '../../lib/useHashScroll'
import { CategoryTabs } from './CategoryTabs'
import { ProductCard } from './ProductCard'
import { ProductDialog } from './ProductDialog'
import { useMenu } from './useMenu'

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export function MenuPage() {
  const { t } = useTranslation()
  const lang = useLang()
  const { data, isPending, isError, refetch } = useMenu()
  const [activeId, setActiveId] = useState<number | null>(null)
  const [params, setParams] = useSearchParams()
  const [announcement, setAnnouncement] = useState('')

  // The open product lives in the URL (?urun=7) so home-page links and the back button work.
  const openId = Number(params.get('urun')) || null
  const openProduct = data?.flatMap((c) => c.products).find((p) => p.id === openId && p.isAvailable) ?? null
  const setOpen = (id: number | null) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      if (id === null) next.delete('urun')
      else next.set('urun', String(id))
      return next
    }, { replace: id === null, preventScrollReset: true })

  // Deep links from the home page: /menu#cat-2 or /menu#product-7.
  useHashScroll(data !== undefined)

  // Highlight the tab of the section currently under the sticky bar.
  useEffect(() => {
    if (!data) return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting)
        if (visible.length > 0) setActiveId(Number(visible[0].target.getAttribute('data-category-id')))
      },
      { rootMargin: '-140px 0px -60% 0px' },
    )
    document.querySelectorAll('[data-category-id]').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [data])

  return (
    <div className="mx-auto max-w-6xl px-4">
      <h1 className="pt-10 text-4xl text-bean sm:text-5xl">{t('menu.title')}</h1>

      {isPending && (
        <LoadingRegion>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        </LoadingRegion>
      )}

      {isError && <ErrorState onRetry={() => void refetch()} />}

      {data && (
        <>
          <CategoryTabs
            categories={data}
            activeId={activeId ?? data[0]?.id ?? null}
            lang={lang}
            onSelect={(id) => {
              setActiveId(id)
              scrollToId(`cat-${id}`)
            }}
          />
          {data.map((category, index) => (
            <section
              key={category.id}
              id={`cat-${category.id}`}
              data-category-id={category.id}
              aria-labelledby={`cat-title-${category.id}`}
              className="scroll-mt-32 pt-10"
            >
              <h2 id={`cat-title-${category.id}`} className="text-2xl text-bean sm:text-3xl">
                {localize(category.nameTr, category.nameEn, lang)}
              </h2>
              <div className="-mx-3 mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2">
                {category.products.map((p) => (
                  <ProductCard key={p.id} product={p} lang={lang} categoryIndex={index} onSelect={(product) => setOpen(product.id)} />
                ))}
              </div>
            </section>
          ))}
        </>
      )}

      {openProduct && <ProductDialog key={openProduct.id} product={openProduct} lang={lang} onClose={() => setOpen(null)} onAdded={() => setAnnouncement(t('product.added'))} />}
      <p role="status" aria-live="polite" className="sr-only">{announcement}</p>
    </div>
  )
}
