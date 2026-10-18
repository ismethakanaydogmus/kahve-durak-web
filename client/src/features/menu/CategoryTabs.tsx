import { useTranslation } from 'react-i18next'
import type { Lang } from '../../lib/localize'
import { localize } from '../../lib/localize'
import type { MenuCategoryDto } from '../../lib/types'

interface Props {
  categories: MenuCategoryDto[]
  activeId: number | null
  lang: Lang
  onSelect: (categoryId: number) => void
}

export function CategoryTabs({ categories, activeId, lang, onSelect }: Props) {
  const { t } = useTranslation()
  return (
    <nav aria-label={t('menu.title')} className="sticky top-16 z-20 -mx-4 border-b border-crema bg-glow/95 px-4 backdrop-blur">
      <ul className="flex gap-2 overflow-x-auto py-3 [scrollbar-width:none]">
        {categories.map((c) => {
          const active = c.id === activeId
          return (
            <li key={c.id} className="shrink-0">
              <button
                type="button"
                aria-current={active || undefined}
                onClick={() => onSelect(c.id)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  active ? 'bg-bean text-foam' : 'bg-crema/70 text-bean hover:bg-crema-deep'
                }`}
              >
                {localize(c.nameTr, c.nameEn, lang)}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
