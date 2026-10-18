import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { LoadingRegion, Skeleton } from '../../../components/ui/Skeleton'
import { buttonClass } from '../../../components/ui/buttonClass'
import type { AdminCategoryDto, AdminProductDto } from '../../../lib/types'
import { FormField } from '../../auth/FormField'
import { ImageUpload } from '../ImageUpload'
import { problemText } from '../adminApi'
import type { GroupDraft } from './optionDrafts'
import { groupsError, parseMoney, toDrafts, toRequest } from './optionDrafts'
import { OptionGroupsEditor } from './OptionGroupsEditor'
import { send, useAdminCatalog, useCatalogMutation } from './useAdminCatalog'

function Editor({ product, categories, defaultCategory }: { product?: AdminProductDto; categories: AdminCategoryDto[]; defaultCategory: number }) {
  const navigate = useNavigate()
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? defaultCategory)
  const [nameTr, setNameTr] = useState(product?.nameTr ?? '')
  const [nameEn, setNameEn] = useState(product?.nameEn ?? '')
  const [descriptionTr, setDescriptionTr] = useState(product?.descriptionTr ?? '')
  const [descriptionEn, setDescriptionEn] = useState(product?.descriptionEn ?? '')
  const [price, setPrice] = useState(product ? String(product.price).replace('.', ',') : '')
  const [imageUrl, setImageUrl] = useState<string | null>(product?.imageUrl ?? null)
  const [isAvailable, setIsAvailable] = useState(product?.isAvailable ?? true)
  const [isFeatured, setIsFeatured] = useState(product?.isFeatured ?? false)
  const [groups, setGroups] = useState<GroupDraft[]>(() => toDrafts(product?.optionGroups ?? []))
  const [error, setError] = useState<string | null>(null)
  const save = useCatalogMutation((body: object) =>
    product ? send(`/api/admin/products/${product.id}`, 'PUT', body) : send('/api/admin/products', 'POST', body))

  const submit = () => {
    setError(null)
    const amount = parseMoney(price)
    const problem = !nameTr.trim() ? 'Ad (TR) zorunlu.'
      : !(amount > 0) ? "Fiyat 0'dan büyük olmalı."
      : groupsError(groups)
    if (problem) return setError(problem)
    save.mutate(
      { categoryId, nameTr, nameEn, descriptionTr, descriptionEn, price: amount, imageUrl, isAvailable, isFeatured, optionGroups: toRequest(groups) },
      { onSuccess: () => navigate('/admin/menu'), onError: (e) => setError(problemText(e)) },
    )
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      className="max-w-3xl space-y-6"
    >
      <div>
        <Link to="/admin/menu" className="text-sm text-muted underline-offset-4 hover:underline">← Menü</Link>
        <h1 className="mt-2 text-3xl text-bean">{product ? product.nameTr : 'Yeni ürün'}</h1>
      </div>
      {error && <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-900">{error}</p>}

      <section className="space-y-4 rounded-3xl bg-crema/40 p-5">
        <label className="block text-sm font-semibold">Kategori
          <select value={categoryId} onChange={(e) => setCategoryId(Number(e.target.value))} className="mt-1.5 w-full rounded-2xl border border-crema-deep bg-foam px-4 py-3">
            {categories.map((c) => <option key={c.id} value={c.id}>{c.nameTr}</option>)}
          </select>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Ad (TR)" value={nameTr} maxLength={60} onChange={(e) => setNameTr(e.target.value)} />
          <FormField label="Ad (EN)" value={nameEn} maxLength={60} onChange={(e) => setNameEn(e.target.value)} />
          <FormField label="Açıklama (TR)" value={descriptionTr} maxLength={200} onChange={(e) => setDescriptionTr(e.target.value)} />
          <FormField label="Açıklama (EN)" value={descriptionEn} maxLength={200} onChange={(e) => setDescriptionEn(e.target.value)} />
          <FormField label="Fiyat (₺)" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
        </div>
        <ImageUpload label="Ürün görseli" value={imageUrl} onChange={setImageUrl} />
        <div className="flex flex-wrap gap-5">
          <label className="flex items-center gap-2"><input type="checkbox" checked={isAvailable} onChange={(e) => setIsAvailable(e.target.checked)} className="size-4 accent-bean" />Stokta var</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="size-4 accent-bean" />Ana sayfada öne çıkar</label>
        </div>
      </section>

      <OptionGroupsEditor value={groups} onChange={setGroups} />

      <div className="flex gap-2">
        <button type="submit" disabled={save.isPending} className={buttonClass('primary', 'px-8')}>Kaydet</button>
        <Link to="/admin/menu" className={buttonClass('ghost')}>Vazgeç</Link>
      </div>
    </form>
  )
}

export function ProductEditorPage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const { data, isPending } = useAdminCatalog()

  if (isPending || !data) return <LoadingRegion><Skeleton className="h-96" /></LoadingRegion>
  const product = id ? data.flatMap((c) => c.products).find((p) => p.id === Number(id)) : undefined
  if (id && !product) return <p className="text-lg">Ürün bulunamadı.</p>
  const defaultCategory = Number(params.get('kategori')) || data[0]?.id || 0
  // Keyed so switching products resets the form state.
  return <Editor key={product?.id ?? 'new'} product={product} categories={data} defaultCategory={defaultCategory} />
}
