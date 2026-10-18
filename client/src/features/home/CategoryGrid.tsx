import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { localize, useLang } from '../../lib/localize'
import type { MenuCategoryDto } from '../../lib/types'
import { CategoryIcon } from '../../components/ui/ProductImage'

export function CategoryGrid({ categories }: { categories: MenuCategoryDto[] }) {
  const { t } = useTranslation()
  const lang = useLang()
  return (
    <section aria-labelledby="categories-title" className="mx-auto max-w-6xl px-4 pt-16">
      <h2 id="categories-title" className="text-3xl text-bean sm:text-4xl">{t('home.categoriesTitle')}</h2>
      <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {categories.map((c, i) => (
          <li key={c.id}>
            <Link
              to={`/menu#cat-${c.id}`}
              className="flex h-full flex-col justify-between gap-6 rounded-3xl bg-crema p-5 text-bean transition-colors hover:bg-crema-deep"
            >
              <CategoryIcon index={i} width={36} height={36} strokeWidth={1.4} />
              <span className="font-display text-xl font-medium leading-tight">{localize(c.nameTr, c.nameEn, lang)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
