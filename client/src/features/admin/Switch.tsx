/** On/off toggle with switch semantics; `label` is its accessible name. */
export function Switch({ checked, label, onChange }: { checked: boolean; label: string; onChange: (next: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-bean' : 'bg-crema-deep'}`}
    >
      <span className={`absolute top-0.5 size-5 rounded-full bg-foam transition-all ${checked ? 'left-5.5' : 'left-0.5'}`} />
    </button>
  )
}
