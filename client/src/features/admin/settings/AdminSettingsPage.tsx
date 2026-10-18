import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ErrorState } from '../../../components/ui/ErrorState'
import { LoadingRegion, Skeleton } from '../../../components/ui/Skeleton'
import { buttonClass } from '../../../components/ui/buttonClass'
import { apiFetch } from '../../../lib/api'
import type { OpeningHourDto, ShopSettingsDto } from '../../../lib/types'
import { FormField } from '../../auth/FormField'
import { Switch } from '../Switch'
import { problemText } from '../adminApi'
import { weekDays } from '../adminLabels'
import { parseMoney } from '../menu/optionDrafts'

const timeInput = 'rounded-xl border border-crema-deep bg-foam px-3 py-2 tabular-nums disabled:opacity-40'

function DayRow({ name, hours, onChange }: { name: string; hours: OpeningHourDto; onChange: (h: OpeningHourDto) => void }) {
  const overnight = !hours.isClosed && hours.closes <= hours.opens && hours.closes !== hours.opens
  return (
    <div role="group" aria-label={name} className="flex flex-wrap items-center gap-3 border-b border-crema py-2 last:border-0">
      <span className="w-24 font-medium">{name}</span>
      <Switch checked={!hours.isClosed} label={`${name} açık`} onChange={(open) => onChange({ ...hours, isClosed: !open })} />
      <span className="w-14 text-sm text-muted">{hours.isClosed ? 'Kapalı' : 'Açık'}</span>
      <input type="time" aria-label={`${name} açılış`} value={hours.opens} disabled={hours.isClosed} onChange={(e) => onChange({ ...hours, opens: e.target.value })} className={timeInput} />
      <span aria-hidden>–</span>
      <input type="time" aria-label={`${name} kapanış`} value={hours.closes} disabled={hours.isClosed} onChange={(e) => onChange({ ...hours, closes: e.target.value })} className={timeInput} />
      {overnight && <span className="text-sm text-muted">ertesi gün</span>}
    </div>
  )
}

function SettingsForm({ initial }: { initial: ShopSettingsDto }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState(initial)
  const [fee, setFee] = useState(String(initial.deliveryFee).replace('.', ','))
  const [minimum, setMinimum] = useState(String(initial.minOrderAmount).replace('.', ','))
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const save = useMutation({
    mutationFn: (body: ShopSettingsDto) => apiFetch<ShopSettingsDto>('/api/admin/settings', { method: 'PUT', body: JSON.stringify(body) }),
    onSuccess: (saved) => {
      queryClient.setQueryData(['admin', 'settings'], saved)
      void queryClient.invalidateQueries({ queryKey: ['home'] })
      setMessage({ ok: true, text: 'Ayarlar kaydedildi.' })
    },
    onError: (e) => setMessage({ ok: false, text: problemText(e) }),
  })

  const setDay = (h: OpeningHourDto) => setForm((f) => ({ ...f, openingHours: f.openingHours.map((x) => (x.day === h.day ? h : x)) }))
  const setAllNeighborhoods = (isActive: boolean) => setForm((f) => ({ ...f, neighborhoods: f.neighborhoods.map((n) => ({ ...n, isActive })) }))

  const submit = () => {
    setMessage(null)
    const deliveryFee = parseMoney(fee)
    const minOrderAmount = parseMoney(minimum)
    if (!(deliveryFee >= 0) || !(minOrderAmount >= 0)) return setMessage({ ok: false, text: 'Ücret ve minimum tutar 0 ya da daha büyük olmalı.' })
    save.mutate({ ...form, deliveryFee, minOrderAmount })
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      className="max-w-3xl space-y-8"
    >
      <h1 className="text-3xl text-bean">Ayarlar</h1>

      <section className="rounded-3xl bg-foam p-5">
        <h2 className="mb-2 text-xl text-bean">Çalışma saatleri</h2>
        {weekDays.map(({ day, name }) => {
          const hours = form.openingHours.find((h) => h.day === day)
          return hours ? <DayRow key={day} name={name} hours={hours} onChange={setDay} /> : null
        })}
        <p className="mt-2 text-sm text-muted">Kapanış açılıştan erkense ertesi gün kapanır (ör. 10:00–03:00). Aynı saat 24 saat açık demektir.</p>
      </section>

      <section className="space-y-4 rounded-3xl bg-foam p-5">
        <h2 className="text-xl text-bean">Teslimat</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Teslimat ücreti (₺)" inputMode="decimal" value={fee} onChange={(e) => setFee(e.target.value)} />
          <FormField label="Minimum sipariş (₺)" inputMode="decimal" value={minimum} onChange={(e) => setMinimum(e.target.value)} />
        </div>
        <fieldset>
          <legend className="text-sm font-semibold">Teslimat yapılan mahalleler</legend>
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={() => setAllNeighborhoods(true)} className={buttonClass('ghost', 'px-3 py-1 text-sm')}>Tümünü seç</button>
            <button type="button" onClick={() => setAllNeighborhoods(false)} className={buttonClass('ghost', 'px-3 py-1 text-sm')}>Hiçbiri</button>
          </div>
          <div className="mt-2 grid gap-1 sm:grid-cols-3">
            {form.neighborhoods.map((n) => (
              <label key={n.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={n.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, neighborhoods: f.neighborhoods.map((x) => (x.id === n.id ? { ...x, isActive: e.target.checked } : x)) }))}
                  className="size-4 accent-bean"
                />
                {n.name}
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      <section className="space-y-4 rounded-3xl bg-foam p-5">
        <h2 className="text-xl text-bean">İletişim</h2>
        <FormField label="Telefon" value={form.phone} maxLength={20} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <FormField label="Adres" value={form.address} maxLength={200} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        <FormField
          label="Google Maps harita linki"
          value={form.mapEmbedUrl}
          hint="Google Haritalar'da kafeyi aç → Paylaş → Harita yerleştir → kodun içindeki src adresini yapıştır."
          onChange={(e) => setForm({ ...form, mapEmbedUrl: e.target.value })}
        />
      </section>

      {message && (
        <p role={message.ok ? 'status' : 'alert'} className={`rounded-2xl px-4 py-3 text-sm font-medium ${message.ok ? 'bg-leaf/10 text-leaf' : 'bg-red-50 text-red-900'}`}>
          {message.text}
        </p>
      )}
      <button type="submit" disabled={save.isPending} className={buttonClass('primary', 'px-8')}>Kaydet</button>
    </form>
  )
}

export function AdminSettingsPage() {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: () => apiFetch<ShopSettingsDto>('/api/admin/settings'),
  })
  if (isPending) return <LoadingRegion><Skeleton className="h-96" /></LoadingRegion>
  if (isError || !data) return <ErrorState onRetry={() => void refetch()} />
  return <SettingsForm initial={data} />
}
