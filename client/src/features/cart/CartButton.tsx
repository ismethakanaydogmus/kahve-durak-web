import { useTranslation } from 'react-i18next'
import { CartIcon } from '../../components/ui/icons'
import { selectCount, useCartStore } from '../../stores/cartStore'

export function CartButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation()
  const count = useCartStore(selectCount)
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t('cart.count', { count })}
      className="relative grid size-10 place-items-center rounded-full text-bean hover:bg-crema/60"
    >
      <CartIcon />
      {count > 0 && (
        <span
          aria-hidden
          className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-amber px-1 text-xs font-bold text-ink"
        >
          {count}
        </span>
      )}
    </button>
  )
}
