import { useTranslation } from 'react-i18next'
import { formatIstanbulTime } from '../../lib/format'
import { useLang } from '../../lib/localize'
import type { OrderDetailDto, OrderStatus } from '../../lib/types'

const pickupSteps: OrderStatus[] = ['Received', 'Preparing', 'Ready', 'Completed']
const deliverySteps: OrderStatus[] = ['Received', 'Preparing', 'OnTheWay', 'Completed']

export function StatusTimeline({ order }: { order: OrderDetailDto }) {
  const { t } = useTranslation()
  const lang = useLang()

  if (order.status === 'PaymentFailed' || order.status === 'Cancelled' || order.status === 'PendingPayment') {
    return <p className="rounded-2xl bg-crema/60 px-4 py-3 font-semibold text-bean">{t(`status.${order.status}`)}</p>
  }

  const steps = order.fulfilment === 'Pickup' ? pickupSteps : deliverySteps
  const current = steps.indexOf(order.status)
  const reachedAt = (s: OrderStatus) => order.history.find((h) => h.status === s)?.at

  return (
    <ol aria-label={t('orders.statusLabel')} className="grid gap-0">
      {steps.map((step, i) => {
        const state = i < current ? 'done' : i === current ? 'current' : 'todo'
        const at = reachedAt(step)
        return (
          <li
            key={step}
            data-state={state}
            aria-current={state === 'current' ? 'step' : undefined}
            className="relative flex gap-4 pb-6 last:pb-0"
          >
            {i < steps.length - 1 && (
              <span aria-hidden className={`absolute left-[11px] top-6 h-full w-0.5 ${i < current ? 'bg-bean' : 'bg-crema-deep'}`} />
            )}
            <span
              aria-hidden
              className={`relative z-10 mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border-2 ${
                state === 'todo' ? 'border-crema-deep bg-foam' : 'border-bean bg-bean'
              } ${state === 'current' ? 'ring-4 ring-amber/40' : ''}`}
            >
              {state === 'done' && <span className="size-2 rounded-full bg-foam" />}
            </span>
            <span>
              <span data-step-label className={`block font-semibold ${state === 'todo' ? 'text-muted' : 'text-ink'}`}>
                {t(`status.${step}`)}
              </span>
              {at && state !== 'todo' && <span className="block text-sm text-muted">{formatIstanbulTime(at, lang)}</span>}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
