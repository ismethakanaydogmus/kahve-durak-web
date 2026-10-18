import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '../../components/ui/Button'
import type { AddressDto } from '../../lib/types'
import { FormField } from '../auth/FormField'
import { FormError } from '../auth/AuthCard'
import { useNeighborhoods, useSaveAddress } from './useAddresses'

// Rules mirror api/.../Features/Addresses/AddressValidators.cs; messages are i18n keys.
const schema = z.object({
  title: z.string().trim().min(1, 'auth.required').max(40, 'auth.tooLong'),
  neighborhoodId: z.coerce.number<string>().int().positive('auth.required'),
  line: z.string().trim().min(5, 'address.lineTooShort').max(200, 'auth.tooLong'),
  directions: z.string().trim().max(200, 'auth.tooLong').optional(),
})

type Values = z.input<typeof schema>

interface Props {
  initial?: AddressDto
  onSaved: (address: AddressDto) => void
  onCancel?: () => void
}

export function AddressForm({ initial, onSaved, onCancel }: Props) {
  const { t } = useTranslation()
  const selectId = useId()
  const neighborhoods = useNeighborhoods()
  const save = useSaveAddress()
  const [error, setError] = useState<string | null>(null)
  const { register, handleSubmit, formState } = useForm<Values, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: initial?.title ?? '',
      neighborhoodId: initial ? String(initial.neighborhoodId) : '',
      line: initial?.line ?? '',
      directions: initial?.directions ?? '',
    },
  })
  const errors = formState.errors
  const fieldError = (key?: string) => (key ? t(key) : undefined)

  const onSubmit = handleSubmit(async (values) => {
    setError(null)
    try {
      const saved = await save.mutateAsync({
        id: initial?.id,
        body: { ...values, directions: values.directions || null },
      })
      onSaved(saved)
    } catch {
      setError(t('auth.genericError'))
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormError message={error} />
      <FormField label={t('address.title')} placeholder={t('address.titlePlaceholder')} error={fieldError(errors.title?.message)} {...register('title')} />
      <div>
        <label htmlFor={selectId} className="block text-sm font-semibold text-ink">{t('address.neighborhood')}</label>
        <select
          id={selectId}
          aria-invalid={errors.neighborhoodId ? true : undefined}
          className="mt-1.5 w-full rounded-2xl border border-crema-deep bg-foam px-4 py-3 text-ink"
          {...register('neighborhoodId')}
        >
          <option value="">{t('address.chooseNeighborhood')}</option>
          {neighborhoods.data?.map((n) => (
            <option key={n.id} value={n.id}>{n.name}</option>
          ))}
        </select>
        {errors.neighborhoodId && <p className="mt-1 text-sm text-red-800">{t('auth.required')}</p>}
      </div>
      <FormField label={t('address.line')} autoComplete="street-address" error={fieldError(errors.line?.message)} {...register('line')} />
      <FormField label={t('address.directions')} error={fieldError(errors.directions?.message)} {...register('directions')} />
      <div className="flex gap-2">
        <Button type="submit" disabled={formState.isSubmitting}>{t('address.save')}</Button>
        {onCancel && <Button variant="ghost" onClick={onCancel}>{t('address.cancel')}</Button>}
      </div>
    </form>
  )
}
