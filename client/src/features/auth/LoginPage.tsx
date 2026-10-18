import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuthStore } from '../../stores/authStore'
import { Button } from '../../components/ui/Button'
import { AuthCard, FormError } from './AuthCard'
import { authErrorKey, login } from './authApi'
import { FormField } from './FormField'
import { safeRedirect } from './safeRedirect'
import type { LoginValues } from './schemas'
import { loginSchema } from './schemas'

export function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [error, setError] = useState<string | null>(null)
  const { register, handleSubmit, formState } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) })
  const redirect = params.get('redirect')

  const onSubmit = handleSubmit(async (values) => {
    setError(null)
    try {
      setAuth(await login(values))
      navigate(safeRedirect(redirect), { replace: true })
    } catch (e) {
      setError(t(authErrorKey(e)))
    }
  })

  const fieldError = (key?: string) => (key ? t(key) : undefined)
  const registerLink = redirect ? `/kayit?redirect=${encodeURIComponent(redirect)}` : '/kayit'

  return (
    <AuthCard
      title={t('auth.loginTitle')}
      footer={<>{t('auth.noAccount')} <Link to={registerLink} className="font-semibold text-bean underline underline-offset-4">{t('auth.goRegister')}</Link></>}
    >
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <FormError message={error} />
        <FormField label={t('auth.email')} type="email" autoComplete="email" error={fieldError(formState.errors.email?.message)} {...register('email')} />
        <FormField label={t('auth.password')} type="password" autoComplete="current-password" error={fieldError(formState.errors.password?.message)} {...register('password')} />
        <Button type="submit" disabled={formState.isSubmitting} className="w-full">{t('auth.submitLogin')}</Button>
      </form>
    </AuthCard>
  )
}
