import { forwardRef, useId } from 'react'
import type { InputHTMLAttributes } from 'react'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: string
  error?: string
}

export const FormField = forwardRef<HTMLInputElement, Props>(function FormField({ label, hint, error, ...input }, ref) {
  const id = useId()
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-ink">{label}</label>
      <input
        ref={ref}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`mt-1.5 w-full rounded-2xl border bg-foam px-4 py-3 text-ink outline-none transition-colors focus:border-bean ${
          error ? 'border-red-700' : 'border-crema-deep'
        }`}
        {...input}
      />
      {hint && !error && <p id={`${id}-hint`} className="mt-1 text-sm text-muted">{hint}</p>}
      {error && <p id={`${id}-error`} className="mt-1 text-sm text-red-800">{error}</p>}
    </div>
  )
})
