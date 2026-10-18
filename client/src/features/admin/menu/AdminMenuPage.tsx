import { useId, useState } from 'react'
import { Link } from 'react-router'
import { ErrorState } from '../../../components/ui/ErrorState'
import { LoadingRegion, Skeleton } from '../../../components/ui/Skeleton'
import { buttonClass } from '../../../components/ui/buttonClass'
import { ApiError } from '../../../lib/api'
import { formatPrice } from '../../../lib/format'
import type { AdminCategoryDto, AdminProductDto } from '../../../lib/types'
import { ConfirmDialog } from '../ConfirmDialog'
import { CategoryDialog } from './CategoryDialog'
import { moved, send, useAdminCatalog, useCatalogMutation } from './useAdminCatalog'

type Pending =
  | { kind: 'deleteCategory'; category: AdminCategoryDto }
  | { kind: 'deleteProduct'; product: AdminProductDto }
  | null

const iconButton = 'grid size-8 place-items-center rounded-full text-bean hover:bg-crema disabled:opacity-30'

function ProductRow({ product, index, ids, onDelete, onError }: {
  product: AdminProductDto; index: number; ids: number[]; onDelete: () => void; onError: (m: string) => void
}) {
  const toggle = useCatalogMutation((isAvailable: boolean) =>
    send(`/api/admin/products/${product.id}/availability`, 'PATCH', { isAvailable }))
  const reorder = useCatalogMutation((next: number[]) =>
    send('/api/admin/products/reorder', 'POST', { categoryId: product.categoryId, ids: next }))
  const move = (d: -1 | 1) => {
    const next = moved(ids, index, d)
    if (next) reorder.mutate(next, { onError: () => onError('Sıralama kaydedilemedi.') })
  }

  return (
    <li className={`flex flex-wrap items-center gap-3 rounded-2xl bg-foam px-4 py-3 ${product.isAvailable ? '' : 'opacity-70'}`}>
      <span className="min-w-40 flex-1">
        <span className="font-semibold">{product.nameTr}</span>
        {product.isFeatured && <span className="ml-2 rounded-full bg-amber/20 px-2 py-0.5 text-xs font-semibold text-bean">Öne çıkan</span>}
        <span className="block text-sm text-muted">{formatPrice(product.price, 'tr')}</span>
      </span>
      <label className="flex items-center gap-2 text-sm">
        <button
          type="button"
          role="switch"
          aria-checked={!product.isAvailable}
          aria-label={`Tükendi: ${product.nameTr}`}
          onClick={() => toggle.mutate(!product.isAvailable, { onError: () => onError('Stok durumu kaydedilemedi.') })}
          className={`relative h-6 w-11 rounded-full transition-colors ${product.isAvailable ? 'bg-crema-deep' : 'bg-bean'}`}
        >
          <span className={`absolute top-0.5 size-5 rounded-full bg-foam transition-all ${product.isAvailable ? 'left-0.5' : 'left-5.5'}`} />
        </button>
        Tükendi
      </label>
      <span className="flex items-center gap-1">
        <button type="button" aria-label={`${product.nameTr} ürününü yukarı taşı`} disabled={index === 0} onClick={() => move(-1)} className={iconButton}>↑</button>
        <button type="button" aria-label={`${product.nameTr} ürününü aşağı taşı`} disabled={index === ids.length - 1} onClick={() => move(1)} className={iconButton}>↓</button>
        <Link to={`/admin/menu/urun/${product.id}`} aria-label={`${product.nameTr} ürününü düzenle`} className={buttonClass('ghost', 'px-3 py-1.5 text-sm')}>Düzenle</Link>
        <button type="button" aria-label={`${product.nameTr} ürününü sil`} onClick={onDelete} className={buttonClass('ghost', 'px-3 py-1.5 text-sm')}>Sil</button>
      </span>
    </li>
  )
}

