import { useTranslation } from 'react-i18next'
import type { Lang } from '../../lib/localize'
import { useLang } from '../../lib/localize'

const langs: { code: Lang; short: string }[] = [
  { code: 'tr', short: 'TR' },
  { code: 'en', short: 'EN' },
]

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation()
  const current = useLang()

  return (
    <div role="group" aria-label={t('nav.language')} className="flex rounded-full bg-crema/70 p-0.5 text-xs font-semibold">
      {langs.map(({ code, short }) => (
        <button
          key={code}
          type="button"
          aria-label={t(`lang.${code}`)}
          aria-pressed={current === code}
          onClick={() => void i18n.changeLanguage(code)}
          className={`rounded-full px-2.5 py-1 transition-colors ${
            current === code ? 'bg-bean text-foam' : 'text-bean hover:bg-crema-deep/60'
          }`}
        >
          {short}
        </button>
      ))}
    </div>
  )
}
