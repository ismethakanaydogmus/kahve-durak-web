import { buttonClass } from '../../../components/ui/buttonClass'
import type { GroupDraft, OptionDraft } from './optionDrafts'
import { newGroup, newOption } from './optionDrafts'

const input = 'w-full rounded-xl border border-crema-deep bg-foam px-3 py-2'

export function OptionGroupsEditor({ value, onChange }: { value: GroupDraft[]; onChange: (groups: GroupDraft[]) => void }) {
  const update = (i: number, patch: Partial<GroupDraft>) => onChange(value.map((g, n) => (n === i ? { ...g, ...patch } : g)))
  const updateOption = (i: number, j: number, patch: Partial<OptionDraft>) =>
    update(i, { options: value[i].options.map((o, n) => (n === j ? { ...o, ...patch } : o)) })
  const move = (i: number, d: -1 | 1) => {
    const t = i + d
    if (t < 0 || t >= value.length) return
    const next = [...value]
    ;[next[i], next[t]] = [next[t], next[i]]
    onChange(next)
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl text-bean">Seçenek grupları</h2>
      {value.length === 0 && <p className="text-sm text-muted">Bu ürünün seçeneği yok (ör. boy, süt).</p>}
      {value.map((g, i) => (
        <fieldset key={g.key} aria-label={`Seçenek grubu: ${g.nameTr || 'yeni'}`} className="space-y-3 rounded-2xl border border-crema-deep bg-foam p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold">Grup adı (TR)<input className={input} value={g.nameTr} maxLength={60} onChange={(e) => update(i, { nameTr: e.target.value })} /></label>
            <label className="text-sm font-semibold">Grup adı (EN)<input className={input} value={g.nameEn} maxLength={60} onChange={(e) => update(i, { nameEn: e.target.value })} /></label>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={g.isRequired} onChange={(e) => update(i, { isRequired: e.target.checked })} className="size-4 accent-bean" />Zorunlu</label>
            <label className="flex items-center gap-2"><input type="radio" checked={!g.multi} onChange={() => update(i, { multi: false })} className="size-4 accent-bean" />Tek seçim</label>
            <label className="flex items-center gap-2"><input type="radio" checked={g.multi} onChange={() => update(i, { multi: true })} className="size-4 accent-bean" />Çoklu seçim</label>
            {g.multi && (
              <label className="flex items-center gap-2">En fazla
                <input type="number" min={2} className="w-16 rounded-xl border border-crema-deep bg-foam px-2 py-1" value={g.maxSelect} onChange={(e) => update(i, { maxSelect: e.target.value })} />
              </label>
            )}
          </div>
          <ul className="space-y-2">
            {g.options.map((o, j) => (
              <li key={o.key} className="grid items-end gap-2 sm:grid-cols-[1fr_1fr_8rem_auto]">
                <input aria-label={`Seçenek ${j + 1} adı (TR)`} placeholder="Ad (TR)" className={input} value={o.nameTr} maxLength={60} onChange={(e) => updateOption(i, j, { nameTr: e.target.value })} />
                <input aria-label={`Seçenek ${j + 1} adı (EN)`} placeholder="Ad (EN)" className={input} value={o.nameEn} maxLength={60} onChange={(e) => updateOption(i, j, { nameEn: e.target.value })} />
                <input aria-label={`Seçenek ${j + 1} fiyat farkı`} placeholder="+₺" inputMode="decimal" className={input} value={o.priceDelta} onChange={(e) => updateOption(i, j, { priceDelta: e.target.value })} />
                <button type="button" onClick={() => update(i, { options: g.options.filter((_, n) => n !== j) })} className={buttonClass('ghost', 'px-3 py-2 text-sm')}>Seçeneği sil</button>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => update(i, { options: [...g.options, newOption()] })} className={buttonClass('secondary', 'text-sm')}>Seçenek ekle</button>
            <button type="button" aria-label="Grubu yukarı taşı" disabled={i === 0} onClick={() => move(i, -1)} className={buttonClass('ghost', 'text-sm')}>↑</button>
            <button type="button" aria-label="Grubu aşağı taşı" disabled={i === value.length - 1} onClick={() => move(i, 1)} className={buttonClass('ghost', 'text-sm')}>↓</button>
            <button type="button" onClick={() => onChange(value.filter((_, n) => n !== i))} className={buttonClass('ghost', 'text-sm')}>Grubu sil</button>
          </div>
        </fieldset>
      ))}
      <button type="button" onClick={() => onChange([...value, newGroup()])} className={buttonClass('secondary')}>Grup ekle</button>
    </div>
  )
}
