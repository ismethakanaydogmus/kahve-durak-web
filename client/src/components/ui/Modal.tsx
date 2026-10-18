import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

interface Props {
  labelledBy: string
  onClose: () => void
  className?: string
  children: ReactNode
}

/** Native modal <dialog>: focus trap, inert background and Escape come from the browser. */
export function Modal({ labelledBy, onClose, className = '', children }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    // Closing by unmount removes the dialog before close() runs, so the browser can't restore focus itself.
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    if (dialog && !dialog.open) dialog.showModal()
    return () => {
      dialog?.close()
      opener?.focus()
    }
  }, [])

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault()
          onClose()
        }
      }}
      onClick={(e) => {
        // A click on the backdrop lands on the <dialog> element itself.
        if (e.target === ref.current) onClose()
      }}
      className={`m-0 max-h-none max-w-none bg-transparent p-0 backdrop:bg-ink/50 ${className}`}
    >
      {children}
    </dialog>
  )
}
