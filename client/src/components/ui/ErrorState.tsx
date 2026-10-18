import { useTranslation } from 'react-i18next'
import { Button } from './Button'

export function ErrorState({ onRetry, message }: { onRetry: () => void; message?: string }) {
  const { t } = useTranslation()
  return (
    <div role="alert" className="mx-auto my-16 flex max-w-md flex-col items-center gap-4 px-4 text-center">
      <p className="text-lg text-ink">{message ?? t('common.loadError')}</p>
      <Button onClick={onRetry}>{t('common.retry')}</Button>
    </div>
  )
}
