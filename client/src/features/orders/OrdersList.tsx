import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { formatIstanbulDateTime, formatPrice } from '../../lib/format'
import { useLang } from '../../lib/localize'
import { useOrders } from './useOrders'

export function OrdersList() {
  const { t } = useTranslation()
  const lang = useLang()
  const { data: orders } = useOrders()

  if (!orders) return null
  if (orders.length === 0) return <p className="text-muted">{t('orders.none')}</p>

  return (
    <ul className="grid gap-2">
      {orders.map((o) => (
        <li key={o.id}>
          <Link
            to={`/siparis/${o.id}`}
            className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl border border-crema-deep px-4 py-3 transition-colors hover:bg-crema/40"
          >
            <span className="font-semibold">{t('orders.number', { id: o.id })}</span>
            <span className="text-sm text-muted">{formatIstanbulDateTime(o.createdAt, lang)}</span>
            <span className="rounded-full bg-crema px-2.5 py-0.5 text-xs font-semibold text-bean">{t(`status.${o.status}`)}</span>
            <span className="ml-auto font-semibold text-bean">{formatPrice(o.total, lang)}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
