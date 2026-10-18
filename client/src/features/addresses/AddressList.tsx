import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { AddressDto } from '../../lib/types'
import { AddressForm } from './AddressForm'
import { useAddresses, useDeleteAddress } from './useAddresses'

interface Props {
  /** Checkout mode: radio list. Otherwise each address gets edit and delete. */
  selectable?: boolean
  selectedId?: number | null
  onSelect?: (address: AddressDto) => void
}

export function AddressList({ selectable = false, selectedId = null, onSelect }: Props) {
  const { t } = useTranslation()
  const { data: addresses } = useAddresses()
  const remove = useDeleteAddress()
  const [editing, setEditing] = useState<number | null>(null)

  if (!addresses) return null
  if (addresses.length === 0) return <p className="text-muted">{t('address.none')}</p>

  return (
    <ul className="grid gap-2">
      {addresses.map((a) => {
        const summary = (
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">{a.title}</span>
            <span className="block text-sm text-muted">{a.line}</span>
            <span className="block text-sm text-muted">{a.neighborhoodName}, Üsküdar</span>
          </span>
        )
        if (selectable) {
          const checked = selectedId === a.id
          return (
            <li key={a.id}>
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 ${checked ? 'border-bean bg-crema/50' : 'border-crema-deep'}`}
              >
                <input type="radio" name="address" checked={checked} onChange={() => onSelect?.(a)} className="mt-1 size-4 accent-bean" />
                {summary}
              </label>
            </li>
          )
        }
        return (
          <li key={a.id} className="rounded-2xl border border-crema-deep px-4 py-3">
            {editing === a.id ? (
              <AddressForm initial={a} onSaved={() => setEditing(null)} onCancel={() => setEditing(null)} />
            ) : (
              <div className="flex items-start gap-3">
                {summary}
                <button type="button" onClick={() => setEditing(a.id)} className="text-sm font-medium text-bean underline-offset-4 hover:underline">
                  {t('address.edit')}
                </button>
                <button
                  type="button"
                  onClick={() => remove.mutate(a.id)}
                  disabled={remove.isPending}
                  className="text-sm text-muted underline-offset-4 hover:underline"
                >
                  {t('address.delete')}
                </button>
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
