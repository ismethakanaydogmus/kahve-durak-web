import type { AdminOptionGroupDto } from '../../../lib/types'

// Editable copy of an option group. Ids of existing groups/options are kept so the server
// updates them in place and customers' carts keep working (Plan 4, Task 2).
export interface OptionDraft { key: string; id?: number; nameTr: string; nameEn: string; priceDelta: string }
export interface GroupDraft { key: string; id?: number; nameTr: string; nameEn: string; isRequired: boolean; multi: boolean; maxSelect: string; options: OptionDraft[] }

let seq = 0
const key = () => `k${++seq}`

export const toDrafts = (groups: AdminOptionGroupDto[]): GroupDraft[] =>
  groups.map((g) => ({
    key: key(), id: g.id, nameTr: g.nameTr, nameEn: g.nameEn ?? '', isRequired: g.isRequired,
    multi: g.maxSelect > 1, maxSelect: String(Math.max(2, g.maxSelect)),
    options: g.options.map((o) => ({ key: key(), id: o.id, nameTr: o.nameTr, nameEn: o.nameEn ?? '', priceDelta: String(o.priceDelta) })),
  }))

export const newOption = (): OptionDraft => ({ key: key(), nameTr: '', nameEn: '', priceDelta: '0' })
export const newGroup = (): GroupDraft => ({ key: key(), nameTr: '', nameEn: '', isRequired: true, multi: false, maxSelect: '2', options: [] })

/**
 * Reads a TL amount the way Turkish admins type it: "180,50", "1.250", "1.000,50" (also "180.5").
 * A dot followed by exactly three digits is a thousands separator. More than two decimals or junk → NaN.
 */
export function parseMoney(input: string): number {
  const s = input.trim()
  let normalized: string
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(s)) normalized = s.replace(/\./g, '').replace(',', '.')
  else if (/^\d+(,\d{1,2})?$/.test(s)) normalized = s.replace(',', '.')
  else if (/^\d+\.\d{1,2}$/.test(s)) normalized = s
  else return Number.NaN
  return Number(normalized)
}

/** Client-side copy of the server rules; returns the first problem in Turkish, or null. */
export function groupsError(groups: GroupDraft[]): string | null {
  for (const g of groups) {
    if (!g.nameTr.trim()) return 'Her grubun bir adı olmalı.'
    if (g.options.length === 0) return 'Her grupta en az bir seçenek olmalı.'
    if (g.options.some((o) => !o.nameTr.trim())) return 'Her seçeneğin bir adı olmalı.'
    if (g.options.some((o) => !(parseMoney(o.priceDelta) >= 0))) return 'Fiyat farkı negatif olamaz.'
    if (g.multi) {
      const max = Number(g.maxSelect)
      if (!Number.isInteger(max) || max < 2 || max > g.options.length) return 'Çoklu seçimde en fazla seçim 2 ile seçenek sayısı arasında olmalı.'
    }
  }
  return null
}

export const toRequest = (groups: GroupDraft[]) =>
  groups.map((g) => ({
    id: g.id, nameTr: g.nameTr.trim(), nameEn: g.nameEn.trim() || null, isRequired: g.isRequired,
    maxSelect: g.multi ? Number(g.maxSelect) : 1,
    options: g.options.map((o) => ({ id: o.id, nameTr: o.nameTr.trim(), nameEn: o.nameEn.trim() || null, priceDelta: parseMoney(o.priceDelta) })),
  }))
