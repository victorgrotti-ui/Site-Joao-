import { createContext, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { en, type Translate } from './en'
import { pt } from './pt'
import { setFormatLocale } from '../lib/format'

export type Locale = 'en' | 'pt-BR'

const STORAGE_KEY = 'cmh-locale'

const dictionaries = { en, 'pt-BR': pt }

const serverMessages: Record<string, string> = {
  'Something went wrong. Please try again.': 'errors.fallback',
  'The report could not be exported.': 'errors.export',
  'Email or password is incorrect.': 'errors.badLogin',
  'Too many sign-in attempts. Please wait a few minutes and try again.': 'errors.tooMany',
  'Please sign in.': 'errors.signIn',
  'The current password is incorrect.': 'errors.currentPassword',
  'Not found.': 'errors.notFound',
  'Record not found.': 'errors.recordNotFound',
  'That record already exists.': 'errors.exists',
  'That record is linked to other data and cannot be removed.': 'errors.linked',
  'Please check the form.': 'errors.checkForm',
  'Choose an employee.': 'errors.chooseEmployee',
  'This employee is inactive. Choose an active employee or enable them first.': 'errors.inactiveEmployee',
  'Service not found.': 'errors.serviceNotFound',
  'Choose a valid date range.': 'errors.dateRange',
  'Choose a valid service type.': 'errors.serviceType',
  'This service is included in a payment and cannot be deleted.': 'errors.servicePaidDelete',
  'This service has other expenses linked to it. Delete or unlink those expenses first.': 'errors.serviceLinkedExpenses',
  'This service is already included in a payment. Financial details cannot be changed.': 'errors.servicePaidEdit',
  'Expense not found.': 'errors.expenseNotFound',
  'Choose the employee who should be reimbursed.': 'errors.reimburseEmployee',
  'Choose a valid service.': 'errors.validService',
  'This expense comes from a service. Change the amount on the service itself.': 'errors.expenseFromService',
  'This expense has already been reimbursed.': 'errors.expenseReimbursed',
  'This expense comes from a service. Edit or delete the service instead.': 'errors.expenseEditService',
  'This expense is included in a payment and cannot be deleted.': 'errors.expensePaidDelete',
  'An employee with this email already exists.': 'errors.duplicateEmail',
  'Employee not found.': 'errors.employeeNotFound',
  'There is nothing outstanding to pay for this employee in this period.': 'errors.nothingOutstanding',
  'Payment already recorded for this employee for this payment period.': 'errors.duplicatePayment',
  'Payment not found.': 'errors.paymentNotFound',
  'The start date must be on or before the end date.': 'errors.startBeforeEnd',
  'Choose a shorter date range.': 'errors.shorterRange',
  'Choose a valid payment status.': 'errors.paymentStatus',
  'Choose a valid category.': 'errors.category',
  'Enter a valid email address.': 'errors.validEmail',
  'Enter a valid phone number.': 'errors.validPhone',
  'Enter a valid amount in pounds, such as 110 or 110.50. Amounts cannot be negative.': 'errors.validAmount',
  'Enter a valid date.': 'errors.validDate',
  'Enter your password.': 'errors.enterPassword',
  'Enter your current password.': 'errors.currentPasswordRequired',
  'Use at least 8 characters.': 'errors.passwordLength',
  'Password is too long.': 'errors.passwordLong',
  'Enter the employee’s full name.': 'errors.employeeName',
  'Enter the property or address.': 'errors.property',
  'Enter the contracting company or client.': 'errors.client',
  'Enter a short description.': 'errors.description',
  'Enter an amount greater than zero.': 'errors.amountPositive',
  'The period start must be on or before the period end.': 'errors.periodOrder',
  'Enter the company name.': 'errors.companyName',
}

function readLocale(): Locale {
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored === 'pt-BR' ? 'pt-BR' : 'en'
}

function lookup(locale: Locale, key: string): string {
  const parts = key.split('.')
  let node: unknown = dictionaries[locale]
  for (const part of parts) {
    if (!node || typeof node !== 'object' || !(part in node)) return key
    node = (node as Record<string, unknown>)[part]
  }
  return typeof node === 'string' ? node : key
}

function interpolate(template: string, vars?: Record<string, string | number>) {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? ''))
}

