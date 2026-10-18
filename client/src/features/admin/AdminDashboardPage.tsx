import { ErrorState } from '../../components/ui/ErrorState'
import { LoadingRegion, Skeleton } from '../../components/ui/Skeleton'
import { formatPrice } from '../../lib/format'
import { useDashboard } from './useAdminOrders'

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl bg-foam p-5">
      <p className="text-sm font-semibold text-muted">{label}</p>
      <p className="mt-1 font-display text-4xl font-semibold tabular-nums text-bean">{value}</p>
    </div>
  )
}

// Live: RealtimeBridge invalidates ['admin','dashboard'] on every order event.
export function AdminDashboardPage() {
  const { data, isPending, isError, refetch } = useDashboard()

  return (
    <div className="space-y-8">
      <h1 className="text-3xl text-bean">Özet</h1>
      {isPending && (
        <LoadingRegion>
          <div className="grid gap-4 sm:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-28" />)}</div>
        </LoadingRegion>
      )}
      {isError && <ErrorState onRetry={() => void refetch()} />}
      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Figure label="Bugünkü ciro" value={formatPrice(data.todayRevenue, 'tr')} />
            <Figure label="Bugünkü sipariş" value={String(data.todayOrders)} />
            <Figure label="Ortalama sepet" value={formatPrice(data.averageBasket, 'tr')} />
          </div>
          {data.todayOrders === 0 && <p className="text-muted">Bugün henüz satış yok.</p>}

          <section aria-labelledby="top-title" className="rounded-3xl bg-foam p-5">
            <h2 id="top-title" className="text-xl text-bean">Son 7 günün en çok satanları</h2>
            {data.topProducts.length === 0 ? (
              <p className="mt-3 text-muted">Son 7 günde satış yok.</p>
            ) : (
              <table className="mt-3 w-full text-left">
                <thead className="text-sm text-muted">
                  <tr><th className="py-2 font-semibold">Ürün</th><th className="py-2 text-right font-semibold">Adet</th><th className="py-2 text-right font-semibold">Ciro</th></tr>
                </thead>
                <tbody>
                  {data.topProducts.map((p) => (
                    <tr key={p.nameTr} className="border-t border-crema">
                      <td className="py-2">{p.nameTr}</td>
                      <td className="py-2 text-right tabular-nums">{p.quantity}</td>
                      <td className="py-2 text-right tabular-nums">{formatPrice(p.revenue, 'tr')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </div>
  )
}
