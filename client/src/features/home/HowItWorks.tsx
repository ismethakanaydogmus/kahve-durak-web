import { useTranslation } from 'react-i18next'

const steps = [1, 2, 3] as const

export function HowItWorks() {
  const { t } = useTranslation()
  return (
    <section aria-labelledby="how-title" className="mx-auto max-w-6xl px-4 pt-20">
      <h2 id="how-title" className="text-3xl text-bean sm:text-4xl">{t('home.howTitle')}</h2>
      <ol className="mt-8 grid gap-8 sm:grid-cols-3">
        {steps.map((n) => (
          <li key={n} className="flex gap-4">
            <span aria-hidden className="font-display text-5xl font-semibold leading-none text-amber">{n}</span>
            <div>
              <h3 className="text-xl font-medium text-ink">{t(`home.how${n}Title`)}</h3>
              <p className="mt-1 text-muted">{t(`home.how${n}Text`)}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
