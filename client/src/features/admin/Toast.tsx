import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { formatPrice } from '../../lib/format'
import type { AdminOrderSummaryDto } from '../../lib/types'
import { enableSound, orderAlerts, playOrderSound } from './orderAlert'

const VISIBLE_MS = 8000

interface Alert {
  order: AdminOrderSummaryDto
  soundBlocked: boolean
}

/** New-order alerts for the admin. Visual always; sound when enabled and the browser allows it. */
export function OrderToasts({ soundOn }: { soundOn: boolean }) {
  const [alerts, setAlerts] = useState<Alert[]>([])

  useEffect(
    () =>
      orderAlerts.subscribe((order) => {
        setAlerts((a) => [...a, { order, soundBlocked: false }])
        if (soundOn) {
          void playOrderSound().then((played) => {
            if (!played) setAlerts((a) => a.map((x) => (x.order.id === order.id ? { ...x, soundBlocked: true } : x)))
          })
        }
        setTimeout(() => setAlerts((a) => a.filter((x) => x.order.id !== order.id)), VISIBLE_MS)
      }),
    [soundOn],
  )

  if (alerts.length === 0) return null
  return (
    <div className="fixed bottom-4 right-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2">
      {alerts.map(({ order, soundBlocked }) => (
        <div key={order.id} role="status" className="rounded-2xl bg-bean px-4 py-3 text-foam shadow-lg">
          <Link to={`/admin/siparisler/${order.id}`} className="block font-semibold underline-offset-4 hover:underline">
            Yeni sipariş #{order.id} · {order.customerName} · {formatPrice(order.total, 'tr')}
          </Link>
          {soundBlocked && (
            <button
              type="button"
              onClick={() => {
                void enableSound().then((ok) => {
                  if (ok) setAlerts((a) => a.map((x) => ({ ...x, soundBlocked: false })))
                })
              }}
              className="mt-2 rounded-full bg-crema px-3 py-1 text-sm font-semibold text-bean"
            >
              Sesli bildirimi aç
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
