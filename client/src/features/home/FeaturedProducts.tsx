import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { formatPrice } from '../../lib/format'
import { localize, useLang } from '../../lib/localize'
import { hasVariablePrice } from '../../lib/price'
import type { MenuCategoryDto, ProductDto } from '../../lib/types'
import { ProductImage } from '../../components/ui/ProductImage'

export function FeaturedProducts({ products, categories }: { products: ProductDto[]; categories: MenuCategoryDto[] }) {
  const { t } = useTranslation()
  const lang = useLang()
  if (products.length === 0) return null

  return (
    <section aria-labelledby="featured-title" className="pt-20">
      <h2 id="featured-title" className="mx-auto max-w-6xl px-4 text-3xl text-bean sm:text-4xl">
        {t('home.featuredTitle')}
      </h2>
      <ul className="mx-auto mt-8 flex max-w-6xl snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:grid sm:grid-cols-3 sm:overflow-visible">
        {products.map((p) => {
          const name = localize(p.nameTr, p.nameEn, lang)
          const price = formatPrice(p.price, lang)
          return (
            <li key={p.id} className="w-[72%] shrink-0 snap-start sm:w-auto">
              <Link to={`/menu?urun=${p.id}`} className="group block">
                <ProductImage
                  src={p.imageUrl}
                  alt={name}
                  categoryIndex={categories.findIndex((c) => c.id === p.categoryId)}
                  className="aspect-[5/4] w-full rounded-[2rem] transition-transform duration-300 group-hover:-translate-y-1"
                />
                <div className="mt-3 flex items-baseline justify-between gap-3">
                  <span className="font-display text-xl font-medium text-ink">{name}</span>
                  <span className="shrink-0 font-semibold text-bean">
                    {hasVariablePrice(p) ? t('menu.from', { price }) : price}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-muted">{localize(p.descriptionTr, p.descriptionEn, lang)}</p>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
