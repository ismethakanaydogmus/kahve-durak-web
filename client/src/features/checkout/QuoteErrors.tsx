import { useTranslation } from 'react-i18next'
import { formatPrice } from '../../lib/format'
import type { Lang } from '../../lib/localize'
import type { QuoteDto } from '../../lib/types'
import { useCartStore } from '../../stores/cartStore'

/** Server rule violations, in words the customer can act on. */
export function QuoteErrors({ quote, lang }: { quote: QuoteDto; lang: Lang }) {
  const { t } = useTranslation()
  const lines = useCartStore((s) => s.lines)
  const remove = useCartStore((s) => s.remove)
  if (quote.errors.length === 0) return null

  return (
    <ul role="alert" className="space-y-2">
      {quote.errors.map((e, i) => {
        const message = e.code === 'BELOW_MINIMUM'
          ? t('checkout.errors.BELOW_MINIMUM', {
              min: formatPrice(quote.minOrderAmount, lang),
              missing: formatPrice(Math.max(0, quote.minOrderAmount - quote.subtotal), lang),
            })
          : t(`checkout.errors.${e.code}`)
        const productLines = e.productId === null ? [] : lines.filter((l) => l.productId === e.productId)
        const name = productLines[0] ? (lang === 'en' && productLines[0].nameEn ? productLines[0].nameEn : productLines[0].nameTr) : null
        return (
          <li key={`${e.code}-${e.productId ?? i}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-900">
            <span className="flex-1">{name ? <strong>{name}: </strong> : null}{message}</span>
            {productLines.length > 0 && (
              <button
                type="button"
                onClick={() => productLines.forEach((l) => remove(l.key))}
                className="font-semibold underline underline-offset-4"
              >
                {t('checkout.removeFromCart')}
              </button>
            )}
          </li>
        )
      })}
    </ul>
  )
}
