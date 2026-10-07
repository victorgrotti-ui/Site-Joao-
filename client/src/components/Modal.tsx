import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { useI18n } from '../i18n'
import { Button } from './ui'

export function Modal({
  open,
  title,
  subtitle,
  onClose,
  children,
  wide = false,
}: {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  const { t } = useI18n()
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button type="button" className="absolute inset-0 bg-[#172033]/40" aria-label={t('common.closeDialog')} onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className={`relative max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-card sm:rounded-2xl sm:p-6 ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'}`}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="dialog-title" className="text-lg font-semibold text-ink">
              {title}
            </h2>
            {subtitle ? <p className="mt-1 text-sm text-ink-muted">{subtitle}</p> : null}
          </div>
          <button type="button" className="rounded-lg p-2 text-ink-muted hover:bg-brand-soft" aria-label={t('common.close')} onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  tone = 'primary',
  busy = false,
  onConfirm,
  onClose,
  children,
}: {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  tone?: 'primary' | 'danger'
  busy?: boolean
  onConfirm: () => void
  onClose: () => void
  children?: ReactNode
}) {
  const { t } = useI18n()
  return (
    <Modal open={open} title={title} onClose={busy ? () => undefined : onClose}>
      <p className="text-sm leading-6 text-ink">{message}</p>
      {children}
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose} disabled={busy}>
          {t('common.cancel')}
        </Button>
        <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} disabled={busy}>
          {busy ? t('common.saving') : confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}
