import type { Lang } from './localize'

const locales: Record<Lang, string> = { tr: 'tr-TR', en: 'en-US' }

export function formatPrice(amount: number, lang: Lang): string {
  return new Intl.NumberFormat(locales[lang], { style: 'currency', currency: 'TRY', currencyDisplay: 'narrowSymbol' }).format(amount)
}

/** "HH:mm" in Istanbul time for an ISO instant. */
export function formatIstanbulTime(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(locales[lang], {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Istanbul',
  }).format(new Date(iso))
}

/** Istanbul calendar date (yyyy-mm-dd) of an ISO instant, for same-day comparisons. */
export function istanbulDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(date)
}

export function formatIstanbulWeekday(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(locales[lang], { weekday: 'long', timeZone: 'Europe/Istanbul' }).format(new Date(iso))
}

export function formatIstanbulDateTime(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(locales[lang], {
    day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Istanbul',
  }).format(new Date(iso))
}
