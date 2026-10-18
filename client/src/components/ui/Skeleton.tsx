import { useTranslation } from 'react-i18next'

export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-2xl bg-crema/70 ${className}`} />
}

/** Announces loading to assistive tech while placeholder shapes render. */
export function LoadingRegion({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation()
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">{t('common.loading')}</span>
      {children}
    </div>
  )
}
