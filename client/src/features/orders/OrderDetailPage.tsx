import { useEffect, useRef } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ErrorState } from '../../components/ui/ErrorState'
import { LoadingRegion, Skeleton } from '../../components/ui/Skeleton'
import { buttonClass } from '../../components/ui/buttonClass'
import { ApiError } from '../../lib/api'
import { formatIstanbulDateTime, formatPrice } from '../../lib/format'
import { localize, useLang } from '../../lib/localize'
import { useCartStore } from '../../stores/cartStore'
import { StatusTimeline } from './StatusTimeline'
import { useOrder } from './useOrders'

const unpaid = new Set(['PendingPayment', 'PaymentFailed'])

export function OrderDetailPage() {
  const { t } = useTranslation()
  const lang = useLang()
  const { id } = useParams()
  const [params] = useSearchParams()
  const result = params.get('odeme')
  const { data: order, isPending, error, refetch } = useOrder(Number(id))
  const clearCart = useCartStore((s) => s.clear)
  const cleared = useRef(false)

  const settledPaid = order !== undefined && !unpaid.has(order.status)
  const paid = (result === 'basarili' || result === 'kontrol') && settledPaid
  const checking = result === 'kontrol' && order?.status === 'PendingPayment'

  // The cart is emptied only once the server confirms payment; a failed payment keeps it for a retry.
  useEffect(() => {
    if (paid && !cleared.current) {
      cleared.current = true
      clearCart()
    }
  }, [paid, clearCart])

  if (isPending) {
    return (
      <LoadingRegion>
        <div className="mx-auto max-w-3xl space-y-4 px-4 py-14">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-40" />
        </div>
      </LoadingRegion>
    )
  }
  if (error instanceof ApiError && error.status === 404) {
    return <p className="mx-auto max-w-3xl px-4 py-16 text-lg">{t('orders.notFound')}</p>
  }
  if (!order) return <ErrorState onRetry={() => void refetch()} />

  const failed = result === 'basarisiz' || order.status === 'PaymentFailed'

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-12">
      {paid && (
        <div role="status" className="rounded-3xl bg-leaf/10 px-5 py-4">
          <p className="text-lg font-semibold text-leaf">{t('orders.paidTitle')}</p>
          <p className="text-ink">{t('orders.paidText')}</p>
        </div>
      )}
      {checking && (
        <div role="status" className="rounded-3xl bg-crema/70 px-5 py-4">
          <p className="text-lg font-semibold text-bean">{t('orders.checkingTitle')}</p>
          <p className="text-ink">{t('orders.checkingText')}</p>
        </div>
      )}
      {failed && (
        <div role="alert" className="space-y-3 rounded-3xl bg-red-50 px-5 py-4">
          <p className="text-lg font-semibold text-red-900">{t('orders.failedTitle')}</p>
          <p className="text-ink">{t('orders.failedText')}</p>
          <Link to="/odeme" className={buttonClass('primary')}>{t('orders.retry')}</Link>
        </div>
      )}

      <header>
        <h1 className="text-4xl text-bean">{t('orders.number', { id: order.id })}</h1>
        <p className="mt-1 text-muted">{formatIstanbulDateTime(order.createdAt, lang)}</p>
      </header>

      <StatusTimeline order={order} />

      <section className="space-y-3 rounded-4xl bg-crema/40 p-6">
        <ul className="space-y-2">
          {order.items.map((item, i) => (
            <li key={i} className="flex justify-between gap-3">
              <span>
                {item.quantity} × {localize(item.nameTr, item.nameEn, lang)}
                {item.options.length > 0 && (
                  <span className="block text-sm text-muted">
                    {item.options.map((o) => localize(o.nameTr, o.nameEn, lang)).join(', ')}
                  </span>
                )}
              </span>
              <span className="shrink-0 font-medium">{formatPrice(item.lineTotal, lang)}</span>
            </li>
          ))}
        </ul>
        <dl className="space-y-1 border-t border-crema-deep pt-3">
          <div className="flex justify-between"><dt>{t('cart.subtotal')}</dt><dd>{formatPrice(order.subtotal, lang)}</dd></div>
          {order.deliveryFee > 0 && (
            <div className="flex justify-between"><dt>{t('checkout.deliveryFee')}</dt><dd>{formatPrice(order.deliveryFee, lang)}</dd></div>
          )}
          <div className="flex justify-between text-lg font-semibold text-bean"><dt>{t('checkout.total')}</dt><dd>{formatPrice(order.total, lang)}</dd></div>
        </dl>
      </section>

      <dl className="grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-sm font-semibold text-muted">{order.address ? t('orders.deliveryTo') : t('checkout.pickup')}</dt>
          <dd className="mt-1">
            {order.address
              ? `${order.address.title}: ${order.address.line}, ${order.address.neighborhood}${order.address.directions ? ` (${order.address.directions})` : ''}`
              : t('orders.pickupAt')}
          </dd>
        </div>
        {order.note && (
          <div>
            <dt className="text-sm font-semibold text-muted">{t('orders.note')}</dt>
            <dd className="mt-1">{order.note}</dd>
          </div>
        )}
      </dl>
    </div>
  )
}
