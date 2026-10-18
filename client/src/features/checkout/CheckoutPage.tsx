import { useId, useMemo, useRef, useState } from 'react'
import { Navigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ApiError } from '../../lib/api'
import { formatPrice } from '../../lib/format'
import { localize, useLang } from '../../lib/localize'
import { redirectTo } from '../../lib/redirect'
import type { Fulfilment, QuoteDto } from '../../lib/types'
import { useCartStore } from '../../stores/cartStore'
import { AddressForm } from '../addresses/AddressForm'
import { AddressList } from '../addresses/AddressList'
import { useAddresses } from '../addresses/useAddresses'
import { createOrder, toCheckoutRequest } from './checkoutApi'
import { QuoteErrors } from './QuoteErrors'
import { useQuote } from './useQuote'

const MAX_NOTE = 500

export function CheckoutPage() {
  const { t } = useTranslation()
  const lang = useLang()
  const lines = useCartStore((s) => s.lines)
  const addresses = useAddresses()
  const [fulfilment, setFulfilment] = useState<Fulfilment>('Pickup')
  const [addressId, setAddressId] = useState<number | null>(null)
  const [addingAddress, setAddingAddress] = useState(false)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  // A 422 answer belongs to the request that got it; any change to the order makes it moot.
  const [refusal, setRefusal] = useState<{ key: string; quote: QuoteDto } | null>(null)
  const [payError, setPayError] = useState<string | null>(null)
  const submitLock = useRef(false)
  const noteId = useId()
  const summaryId = useId()

  // Until the customer picks one, the first saved address is the choice.
  const chosenAddressId = addressId ?? addresses.data?.[0]?.id ?? null

  const request = useMemo(
    () => toCheckoutRequest(lines, fulfilment, chosenAddressId, note, lang),
    [lines, fulfilment, chosenAddressId, note, lang],
  )
  const { data: quote, isUpdating } = useQuote(request, lines.length > 0)
  const requestKey = JSON.stringify(request)
  const refused = refusal?.key === requestKey ? refusal.quote : null
  const shown = refused ?? quote

  if (lines.length === 0 && !submitting) return <Navigate to="/menu" replace />

  const pay = async () => {
    if (submitLock.current) return
    submitLock.current = true
    setSubmitting(true)
    setPayError(null)
    try {
      const { paymentPageUrl } = await createOrder(request)
      redirectTo(paymentPageUrl)
    } catch (e) {
      if (e instanceof ApiError && e.status === 422 && e.problem) setRefusal({ key: requestKey, quote: e.problem as unknown as QuoteDto })
      else setPayError(t('checkout.payError'))
      submitLock.current = false
      setSubmitting(false)
    }
  }

  const canPay = !!quote && quote.canOrder && !isUpdating && !submitting && !refused
  const choice = (value: Fulfilment, title: string, hint: string) => (
    <label
      className={`flex flex-1 cursor-pointer items-start gap-3 rounded-3xl border-2 p-4 transition-colors ${
        fulfilment === value ? 'border-bean bg-crema/50' : 'border-crema-deep hover:bg-crema/30'
      }`}
    >
      <input
        type="radio"
        name="fulfilment"
        checked={fulfilment === value}
        onChange={() => {
          setFulfilment(value)
        }}
        className="mt-1 size-4 accent-bean"
      />
      <span>
        <span className="block font-display text-xl font-medium">{title}</span>
        <span className="block text-sm text-muted">{hint}</span>
      </span>
    </label>
  )

  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-12 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-8">
        <h1 className="text-4xl text-bean">{t('checkout.title')}</h1>

        <fieldset className="flex flex-col gap-3 sm:flex-row">
          <legend className="sr-only">{t('checkout.title')}</legend>
          {choice('Pickup', t('checkout.pickup'), t('checkout.pickupHint'))}
          {choice('Delivery', t('checkout.delivery'), t('checkout.deliveryHint'))}
        </fieldset>

        {fulfilment === 'Delivery' && (
          <section aria-labelledby="checkout-address" className="space-y-3">
            <h2 id="checkout-address" className="text-2xl text-bean">{t('checkout.address')}</h2>
            <AddressList
              selectable
              selectedId={chosenAddressId}
              onSelect={(a) => {
                setAddressId(a.id)
                    }}
            />
            {addingAddress ? (
              <div className="rounded-2xl bg-crema/40 p-4">
                <AddressForm
                  onSaved={(a) => {
                    setAddressId(a.id)
                    setAddingAddress(false)
                  }}
                  onCancel={() => setAddingAddress(false)}
                />
              </div>
            ) : (
              <button type="button" onClick={() => setAddingAddress(true)} className="font-semibold text-bean underline underline-offset-4">
                {t('checkout.addAddress')}
              </button>
            )}
          </section>
        )}

        <div>
          <label htmlFor={noteId} className="block text-sm font-semibold">{t('checkout.note')}</label>
          <textarea
            id={noteId}
            value={note}
            maxLength={MAX_NOTE}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="mt-1.5 w-full rounded-2xl border border-crema-deep bg-foam px-4 py-3"
          />
          <p className="text-right text-xs text-muted">{t('checkout.noteLeft', { count: MAX_NOTE - note.length })}</p>
        </div>
      </div>

      <aside aria-labelledby={summaryId} role="region" className="h-fit space-y-4 rounded-4xl bg-crema/50 p-6 lg:sticky lg:top-24">
        <h2 id={summaryId} className="text-2xl text-bean">{t('checkout.summary')}</h2>
        {shown ? (
          <>
            <ul className="space-y-2">
              {shown.lines.map((l, i) => (
                <li key={`${l.productId}-${i}`} className="flex justify-between gap-3 text-sm">
                  <span>
                    {l.quantity} × {localize(l.nameTr, l.nameEn, lang)}
                    {l.options.length > 0 && (
                      <span className="block text-muted">{l.options.map((o) => localize(o.nameTr, o.nameEn, lang)).join(', ')}</span>
                    )}
                  </span>
                  <span className="shrink-0 font-medium">{formatPrice(l.lineTotal, lang)}</span>
                </li>
              ))}
            </ul>
            <dl className="space-y-1 border-t border-crema-deep pt-3">
              <div className="flex justify-between"><dt>{t('cart.subtotal')}</dt><dd>{formatPrice(shown.subtotal, lang)}</dd></div>
              {shown.deliveryFee > 0 && (
                <div className="flex justify-between"><dt>{t('checkout.deliveryFee')}</dt><dd>{formatPrice(shown.deliveryFee, lang)}</dd></div>
              )}
              <div className="flex justify-between text-lg font-semibold text-bean"><dt>{t('checkout.total')}</dt><dd>{formatPrice(shown.total, lang)}</dd></div>
            </dl>
            <QuoteErrors quote={shown} lang={lang} />
          </>
        ) : (
          <p className="text-muted" role="status">{t('checkout.calculating')}</p>
        )}
        {payError && <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-900">{payError}</p>}
        <button
          type="button"
          disabled={!canPay}
          onClick={() => void pay()}
          className="w-full rounded-full bg-bean px-5 py-3 font-semibold text-foam transition-colors hover:bg-bean-dark disabled:cursor-not-allowed disabled:bg-muted/50"
        >
          {submitting ? t('checkout.paying') : t('checkout.pay', { total: formatPrice(quote?.total ?? 0, lang) })}
        </button>
      </aside>
    </div>
  )
}
