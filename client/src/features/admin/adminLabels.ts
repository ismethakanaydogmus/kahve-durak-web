import type { OrderStatus } from '../../lib/types'

// Admin UI is Turkish-only (spec §6), so its labels live here rather than in i18n.
export const adminStatusLabel: Record<OrderStatus, string> = {
  PendingPayment: 'Ödeme bekleniyor', PaymentFailed: 'Ödeme başarısız', Received: 'Yeni', Preparing: 'Hazırlanıyor',
  Ready: 'Hazır', OnTheWay: 'Yolda', Completed: 'Teslim edildi', Cancelled: 'İptal',
}

/** Monday first, as Turkish weeks start on Monday. day: 0 = Sunday … 6 = Saturday. */
export const weekDays: { day: number; name: string }[] = [
  { day: 1, name: 'Pazartesi' }, { day: 2, name: 'Salı' }, { day: 3, name: 'Çarşamba' }, { day: 4, name: 'Perşembe' },
  { day: 5, name: 'Cuma' }, { day: 6, name: 'Cumartesi' }, { day: 0, name: 'Pazar' },
]
