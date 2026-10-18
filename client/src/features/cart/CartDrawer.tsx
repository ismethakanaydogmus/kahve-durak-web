import { useId, useState } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Modal } from '../../components/ui/Modal'
import { buttonClass } from '../../components/ui/buttonClass'
import { CloseIcon } from '../../components/ui/icons'
import { formatPrice } from '../../lib/format'
import { useLang } from '../../lib/localize'
import { nextOpening } from '../../lib/shopTimes'
import { selectSubtotal, useCartStore } from '../../stores/cartStore'
import { useHome } from '../home/useHome'
import { CartLineRow } from './CartLineRow'

export function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  return <CartDrawerContent onClose={onClose} />
}

function CartDrawerContent({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const lang = useLang()
  const titleId = useId()
  const lines = useCartStore((s) => s.lines)
  const subtotal = useCartStore(selectSubtotal)
  const status = useHome().data?.shop.status
  const [now] = useState(() => new Date())

  const closed = status !== undefined && !status.isOpen
  let closedNotice: string | null = null
  if (closed) {
    const opens = status.nextOpensAt ? nextOpening(status.nextOpensAt, lang, now) : null
    const when = opens ? (opens.day ? t('shop.opensOnShort', opens) : t('shop.opensAtShort', opens)) : ''
    closedNotice = t('cart.closedNotice', { opens: when }).trim()
  }

  return (
    <Modal labelledBy={titleId} onClose={onClose} className="ml-auto h-dvh w-full sm:max-w-md">
      <div className="flex h-full flex-col bg-foam text-ink">
        <div className="flex items-center justify-between border-b border-crema px-5 py-4">
          <h2 id={titleId} className="text-2xl text-bean">{t('cart.title')}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('product.close')}
            className="grid size-10 place-items-center rounded-full text-bean hover:bg-crema/60"
          >
            <CloseIcon />
          </button>
        </div>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
            <p className="text-lg text-muted">{t('cart.empty')}</p>
            <Link to="/menu" onClick={onClose} className={buttonClass('primary')}>{t('common.goToMenu')}</Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-crema overflow-y-auto px-5">
              {lines.map((line) => (
                <CartLineRow key={line.key} line={line} lang={lang} />
              ))}
            </ul>
            <div className="space-y-3 border-t border-crema px-5 py-4">
              <div className="flex items-baseline justify-between">
                <span className="font-semibold">{t('cart.subtotal')}</span>
                <span className="text-lg font-semibold text-bean">{formatPrice(subtotal, lang)}</span>
              </div>
              <p className="text-sm text-muted">{t('cart.estimateNote')}</p>
              {closedNotice && <p className="rounded-2xl bg-crema/70 px-4 py-3 text-sm font-medium">{closedNotice}</p>}
              {closed ? (
                <button type="button" disabled className={buttonClass('primary', 'w-full')}>{t('cart.checkout')}</button>
              ) : (
                <Link to="/odeme" onClick={onClose} className={buttonClass('primary', 'w-full')}>{t('cart.checkout')}</Link>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