interface LanguageContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: Translate
  text: (message: string) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => readLocale())

  useEffect(() => {
    document.documentElement.lang = locale === 'pt-BR' ? 'pt-BR' : 'en-GB'
    window.localStorage.setItem(STORAGE_KEY, locale)
  }, [locale])

  const value = useMemo<LanguageContextValue>(() => {
    setFormatLocale(locale)
    const t: Translate = (key, vars) => interpolate(lookup(locale, key), vars)
    const text = (message: string) => {
      const key = serverMessages[message]
      return key ? t(key) : message
    }
    return {
      locale,
      setLocale: (next) => setLocaleState(next),
      t,
      text,
    }
  }, [locale])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useI18n() {
  const context = useContext(LanguageContext)
  if (!context) throw new Error('LanguageProvider is missing')
  return context
}

const languageOptions: Locale[] = ['en', 'pt-BR']

function Flag({ locale }: { locale: Locale }) {
  const rawId = useId()
  const clipId = `flag-${rawId.replace(/:/g, '')}`
  const brazil = locale === 'pt-BR'
  return (
    <svg viewBox="0 0 60 40" className="h-4 w-6 shrink-0 rounded-[3px] ring-1 ring-black/15" aria-hidden="true">
      {brazil ? (
        <>
          <rect width="60" height="40" fill="#009B3A" />
          <polygon points="30,5 55,20 30,35 5,20" fill="#FEDD00" />
          <circle cx="30" cy="20" r="8" fill="#002776" />
          <path d="M23 22c3.2-2.4 10.6-2.4 14 0" fill="none" stroke="#FFFFFF" strokeWidth="1.6" />
        </>
      ) : (
        <g clipPath={`url(#${clipId})`}>
          <clipPath id={clipId}>
            <rect width="60" height="40" />
          </clipPath>
          <rect width="60" height="40" fill="#012169" />
          <path d="M0 0 L60 40 M60 0 L0 40" stroke="#FFFFFF" strokeWidth="10" />
          <path d="M0 0 L60 40 M60 0 L0 40" stroke="#C8102E" strokeWidth="6" />
          <path d="M30 0 V40 M0 20 H60" stroke="#FFFFFF" strokeWidth="16" />
          <path d="M30 0 V40 M0 20 H60" stroke="#C8102E" strokeWidth="9" />
        </g>
      )}
    </svg>
  )
}

export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { locale, setLocale, t } = useI18n()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const labelFor = (option: Locale) => (option === 'pt-BR' ? t('language.portuguese') : t('language.english'))

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className={`relative inline-flex max-w-full ${className}`}>
      <button
        type="button"
        aria-label={t('language.label')}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-lg border border-[#D0D5DD] bg-white px-2.5 text-sm font-semibold text-ink"
      >
        <Flag locale={locale} />
        <span className="truncate">{labelFor(locale)}</span>
      </button>
      {open ? (
        <ul
          role="listbox"
          aria-label={t('language.label')}
          className="absolute right-0 top-full z-50 mt-1 min-w-full w-max rounded-lg border border-[#D0D5DD] bg-white p-1 shadow-card"
        >
          {languageOptions.map((option) => {
            const selected = option === locale
            return (
              <li key={option} role="option" aria-selected={selected}>
                <button
                  type="button"
                  className={`flex min-h-11 w-full items-center gap-2 rounded-md px-2.5 text-left text-sm font-semibold ${
                    selected ? 'bg-brand-light text-brand' : 'text-ink hover:bg-brand-soft'
                  }`}
                  onClick={() => {
                    setLocale(option)
                    setOpen(false)
                  }}
                >
                  <Flag locale={option} />
                  <span>{labelFor(option)}</span>
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
