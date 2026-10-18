import { useTranslation } from 'react-i18next'

export function DemoBanner() {
  const { t } = useTranslation()
  return (
    <p role="note" className="bg-bean px-4 py-1.5 text-center text-sm text-crema">
      {t('demo.banner')}
    </p>
  )
}
