import { formatIstanbulTime, formatIstanbulWeekday, istanbulDate } from './format'
import type { Lang } from './localize'
import { trTimeWithSuffix } from './trTime'
import type { TrCase } from './trTime'

/** "03:00'e" / "10:00'da" in Turkish (case suffix by pronunciation), plain "03:00" in English. */
export function shopTime(iso: string, lang: Lang, kase: TrCase): string {
  const time = formatIstanbulTime(iso, lang)
  return lang === 'tr' ? trTimeWithSuffix(time, kase) : time
}

/** Opening time, plus the weekday when it is not today in Istanbul. */
export function nextOpening(iso: string, lang: Lang, now: Date): { time: string; day: string | null } {
  const sameDay = istanbulDate(new Date(iso)) === istanbulDate(now)
  return { time: shopTime(iso, lang, 'locative'), day: sameDay ? null : formatIstanbulWeekday(iso, lang) }
}
