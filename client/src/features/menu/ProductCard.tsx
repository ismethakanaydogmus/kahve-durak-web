import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { formatPrice } from '../../lib/format'
import type { Lang } from '../../lib/localize'
import { localize } from '../../lib/localize'
import { hasVariablePrice } from '../../lib/price'
import type { ProductDto } from '../../lib/types'
import { ProductImage } from '../../components/ui/ProductImage'

interface Props {
  product: ProductDto
  lang: Lang
  categoryIndex: number
  /** Opens the product dialog (Plan 2). Without it the card is not interactive. */
  onSelect?: (product: ProductDto) => void
}

export function ProductCard({ product, lang, categoryIndex, onSelect }: Props) {
  const { t } = useTranslation()
  const titleId = useId()
  const name = localize(product.nameTr, product.nameEn, lang)
  const price = formatPrice(product.price, lang)
  const soldOut = !product.isAvailable

  const body = (
    <>
      <ProductImage
        src={product.imageUrl}
        alt={name}
        categoryIndex={categoryIndex}
        className={`size-24 shrink-0 rounded-2xl sm:size-28 ${soldOut ? 'grayscale' : ''}`}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <h3 id={titleId} className="font-display text-lg font-medium leading-snug text-ink">{name}</h3>
          {soldOut && (
            <span className="shrink-0 rounded-full bg-muted/15 px-2.5 py-0.5 text-xs font-semibold text-muted">
              {t('menu.soldOut')}
            </span>
          )}
        </div>
        <p className="mt-1 line-clamp-2 text-sm text-muted">{localize(product.descriptionTr, product.descriptionEn, lang)}</p>
        <p className="mt-auto pt-2 font-semibold text-bean">
          {hasVariablePrice(product) ? t('menu.from', { price }) : price}
        </p>
      </div>
    </>
  )

  return (
    <article
      id={`product-${product.id}`}
      aria-labelledby={titleId}
      aria-disabled={soldOut || undefined}
      className={`scroll-mt-36 ${soldOut ? 'opacity-60' : ''}`}
    >
      {onSelect && !soldOut ? (
        <button
          type="button"
          onClick={() => onSelect(product)}
          className="flex w-full gap-4 rounded-3xl p-3 text-left transition-colors hover:bg-crema/60"
        >
          {body}
        </button>
      ) : (
        <div className="flex gap-4 p-3">{body}</div>
      )}
    </article>
  )
}
