import { useTranslation } from 'react-i18next'

export type Lang = 'tr' | 'en'

export function localize(tr: string | null | undefined, en: string | null | undefined, lang: string): string {
  if (lang === 'en' && en && en.trim()) return en
  return tr ?? ''
}

export function useLang(): Lang {
  const { i18n } = useTranslation()
  return i18n.language === 'en' ? 'en' : 'tr'
}
