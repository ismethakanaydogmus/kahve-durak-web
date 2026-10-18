import { useTranslation } from 'react-i18next'
import type { OpeningHourDto, ShopInfoDto } from '../../lib/types'

// Turkish weeks start on Monday.
const weekOrder = [1, 2, 3, 4, 5, 6, 0]

export function ContactSection({ shop }: { shop: ShopInfoDto }) {
  const { t } = useTranslation()
  const tel = shop.phone.replace(/[^\d+]/g, '')
  const hours = weekOrder
    .map((d) => shop.openingHours.find((h) => h.day === d))
    .filter((h): h is OpeningHourDto => h !== undefined)

  return (
    <section
      id="iletisim"
      aria-labelledby="contact-title"
      className="mx-auto grid max-w-6xl scroll-mt-20 gap-10 px-4 pt-20 md:grid-cols-[1fr_1.2fr]"
    >
      <div>
        <h2 id="contact-title" className="text-3xl text-bean sm:text-4xl">{t('home.contactTitle')}</h2>
        <dl className="mt-8 space-y-5">
          <div>
            <dt className="text-sm font-semibold text-muted">{t('home.address')}</dt>
            <dd className="mt-1 text-lg">{shop.address}</dd>
          </div>
          <div>
            <dt className="text-sm font-semibold text-muted">{t('home.phone')}</dt>
            <dd className="mt-1 text-lg">
              <a href={`tel:${tel}`} className="text-bean underline decoration-amber decoration-2 underline-offset-4">
                {shop.phone}
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-sm font-semibold text-muted">{t('home.hours')}</dt>
            <dd className="mt-2">
              <table className="w-full max-w-xs text-left">
                <tbody>
                  {hours.map((h) => (
                    <tr key={h.day} className="border-b border-crema last:border-0">
                      <th scope="row" className="py-1.5 font-normal">{t(`days.${h.day}`)}</th>
                      <td className="py-1.5 text-right tabular-nums">
                        {h.isClosed ? t('home.dayClosed') : `${h.opens} – ${h.closes}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </dd>
          </div>
        </dl>
      </div>
      <iframe
        title={t('home.mapTitle')}
        src={shop.mapEmbedUrl}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="h-80 w-full rounded-[2rem] border-0 md:h-full md:min-h-96"
      />
    </section>
  )
}
