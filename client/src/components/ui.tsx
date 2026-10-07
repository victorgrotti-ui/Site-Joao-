import type { ButtonHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import type { Translate } from '../i18n/en'
import { useI18n } from '../i18n'

const inputClass =
  'min-h-11 w-full rounded-lg border border-[#D0D5DD] bg-white px-3 text-sm text-ink outline-none transition placeholder:text-[#98A2B3] focus:border-brand focus:ring-2 focus:ring-brand/20'

export function Button({
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }) {
  const styles = {
    primary: 'bg-brand text-white hover:bg-brand-bright shadow-sm',
    secondary: 'border border-[#D0D5DD] bg-white text-ink hover:bg-brand-soft',
    danger: 'bg-danger text-white hover:bg-red-700',
    ghost: 'text-ink-muted hover:bg-brand-soft hover:text-ink',
  }
  return (
    <button
      type={type}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed ${styles[variant]} ${className}`}
      {...props}
    />
  )
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: string
  error?: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      {children}
      {hint && !error ? <span className="mt-1.5 block text-xs leading-5 text-ink-muted">{hint}</span> : null}
      {error ? <span className="mt-1.5 block text-xs font-medium text-danger">{error}</span> : null}
    </label>
  )
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputClass} ${props.className ?? ''}`} />
}

export function MoneyInput({
  value,
  onChange,
  id,
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  id?: string
  disabled?: boolean
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-ink-muted">£</span>
      <input
        id={id}
        inputMode="decimal"
        autoComplete="off"
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${inputClass} pl-7`}
        placeholder="0.00"
      />
    </div>
  )
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputClass} ${props.className ?? ''}`} />
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputClass} min-h-24 py-2 ${props.className ?? ''}`} />
}

export function Badge({ tone, children }: { tone: 'success' | 'warning' | 'neutral' | 'danger'; children: ReactNode }) {
  const styles = {
    success: 'bg-emerald-50 text-success',
    warning: 'bg-amber-50 text-amber-700',
    neutral: 'bg-slate-100 text-ink-muted',
    danger: 'bg-red-50 text-danger',
  }
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${styles[tone]}`}>{children}</span>
}

export function statusTone(status: string): 'success' | 'warning' | 'neutral' | 'danger' {
  if (status === 'ACTIVE' || status === 'PAID' || status === 'REIMBURSED') return 'success'
  if (status === 'PENDING' || status === 'OUTSTANDING') return 'warning'
  if (status === 'INACTIVE' || status === 'NOT_REIMBURSABLE') return 'neutral'
  return 'neutral'
}

export function statusLabel(status: string, t: Translate): string {
  const key = `status.${status}`
  const label = t(key)
  return label === key ? status : label
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-1 max-w-2xl text-sm text-ink-muted sm:text-base">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  )
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#D0D5DD] bg-brand-soft px-6 py-12 text-center">
      <p className="text-base font-semibold text-ink">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-muted">{body}</p>
    </div>
  )
}

export function LoadingState({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex min-h-40 items-center justify-center text-sm text-ink-muted" role="status">
      {label}…
    </div>
  )
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useI18n()
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger sm:flex-row sm:items-center sm:justify-between">
      <p>{message}</p>
      {onRetry ? (
        <Button variant="secondary" onClick={onRetry}>
          {t('common.tryAgain')}
        </Button>
      ) : null}
    </div>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-line bg-white shadow-card ${className}`}>{children}</section>
}

export const thClass = 'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted'
export const tdClass = 'px-4 py-3.5 align-middle text-sm text-ink'
