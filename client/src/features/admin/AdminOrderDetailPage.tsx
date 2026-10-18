import { useId, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/ui/Modal'
import { ErrorState } from '../../components/ui/ErrorState'
import { LoadingRegion, Skeleton } from '../../components/ui/Skeleton'
import { buttonClass } from '../../components/ui/buttonClass'
import { ApiError, apiFetch } from '../../lib/api'
import { formatIstanbulDateTime, formatPrice } from '../../lib/format'
import type { AdminOrderDetailDto, OrderStatus } from '../../lib/types'
import { StatusTimeline } from '../orders/StatusTimeline'
import { useAdminOrder } from './useAdminOrders'

// Admin UI is Turkish-only (spec §6).
const actionLabel: Partial<Record<OrderStatus, string>> = {
  Preparing: 'Hazırlamaya başla',
  Ready: 'Hazır, müşteriye haber ver',
  OnTheWay: 'Yola çıktı',
  Completed: 'Teslim edildi',
}

export function AdminOrderDetailPage() {
  const id = Number(useParams().id)
  const queryClient = useQueryClient()
  const { data, isPending, error, refetch } = useAdminOrder(id)
  const [message, setMessage] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const confirmTitle = useId()

  const act = useMutation({
    mutationFn: ({ action, expected }: { action: 'advance' | 'cancel'; expected: OrderStatus }) =>
      apiFetch<AdminOrderDetailDto>(`/api/admin/orders/${id}/${action}`, { method: 'POST', body: JSON.stringify({ expected }) }),
    onMutate: () => setMessage(null),
    onSuccess: (updated) => {
      queryClient.setQueryData(['admin', 'order', id], updated)
      void queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
    },
    onError: (e) => {
      if (e instanceof ApiError && e.status === 409) {
        // Someone else moved it: show why and load the current state.
        setMessage(e.problem?.title ?? 'Sipariş az önce güncellendi.')
        void refetch()
      } else {
        setMessage('İşlem yapılamadı. Biraz sonra tekrar dene.')
      }
    },
  })

  if (isPending) {
    return (
      <LoadingRegion>
        <Skeleton className="h-10 w-48" />
        <Skeleton className="mt-6 h-64" />
      </LoadingRegion>
    )
  }
  if (error instanceof ApiError && error.status === 404) return <p className="text-lg">Sipariş bulunamadı.</p>
  if (!data) return <ErrorState onRetry={() => void refetch()} />

  const { order, customer, next, canCancel } = data
  const tel = customer.phone.replace(/[^\d+]/g, '')

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-6">
        <div>
          <Link to="/admin/siparisler" className="text-sm text-muted underline-offset-4 hover:underline">← Siparişler</Link>
          <h1 className="mt-2 text-4xl text-bean">Sipariş #{order.id}</h1>
          <p className="text-muted">
            {formatIstanbulDateTime(order.createdAt, 'tr')} · {order.fulfilment === 'Delivery' ? 'Adrese teslim' : 'Gel-Al'}
          </p>
        </div>

        {message && <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-900">{message}</p>}

        <div className="flex flex-wrap gap-3">
          {next && actionLabel[next] && (
            <button
              type="button"
              disabled={act.isPending}
              onClick={() => act.mutate({ action: 'advance', expected: order.status })}
              className={buttonClass('primary', 'px-6 py-3 text-lg')}
            >
              {actionLabel[next]}
            </button>
          )}
          {canCancel && (
            <button type="button" disabled={act.isPending} onClick={() => setConfirming(true)} className={buttonClass('ghost')}>
              Siparişi iptal et
            </button>
          )}
        </div>

        <section className="space-y-3 rounded-4xl bg-foam p-6">
          <ul className="space-y-2">
            {order.items.map((item, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span>
                  <span className="font-semibold">{item.quantity} × {item.nameTr}</span>
                  {item.options.length > 0 && (
                    <span className="block text-sm text-muted">{item.options.map((o) => o.nameTr).join(', ')}</span>
                  )}
                </span>
                <span className="shrink-0">{formatPrice(item.lineTotal, 'tr')}</span>
              </li>
            ))}
          </ul>
          <dl className="space-y-1 border-t border-crema pt-3 text-sm">
            <div className="flex justify-between"><dt>Ara toplam</dt><dd>{formatPrice(order.subtotal, 'tr')}</dd></div>
            {order.deliveryFee > 0 && <div className="flex justify-between"><dt>Teslimat ücreti</dt><dd>{formatPrice(order.deliveryFee, 'tr')}</dd></div>}
            <div className="flex justify-between text-base font-semibold text-bean"><dt>Toplam</dt><dd>{formatPrice(order.total, 'tr')}</dd></div>
          </dl>
          {order.note && (
            <p className="rounded-2xl bg-amber/15 px-4 py-3"><span className="font-semibold">Not: </span>{order.note}</p>
          )}
        </section>
      </div>

      <aside className="space-y-6">
        <section className="rounded-3xl bg-crema/50 p-5">
          <h2 className="text-lg font-semibold text-bean">Müşteri</h2>
          <p className="mt-2 font-medium">{customer.name}</p>
          <a href={`tel:${tel}`} className="block text-bean underline underline-offset-4">{customer.phone}</a>
          <p className="text-sm text-muted">{customer.email}</p>
          <p className="mt-3 text-sm">
            {order.address
              ? `${order.address.title}: ${order.address.line}, ${order.address.neighborhood}${order.address.directions ? ` (${order.address.directions})` : ''}`
              : 'Gel-Al: kafeden teslim alacak'}
          </p>
        </section>
        <section className="rounded-3xl bg-crema/50 p-5">
          <h2 className="mb-3 text-lg font-semibold text-bean">Durum</h2>
          <StatusTimeline order={order} />
        </section>
      </aside>

      {confirming && (
        <Modal labelledBy={confirmTitle} onClose={() => setConfirming(false)} className="m-auto w-[min(26rem,calc(100vw-2rem))]">
          <div className="space-y-4 rounded-3xl bg-foam p-6">
            <h2 id={confirmTitle} className="text-2xl text-bean">Sipariş #{order.id} iptal edilsin mi?</h2>
            <p>Bu işlem geri alınamaz.</p>
            <p className="text-sm text-muted">İptal yalnızca kayıt düşer; ödeme iadesi otomatik yapılmaz.</p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setConfirming(false)} className={buttonClass('ghost')}>Vazgeç</button>
              <button
                type="button"
                onClick={() => {
                  setConfirming(false)
                  act.mutate({ action: 'cancel', expected: order.status })
                }}
                className={buttonClass('primary')}
              >
                İptal et
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
