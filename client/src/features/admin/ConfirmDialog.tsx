import { useId } from 'react'
import type { ReactNode } from 'react'
import { Modal } from '../../components/ui/Modal'
import { buttonClass } from '../../components/ui/buttonClass'

interface Props {
  title: string
  children?: ReactNode
  confirmLabel: string
  onConfirm: () => void
  onClose: () => void
}

/** Admin confirmation (Turkish only); confirming also closes the dialog. */
export function ConfirmDialog({ title, children, confirmLabel, onConfirm, onClose }: Props) {
  const titleId = useId()
  return (
    <Modal labelledBy={titleId} onClose={onClose} className="m-auto w-[min(26rem,calc(100vw-2rem))]">
      <div className="space-y-4 rounded-3xl bg-foam p-6">
        <h2 id={titleId} className="text-2xl text-bean">{title}</h2>
        {children}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={buttonClass('ghost')}>Vazgeç</button>
          <button
            type="button"
            onClick={() => {
              onClose()
              onConfirm()
            }}
            className={buttonClass('primary')}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}
