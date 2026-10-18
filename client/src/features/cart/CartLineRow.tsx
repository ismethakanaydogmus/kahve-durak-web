import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { formatPrice } from '../../lib/format'
import type { Lang } from '../../lib/localize'
import { localize } from '../../lib/localize'
import type { CartLine } from '../../stores/cartStore'
import { MAX_QUANTITY, useCartStore } from '../../stores/cartStore'

export function CartLineRow({ line, lang }: { line: CartLine; lang: Lang }) {
  const { t } = useTranslation()
  const nameId = useId()
  const setQuantity = useCartStore((s) => s.setQuantity)
  const remove = useCartStore((s) => s.remove)
  const options = line.options.map((o) => localize(o.nameTr, o.nameEn, lang)).join(', ')

  return (
    <li aria-labelledby={nameId} className="flex gap-3 py-4">
      <div className="min-w-0 flex-1">
        <p id={nameId} className="font-display text-lg font-medium text-ink">{localize(line.nameTr, line.nameEn, lang)}</p>
        {options && <p className="text-sm text-muted">{options}</p>}
        <div className="mt-2 flex items-center gap-3">
          <div className="flex items-center rounded-full bg-crema/70" role="group" aria-label={t('product.quantity')}>
            <button
              type="button"
              aria-label={t('product.decrease')}
              onClick={() => setQuantity(line.key, line.quantity - 1)}
              className="grid size-8 place-items-center rounded-full text-lg text-bean"
            >
              −
            </button>
            <span className="w-6 text-center text-sm font-semibold tabular-nums">{line.quantity}</span>
            <button
              type="button"
              aria-label={t('product.increase')}
              disabled={line.quantity >= MAX_QUANTITY}
              onClick={() => setQuantity(line.key, line.quantity + 1)}
              className="grid size-8 place-items-center rounded-full text-lg text-bean disabled:opacity-40"
            >
              +
            </button>
          </div>
          <button type="button" onClick={() => remove(line.key)} className="text-sm text-muted underline-offset-4 hover:underline">
            {t('cart.remove')}
          </button>
        </div>
      </div>
      <p className="shrink-0 font-semibold text-bean">{formatPrice(line.unitPrice * line.quantity, lang)}</p>
    </li>
  )
}
