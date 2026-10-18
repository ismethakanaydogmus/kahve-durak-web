import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/Button'
import { useAuthStore } from '../../stores/authStore'
import { AddressForm } from '../addresses/AddressForm'
import { AddressList } from '../addresses/AddressList'
import { OrdersList } from '../orders/OrdersList'

export function AccountPage() {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const [adding, setAdding] = useState(false)

  return (
    <div className="mx-auto max-w-3xl space-y-12 px-4 py-14">
      <section>
        <h1 className="text-4xl text-bean">{t('account.title')}</h1>
        {user && (
          <p className="mt-3 text-lg">
            {user.firstName} {user.lastName} · {user.email}
          </p>
        )}
      </section>

      <section aria-labelledby="orders-title">
        <h2 id="orders-title" className="text-2xl text-bean">{t('orders.title')}</h2>
        <div className="mt-4">
          <OrdersList />
        </div>
      </section>

      <section aria-labelledby="addresses-title">
        <h2 id="addresses-title" className="text-2xl text-bean">{t('address.myAddresses')}</h2>
        <div className="mt-4 space-y-4">
          <AddressList />
          {adding ? (
            <div className="rounded-2xl bg-crema/40 p-4">
              <AddressForm onSaved={() => setAdding(false)} onCancel={() => setAdding(false)} />
            </div>
          ) : (
            <Button variant="secondary" onClick={() => setAdding(true)}>{t('checkout.addAddress')}</Button>
          )}
        </div>
      </section>
    </div>
  )
}
