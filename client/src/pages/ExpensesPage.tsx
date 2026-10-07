import { useEffect, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { ConfirmDialog, Modal } from '../components/Modal'
import { Badge, Button, Card, EmptyState, ErrorBanner, Field, LoadingState, MoneyInput, PageHeader, SelectInput, TextArea, TextInput, statusLabel, statusTone, tdClass, thClass } from '../components/ui'
import { useToast } from '../context/ToastContext'
import { api, errorMessage, fieldErrors } from '../lib/api'
import { presetRange, todayISO } from '../lib/dates'
import { formatDate, formatGBP, parseMoneyToPence, penceToInput } from '../lib/format'
import { EXPENSE_CATEGORIES, categoryLabel } from '../lib/labels'
import type { Employee, ExpenseRecord, ServiceRecord } from '../lib/types'
import { useTitle } from '../lib/useTitle'

interface ExpenseForm {
  date: string
  category: string
  description: string
  amount: string
  employeeId: string
  serviceId: string
  reimbursable: boolean
  notes: string
}

function blank(): ExpenseForm {
  return { date: todayISO(), category: 'CLEANING_PRODUCTS', description: '', amount: '', employeeId: '', serviceId: '', reimbursable: false, notes: '' }
}

export function ExpensesPage() {
  useTitle('Expenses')
  const toast = useToast()
  const month = presetRange('month')
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [services, setServices] = useState<ServiceRecord[]>([])
  const [from, setFrom] = useState(month.from)
  const [to, setTo] = useState(month.to)
  const [category, setCategory] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [reimbursable, setReimbursable] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<ExpenseRecord | null>(null)
  const [form, setForm] = useState<ExpenseForm>(blank())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<ExpenseRecord | null>(null)

  function load() {
    const params = new URLSearchParams()
    if (from && to) {
      params.set('from', from)
      params.set('to', to)
    }
    if (category) params.set('category', category)
    if (employeeId) params.set('employeeId', employeeId)
    if (reimbursable) params.set('reimbursable', reimbursable)
    if (search.trim()) params.set('search', search.trim())
    setLoading(true)
    Promise.all([
      api<{ expenses: ExpenseRecord[] }>(`/api/expenses?${params.toString()}`),
      api<{ employees: Employee[] }>('/api/employees'),
      api<{ services: ServiceRecord[] }>('/api/services'),
    ])
      .then(([expenseData, employeeData, serviceData]) => {
        setExpenses(expenseData.expenses)
        setEmployees(employeeData.employees)
        setServices(serviceData.services.slice(0, 100))
        setError('')
      })
      .catch((caught) => setError(errorMessage(caught)))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    const timer = window.setTimeout(load, 250)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, category, employeeId, reimbursable, search])

  const listedTotal = expenses.reduce((total, expense) => total + expense.amount, 0)
  const lockedAmount = Boolean(editing && editing.origin !== 'MANUAL')

  function validateForm() {
    const next: Record<string, string> = {}
    if (!form.date) next.date = 'Enter the date.'
    if (form.description.trim().length < 2) next.description = 'Enter a short description.'
    if (parseMoneyToPence(form.amount) == null || parseMoneyToPence(form.amount) === 0) next.amount = 'Enter an amount greater than zero.'
    if (form.reimbursable && !form.employeeId) next.employeeId = 'Choose the employee who should be reimbursed.'
    return next
  }

  async function save() {
    const next = validateForm()
    setErrors(next)
    if (Object.keys(next).length) return
    setBusy(true)
    try {
      const body = { ...form, employeeId: form.employeeId || null, serviceId: form.serviceId || null }
      if (editing) await api(`/api/expenses/${editing.id}`, { method: 'PUT', body })
      else await api('/api/expenses', { method: 'POST', body })
      toast.success(editing ? 'Expense updated.' : 'Expense recorded successfully.')
      setOpen(false)
      load()
    } catch (caught) {
      setErrors(fieldErrors(caught))
      toast.error(errorMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!removeTarget) return
    setBusy(true)
    try {
      await api(`/api/expenses/${removeTarget.id}`, { method: 'DELETE' })
      toast.success('Expense deleted.')
      setRemoveTarget(null)
      load()
    } catch (caught) {
      toast.error(errorMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Expenses"
        subtitle="Cleaning products and other costs. If an employee paid personally, mark the expense as reimbursable."
        action={<Button data-testid="add-expense" onClick={() => { setEditing(null); setForm(blank()); setErrors({}); setOpen(true) }}><Plus className="h-4 w-4" /> Add Expense</Button>}
      />
      <p className="mb-4 rounded-xl bg-brand-soft px-4 py-3 text-sm leading-6 text-ink">
        A cost entered on a service is listed here as well. Profit counts that cost once. Do not add the same cleaning products again as a separate expense.
      </p>
      <Card className="mb-4 grid gap-3 p-4 md:grid-cols-3 xl:grid-cols-5">
        <label className="text-sm font-medium">From<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-[#D0D5DD] px-3" /></label>
        <label className="text-sm font-medium">To<input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-[#D0D5DD] px-3" /></label>
        <label className="text-sm font-medium">Category
          <select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-[#D0D5DD] px-3">
            <option value="">All categories</option>
            {EXPENSE_CATEGORIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium">Employee
          <select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-[#D0D5DD] px-3">
            <option value="">All employees</option>
            {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.fullName}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium">Reimbursable
          <select value={reimbursable} onChange={(event) => setReimbursable(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-[#D0D5DD] px-3">
            <option value="">All</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </label>
        <label className="text-sm font-medium md:col-span-2">Description
          <TextInput className="mt-1" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search description" />
        </label>
      </Card>
      {error ? <ErrorBanner message={error} onRetry={load} /> : null}
      {loading ? <LoadingState label="Loading expenses" /> : null}
      {!loading && expenses.length === 0 ? <EmptyState title="No expenses recorded" body="Add cleaning products, travel, equipment or supplies when the company spends money." /> : null}
      {!loading && expenses.length > 0 ? (
        <>
          <p className="mb-3 text-sm font-medium text-ink">Total shown {formatGBP(listedTotal)}</p>
          <div className="space-y-3 md:hidden">
            {expenses.map((expense) => (
              <Card key={expense.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{expense.description}</p>
                    <p className="text-sm text-ink-muted">{formatDate(expense.date)} · {categoryLabel(expense.category)}</p>
                    <p className="text-sm text-ink-muted">{expense.employeeName || 'No employee'}{expense.serviceLabel ? ` · ${expense.serviceLabel}` : ''}</p>
                  </div>
                  <p className="font-semibold">{formatGBP(expense.amount)}</p>
                </div>
                <div className="mt-2"><Badge tone={statusTone(expense.settlement)}>{statusLabel(expense.settlement)}</Badge></div>
                <div className="mt-3 flex gap-2">
                  <Button variant="secondary" onClick={() => openEdit(expense)}>Edit</Button>
                  <Button variant="ghost" onClick={() => setRemoveTarget(expense)}>Delete</Button>
                </div>
              </Card>
            ))}
          </div>
          <Card className="hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="min-w-[960px] w-full">
                <thead className="border-b border-line bg-brand-soft">
                  <tr>{['Date', 'Category', 'Description', 'Amount', 'Employee', 'Related service', 'Reimbursable', 'Status', 'Actions'].map((heading) => <th key={heading} className={thClass}>{heading}</th>)}</tr>
                </thead>
                <tbody>
                  {expenses.map((expense) => (
                    <tr key={expense.id} className="border-b border-line last:border-0">
                      <td className={tdClass}>{formatDate(expense.date)}</td>
                      <td className={tdClass}>{categoryLabel(expense.category)}</td>
                      <td className={tdClass}>{expense.description}</td>
                      <td className={`${tdClass} font-medium`}>{formatGBP(expense.amount)}</td>
                      <td className={tdClass}>{expense.employeeName || '—'}</td>
                      <td className={tdClass}>{expense.serviceLabel || '—'}</td>
                      <td className={tdClass}>{expense.reimbursable ? 'Yes' : 'No'}</td>
                      <td className={tdClass}><Badge tone={statusTone(expense.settlement)}>{statusLabel(expense.settlement)}</Badge></td>
                      <td className={tdClass}>
                        <button type="button" className="rounded-lg p-2 text-ink-muted hover:bg-brand-soft" aria-label="Edit expense" onClick={() => openEdit(expense)}><Pencil className="h-4 w-4" /></button>
                        <button type="button" className="rounded-lg p-2 text-ink-muted hover:bg-red-50 hover:text-danger" aria-label="Delete expense" onClick={() => setRemoveTarget(expense)}><Trash2 className="h-4 w-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : null}

      <Modal open={open} wide title={editing ? 'Edit expense' : 'Add expense'} onClose={() => !busy && setOpen(false)}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date" error={errors.date}><TextInput type="date" value={form.date} disabled={lockedAmount} onChange={(event) => setForm({ ...form, date: event.target.value })} /></Field>
          <Field label="Category">
            <SelectInput value={form.category} disabled={lockedAmount} onChange={(event) => setForm({ ...form, category: event.target.value })}>
              {EXPENSE_CATEGORIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </SelectInput>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Description" error={errors.description}><TextInput value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field>
          </div>
          <Field label="Amount" error={errors.amount} hint={lockedAmount ? 'This amount comes from the service. Edit the service to change it.' : undefined}>
            <MoneyInput value={form.amount} disabled={lockedAmount} onChange={(amount) => setForm({ ...form, amount })} />
          </Field>
          <Field label="Employee" error={errors.employeeId} hint="Required when the employee should be reimbursed.">
            <SelectInput value={form.employeeId} onChange={(event) => setForm({ ...form, employeeId: event.target.value })}>
              <option value="">No employee</option>
              {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.fullName}</option>)}
            </SelectInput>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Related service" hint="Optional. Link an extra cost to a job. Do not re-enter products already saved on that service.">
              <SelectInput value={form.serviceId} disabled={lockedAmount} onChange={(event) => setForm({ ...form, serviceId: event.target.value })}>
                <option value="">No related service</option>
                {services.map((service) => <option key={service.id} value={service.id}>{formatDate(service.serviceDate)} — {service.propertyAddress}</option>)}
              </SelectInput>
            </Field>
          </div>
          <label className="flex items-start gap-3 text-sm sm:col-span-2">
            <input type="checkbox" className="mt-1 h-4 w-4" checked={form.reimbursable} onChange={(event) => setForm({ ...form, reimbursable: event.target.checked })} />
            <span><span className="font-medium">Reimbursable</span><span className="mt-1 block text-ink-muted">Yes means the employee paid this amount and the company owes it back. The weekly payment will include it once.</span></span>
          </label>
          <div className="sm:col-span-2"><Field label="Notes"><TextArea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field></div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
          <Button onClick={() => void save()} disabled={busy} data-testid="save-expense">{busy ? 'Saving…' : 'Save expense'}</Button>
        </div>
      </Modal>
      <ConfirmDialog
        open={Boolean(removeTarget)}
        title="Delete expense"
        message="Delete this expense? If it has already been reimbursed, it will be kept."
        confirmLabel="Delete expense"
        tone="danger"
        busy={busy}
        onClose={() => setRemoveTarget(null)}
        onConfirm={() => void remove()}
      />
    </div>
  )

  function openEdit(expense: ExpenseRecord) {
    setEditing(expense)
    setForm({
      date: expense.date,
      category: expense.category,
      description: expense.description,
      amount: penceToInput(expense.amount),
      employeeId: expense.employeeId ?? '',
      serviceId: expense.serviceId ?? '',
      reimbursable: expense.reimbursable,
      notes: expense.notes ?? '',
    })
    setErrors({})
    setOpen(true)
  }
}
