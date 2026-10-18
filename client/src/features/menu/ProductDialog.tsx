import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { defaultSelection, selectionErrors, unitPrice } from '../../lib/cartPricing'
import { formatPrice } from '../../lib/format'
import type { Lang } from '../../lib/localize'
import { localize } from '../../lib/localize'
import type { OptionGroupDto, ProductDto } from '../../lib/types'
import { Modal } from '../../components/ui/Modal'
import { CloseIcon } from '../../components/ui/icons'
import { MAX_QUANTITY, useCartStore } from '../../stores/cartStore'

interface Props {
  product: ProductDto
  lang: Lang
  onClose: () => void
  onAdded?: () => void
}

export function ProductDialog({ product, lang, onClose, onAdded }: Props) {
  const { t } = useTranslation()
  const titleId = useId()
  const add = useCartStore((s) => s.add)
  const [selected, setSelected] = useState<number[]>(() => defaultSelection(product))
  const [quantity, setQuantity] = useState(1)

  const name = localize(product.nameTr, product.nameEn, lang)
  const total = unitPrice(product, selected) * quantity
  const invalid = selectionErrors(product, selected).length > 0

  const toggle = (group: OptionGroupDto, optionId: number) => {
    const others = selected.filter((id) => !group.options.some((o) => o.id === id))
    if (group.maxSelect === 1) {
      const isOn = selected.includes(optionId)
      // Required single-choice groups behave like radios; optional ones can be cleared.
      setSelected(isOn && !group.isRequired ? others : [...others, optionId])
    } else {
      setSelected(selected.includes(optionId) ? selected.filter((id) => id !== optionId) : [...selected, optionId])
    }
  }

  return (
    <Modal labelledBy={titleId} onClose={onClose} className="mx-auto mt-auto w-full sm:my-auto sm:max-w-lg">
      <div className="flex max-h-[90dvh] flex-col rounded-t-[2rem] bg-foam text-ink sm:rounded-[2rem]">
        <div className="flex items-start justify-between gap-4 px-6 pt-6">
          <div>
            <h2 id={titleId} className="text-3xl text-bean">{name}</h2>
            <p className="mt-1 text-muted">{localize(product.descriptionTr, product.descriptionEn, lang)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('product.close')}
            className="grid size-10 shrink-0 place-items-center rounded-full text-bean hover:bg-crema/60"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
          {product.optionGroups.map((group) => (
            <fieldset key={group.id}>
              <legend className="flex w-full items-baseline justify-between font-semibold">
                <span>{localize(group.nameTr, group.nameEn, lang)}</span>
                <span className="text-sm font-normal text-muted">
                  {group.isRequired ? t('product.required') : t('product.optional')}
                </span>
              </legend>
              <div className="mt-2 grid gap-2">
                {group.options.map((option) => {
                  const checked = selected.includes(option.id)
                  return (
                    <label
                      key={option.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 transition-colors ${
                        checked ? 'border-bean bg-crema/50' : 'border-crema-deep hover:bg-crema/30'
                      }`}
                    >
                      <input
                        type={group.maxSelect === 1 && group.isRequired ? 'radio' : 'checkbox'}
                        name={`group-${group.id}`}
                        checked={checked}
                        onChange={() => toggle(group, option.id)}
                        className="size-4 accent-bean"
                      />
                      <span className="flex-1">{localize(option.nameTr, option.nameEn, lang)}</span>
                      {option.priceDelta > 0 && (
                        <span className="text-sm text-muted">+{formatPrice(option.priceDelta, lang)}</span>
                      )}
                    </label>
                  )
                })}
              </div>
            </fieldset>
          ))}
        </div>

        <div className="flex items-center gap-3 border-t border-crema px-6 py-4">
          <div className="flex items-center rounded-full bg-crema/70" role="group" aria-label={t('product.quantity')}>
            <button
              type="button"
              aria-label={t('product.decrease')}
              disabled={quantity <= 1}
              onClick={() => setQuantity((q) => q - 1)}
              className="grid size-10 place-items-center rounded-full text-xl text-bean disabled:opacity-40"
            >
              −
            </button>
            <span className="w-6 text-center font-semibold tabular-nums" aria-live="polite">{quantity}</span>
            <button
              type="button"
              aria-label={t('product.increase')}
              disabled={quantity >= MAX_QUANTITY}
              onClick={() => setQuantity((q) => q + 1)}
              className="grid size-10 place-items-center rounded-full text-xl text-bean disabled:opacity-40"
            >
              +
            </button>
          </div>
          <button
            type="button"
            disabled={invalid}
            onClick={() => {
              add(product, selected, quantity)
              onAdded?.()
              onClose()
            }}
            className="flex-1 rounded-full bg-bean px-5 py-3 font-semibold text-foam transition-colors hover:bg-bean-dark disabled:cursor-not-allowed disabled:bg-muted/50"
          >
            {t('product.add', { price: formatPrice(total, lang) })}
          </button>
        </div>
      </div>
    </Modal>
  )
}
