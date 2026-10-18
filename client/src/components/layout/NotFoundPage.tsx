import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { buttonClass } from '../ui/buttonClass'

export function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <section className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-4xl text-bean">{t('common.notFoundTitle')}</h1>
      <p className="mt-4 text-muted">{t('common.notFoundText')}</p>
      <Link to="/menu" className={buttonClass('primary', 'mt-8')}>{t('common.goToMenu')}</Link>
    </section>
  )
}
