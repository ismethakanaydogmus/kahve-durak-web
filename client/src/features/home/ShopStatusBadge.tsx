import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLang } from '../../lib/localize'
import { nextOpening, shopTime } from '../../lib/shopTimes'
import type { ShopStatusDto } from '../../lib/types'

export function ShopStatusBadge({ status, now }: { status: ShopStatusDto; now?: Date }) {
  const { t } = useTranslation()
  const lang = useLang()
  const [mountedAt] = useState(() => new Date())

  let text = t('shop.closed')
  if (status.isOpen && status.closesAt) {
    text = t('shop.openUntil', { time: shopTime(status.closesAt, lang, 'dative') })
  } else if (!status.isOpen && status.nextOpensAt) {
    const { time, day } = nextOpening(status.nextOpensAt, lang, now ?? mountedAt)
    text = day ? t('shop.opensOn', { time, day }) : t('shop.opensAt', { time })
  }

  return (
    <p className="inline-flex items-center gap-2 rounded-full bg-foam px-4 py-2 text-sm font-medium text-ink shadow-[0_6px_20px_-8px_rgb(90_42_23/0.35)]">
      <span aria-hidden className={`size-2.5 rounded-full ${status.isOpen ? 'bg-leaf' : 'bg-muted'}`} />
      {text}
    </p>
  )
}
