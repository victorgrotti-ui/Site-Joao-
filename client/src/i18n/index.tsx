import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
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

export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { locale, setLocale, t } = useI18n()
  return (
    <label className={`inline-flex items-center ${className}`}>
      <span className="sr-only">{t('language.label')}</span>
      <select
        aria-label={t('language.label')}
        value={locale}
        onChange={(event) => setLocale(event.target.value as Locale)}
        className={`min-h-11 max-w-[46vw] rounded-lg border border-[#D0D5DD] bg-white px-2 text-sm font-semibold text-ink sm:max-w-none sm:px-3 ${className}`}
      >
        <option value="en">🇬🇧 {t('language.english')}</option>
        <option value="pt-BR">🇧🇷 {t('language.portuguese')}</option>
      </select>
    </label>
  )
}
