import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuthStore } from '../../stores/authStore'
import { Button } from '../../components/ui/Button'
import { AuthCard, FormError } from './AuthCard'
import { authErrorKey, register as registerUser } from './authApi'
import { FormField } from './FormField'
import { safeRedirect } from './safeRedirect'
import type { RegisterValues } from './schemas'
import { registerSchema } from './schemas'

export function RegisterPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [error, setError] = useState<string | null>(null)
  const { register, handleSubmit, formState } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) })
  const redirect = params.get('redirect')
  const errors = formState.errors

  const onSubmit = handleSubmit(async (values) => {
    setError(null)
    try {
      setAuth(await registerUser(values))
      navigate(safeRedirect(redirect), { replace: true })
    } catch (e) {
      setError(t(authErrorKey(e)))
    }
  })

  const fieldError = (key?: string) => (key ? t(key) : undefined)
  const loginLink = redirect ? `/giris?redirect=${encodeURIComponent(redirect)}` : '/giris'

  return (
    <AuthCard
      title={t('auth.registerTitle')}
      footer={<>{t('auth.haveAccount')} <Link to={loginLink} className="font-semibold text-bean underline underline-offset-4">{t('auth.goLogin')}</Link></>}
    >
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <FormError message={error} />
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label={t('auth.firstName')} autoComplete="given-name" error={fieldError(errors.firstName?.message)} {...register('firstName')} />
          <FormField label={t('auth.lastName')} autoComplete="family-name" error={fieldError(errors.lastName?.message)} {...register('lastName')} />
        </div>
        <FormField label={t('auth.email')} type="email" autoComplete="email" error={fieldError(errors.email?.message)} {...register('email')} />
        <FormField label={t('auth.phone')} type="tel" autoComplete="tel" placeholder="05xx xxx xx xx" error={fieldError(errors.phone?.message)} {...register('phone')} />
        <FormField
          label={t('auth.password')}
          type="password"
          autoComplete="new-password"
          hint={t('auth.passwordHint')}
          error={fieldError(errors.password?.message)}
          {...register('password')}
        />
        <Button type="submit" disabled={formState.isSubmitting} className="w-full">{t('auth.submitRegister')}</Button>
      </form>
    </AuthCard>
  )
}
