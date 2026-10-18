import { useId, useState } from 'react'
import { Link } from 'react-router'
import { ErrorState } from '../../components/ui/ErrorState'
import { LoadingRegion, Skeleton } from '../../components/ui/Skeleton'
import { formatIstanbulTime, formatPrice } from '../../lib/format'
import type { AdminOrderSummaryDto, OrderStatus } from '../../lib/types'
import type { AdminOrderFilter } from './useAdminOrders'
import { useAdminOrders } from './useAdminOrders'
import { adminStatusLabel } from './adminLabels'

const filters: { value: AdminOrderFilter; label: string }[] = [
  { value: 'active', label: 'Aktif' },
  { value: 'completed', label: 'Tamamlanan' },
  { value: 'cancelled', label: 'İptal' },
  { value: 'failed', label: 'Ödeme başarısız' },
  { value: 'all', label: 'Tümü' },
]

const columns: { title: string; statuses: OrderStatus[] }[] = [
  { title: 'Yeni', statuses: ['Received'] },
  { title: 'Hazırlanıyor', statuses: ['Preparing'] },
  { title: 'Hazır / Yolda', statuses: ['Ready', 'OnTheWay'] },
]

function OrderCard({ order, showStatus }: { order: AdminOrderSummaryDto; showStatus: boolean }) {
  return (
    <Link
      to={`/admin/siparisler/${order.id}`}
      className="block rounded-2xl border border-crema-deep bg-foam p-4 transition-colors hover:border-bean"
    >
      <span className="flex items-baseline justify-between gap-2">
        <span className="font-display text-xl font-semibold text-bean">#{order.id}</span>
        <span className="text-sm tabular-nums text-muted">{formatIstanbulTime(order.createdAt, 'tr')}</span>
      </span>
      <span className="mt-1 block font-medium">{order.customerName}</span>
      <span className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        <span className={`rounded-full px-2.5 py-0.5 font-semibold ${order.fulfilment === 'Delivery' ? 'bg-amber/20 text-bean' : 'bg-crema text-bean'}`}>
          {order.fulfilment === 'Delivery' ? 'Teslimat' : 'Gel-Al'}
        </span>
        {order.neighborhood && <span className="text-muted">{order.neighborhood}</span>}
        {showStatus && <span className="text-muted">· {adminStatusLabel[order.status]}</span>}
      </span>
      <span className="mt-2 flex justify-between text-sm">
        <span className="text-muted">{order.itemCount} ürün</span>
        <span className="font-semibold text-bean">{formatPrice(order.total, 'tr')}</span>
      </span>
    </Link>
  )
}

function Column({ title, orders }: { title: string; orders: AdminOrderSummaryDto[] }) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="rounded-3xl bg-crema/40 p-4">
      <div className="flex items-baseline justify-between">
        <h2 id={id} className="text-xl text-bean">{title}</h2>
        <span className="text-sm font-semibold text-muted">{orders.length}</span>
      </div>
      <ul className="mt-3 space-y-3">
        {orders.map((o) => (
          <li key={o.id}><OrderCard order={o} showStatus={o.status === 'OnTheWay' || o.status === 'Ready'} /></li>
        ))}
        {orders.length === 0 && <li className="text-sm text-muted">Sipariş yok.</li>}
      </ul>
    </section>
  )
}

export function AdminOrdersPage() {
  const [filter, setFilter] = useState<AdminOrderFilter>('active')
  const { data, isPending, isError, refetch } = useAdminOrders(filter)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-4 text-3xl text-bean">Siparişler</h1>
        {filters.map((f) => (
          <button
            key={f.value}
            type="button"
            aria-pressed={filter === f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${filter === f.value ? 'bg-bean text-foam' : 'bg-crema/70 text-bean hover:bg-crema-deep'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isPending && (
        <LoadingRegion>
          <div className="grid gap-4 md:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-64" />)}</div>
        </LoadingRegion>
      )}
      {isError && <ErrorState onRetry={() => void refetch()} />}

      {data && filter === 'active' && (
        <div className="grid items-start gap-4 md:grid-cols-3">
          {columns.map((c) => (
            <Column key={c.title} title={c.title} orders={data.filter((o) => c.statuses.includes(o.status))} />
          ))}
        </div>
      )}
      {data && filter !== 'active' && (
        data.length === 0 ? (
          <p className="text-muted">Bu filtrede sipariş yok.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((o) => <li key={o.id}><OrderCard order={o} showStatus /></li>)}
          </ul>
        )
      )}
    </div>
  )
}
