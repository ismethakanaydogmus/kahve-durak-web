import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { selectedOptions, unitPrice } from '../lib/cartPricing'
import type { ProductDto } from '../lib/types'

export const MAX_QUANTITY = 20

export interface CartLine {
  key: string
  productId: number
  categoryId: number
  nameTr: string
  nameEn: string | null
  optionIds: number[]
  options: { nameTr: string; nameEn: string | null }[]
  /** Price when added; checkout always shows the server's price instead. */
  unitPrice: number
  quantity: number
}

interface CartState {
  lines: CartLine[]
  add: (product: ProductDto, optionIds: number[], quantity: number) => void
  setQuantity: (key: string, quantity: number) => void
  remove: (key: string) => void
  clear: () => void
}

export const lineKey = (productId: number, optionIds: number[]) =>
  `${productId}:${[...optionIds].sort((a, b) => a - b).join(',')}`

const clamp = (q: number) => Math.min(MAX_QUANTITY, Math.max(1, Math.round(q)))

const safeStorage = createJSONStorage(() => ({
  getItem: (k: string) => { try { return localStorage.getItem(k) } catch { return null } },
  setItem: (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { /* storage unavailable */ } },
  removeItem: (k: string) => { try { localStorage.removeItem(k) } catch { /* storage unavailable */ } },
}))

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      add: (product, optionIds, quantity) =>
        set((s) => {
          const key = lineKey(product.id, optionIds)
          const existing = s.lines.find((l) => l.key === key)
          if (existing) {
            return { lines: s.lines.map((l) => (l.key === key ? { ...l, quantity: clamp(l.quantity + quantity) } : l)) }
          }
          const line: CartLine = {
            key,
            productId: product.id,
            categoryId: product.categoryId,
            nameTr: product.nameTr,
            nameEn: product.nameEn,
            optionIds: [...optionIds].sort((a, b) => a - b),
            options: selectedOptions(product, optionIds).map((o) => ({ nameTr: o.nameTr, nameEn: o.nameEn })),
            unitPrice: unitPrice(product, optionIds),
            quantity: clamp(quantity),
          }
          return { lines: [...s.lines, line] }
        }),
      setQuantity: (key, quantity) =>
        set((s) => ({
          lines: quantity <= 0
            ? s.lines.filter((l) => l.key !== key)
            : s.lines.map((l) => (l.key === key ? { ...l, quantity: clamp(quantity) } : l)),
        })),
      remove: (key) => set((s) => ({ lines: s.lines.filter((l) => l.key !== key) })),
      clear: () => set({ lines: [] }),
    }),
    { name: 'cart', storage: safeStorage },
  ),
)

export const selectCount = (s: CartState) => s.lines.reduce((n, l) => n + l.quantity, 0)

/** Estimate only; the server quote is what the customer pays. */
export const selectSubtotal = (s: CartState) => s.lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0)