function CategorySection({ category, index, ids, onEdit, onDelete, onDeleteProduct, onError }: {
  category: AdminCategoryDto; index: number; ids: number[]
  onEdit: () => void; onDelete: () => void; onDeleteProduct: (p: AdminProductDto) => void; onError: (m: string) => void
}) {
  const titleId = useId()
  const reorder = useCatalogMutation((next: number[]) => send('/api/admin/categories/reorder', 'POST', { ids: next }))
  const move = (d: -1 | 1) => {
    const next = moved(ids, index, d)
    if (next) reorder.mutate(next, { onError: () => onError('Sıralama kaydedilemedi.') })
  }
  const productIds = category.products.map((p) => p.id)

  return (
    <section aria-labelledby={titleId} className="rounded-3xl bg-crema/40 p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id={titleId} className="mr-auto text-2xl text-bean">{category.nameTr}</h2>
        {!category.isActive && <span className="rounded-full bg-muted/15 px-2.5 py-0.5 text-xs font-semibold text-muted">Pasif</span>}
        <button type="button" aria-label={`${category.nameTr} kategorisini yukarı taşı`} disabled={index === 0} onClick={() => move(-1)} className={iconButton}>↑</button>
        <button type="button" aria-label={`${category.nameTr} kategorisini aşağı taşı`} disabled={index === ids.length - 1} onClick={() => move(1)} className={iconButton}>↓</button>
        <button type="button" onClick={onEdit} className={buttonClass('ghost', 'px-3 py-1.5 text-sm')} aria-label={`${category.nameTr} kategorisini düzenle`}>Düzenle</button>
        <button type="button" onClick={onDelete} className={buttonClass('ghost', 'px-3 py-1.5 text-sm')} aria-label={`${category.nameTr} kategorisini sil`}>Sil</button>
      </div>
      <ul className="mt-3 space-y-2">
        {category.products.map((p, i) => (
          <ProductRow key={p.id} product={p} index={i} ids={productIds} onDelete={() => onDeleteProduct(p)} onError={onError} />
        ))}
        {category.products.length === 0 && <li className="text-sm text-muted">Bu kategoride ürün yok.</li>}
      </ul>
      <Link to={`/admin/menu/urun/yeni?kategori=${category.id}`} className={buttonClass('secondary', 'mt-3 text-sm')}>Bu kategoriye ürün ekle</Link>
    </section>
  )
}

export function AdminMenuPage() {
  const { data, isPending, isError, refetch } = useAdminCatalog()
  const [editing, setEditing] = useState<AdminCategoryDto | 'new' | null>(null)
  const [pending, setPending] = useState<Pending>(null)
  const [message, setMessage] = useState<string | null>(null)
  const remove = useCatalogMutation((path: string) => send(path, 'DELETE'))

  const confirmDelete = (path: string) =>
    remove.mutate(path, {
      onSuccess: () => setMessage(null),
      onError: (e) => setMessage(e instanceof ApiError ? (e.problem?.title ?? 'Silinemedi.') : 'Silinemedi.'),
    })

  const ids = data?.map((c) => c.id) ?? []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-3xl text-bean">Menü</h1>
        <button type="button" onClick={() => setEditing('new')} className={buttonClass('secondary')}>Kategori ekle</button>
        <Link to="/admin/menu/urun/yeni" className={buttonClass('primary')}>Ürün ekle</Link>
      </div>
      {message && <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-900">{message}</p>}

      {isPending && <LoadingRegion><Skeleton className="h-64" /></LoadingRegion>}
      {isError && <ErrorState onRetry={() => void refetch()} />}
      {data?.map((c, i) => (
        <CategorySection
          key={c.id}
          category={c}
          index={i}
          ids={ids}
          onEdit={() => setEditing(c)}
          onDelete={() => setPending({ kind: 'deleteCategory', category: c })}
          onDeleteProduct={(p) => setPending({ kind: 'deleteProduct', product: p })}
          onError={setMessage}
        />
      ))}

      {editing && <CategoryDialog initial={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
      {pending?.kind === 'deleteCategory' && (
        <ConfirmDialog
          title={`"${pending.category.nameTr}" kategorisi silinsin mi?`}
          confirmLabel="Sil"
          onConfirm={() => confirmDelete(`/api/admin/categories/${pending.category.id}`)}
          onClose={() => setPending(null)}
        />
      )}
      {pending?.kind === 'deleteProduct' && (
        <ConfirmDialog
          title={`"${pending.product.nameTr}" silinsin mi?`}
          confirmLabel="Sil"
          onConfirm={() => confirmDelete(`/api/admin/products/${pending.product.id}`)}
          onClose={() => setPending(null)}
        >
          <p className="text-sm text-muted">Ürün menüden kalkar; eski siparişlerde görünmeye devam eder.</p>
        </ConfirmDialog>
      )}
    </div>
  )
}
