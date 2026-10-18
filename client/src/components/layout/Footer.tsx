import { useTranslation } from 'react-i18next'
import { Wordmark } from './Wordmark'
import { useHome } from '../../features/home/useHome'

export function Footer() {
  const { t } = useTranslation()
  // Same source as the contact section, so an address change in the admin shows everywhere.
  const address = useHome().data?.shop.address
  return (
    <footer className="mt-24 bg-bean text-crema">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Wordmark className="text-xl text-crema [&_span]:text-crema" />
          <p className="mt-3 font-display text-lg italic">{t('footer.tagline')}</p>
        </div>
        <div className="text-sm text-crema/80 sm:text-right">
          {address && <p>{address}</p>}
          <p className="mt-1">{t('footer.demo')}</p>
        </div>
      </div>
    </footer>
  )
}
