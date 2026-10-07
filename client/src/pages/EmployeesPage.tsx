import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Pencil, Plus, Eye } from 'lucide-react'
import { EmployeeFields, emptyEmployeeForm, validateEmployee, type EmployeeFormState } from '../components/EmployeeForm'
import { Modal } from '../components/Modal'
import { ConfirmDialog } from '../components/Modal'
import { Badge, Button, Card, EmptyState, ErrorBanner, LoadingState, PageHeader, TextInput, statusLabel, statusTone, tdClass, thClass } from '../components/ui'
import { useToast } from '../context/ToastContext'
import { useI18n } from '../i18n'
import { api, errorMessage, fieldErrors } from '../lib/api'
import { formatGBP, penceToInput } from '../lib/format'
import type { Employee } from '../lib/types'
import { useTitle } from '../lib/useTitle'

export function EmployeesPage() {
  const { t, text } = useI18n()
  useTitle(t('employees.title'))
  const toast = useToast()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState<EmployeeFormState>(emptyEmployeeForm())
  const [editing, setEditing] = useState<Employee | null>(null)
  const [open, setOpen] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [disableTarget, setDisableTarget] = useState<Employee | null>(null)

  function load() {
    const params = new URLSearchParams()
    if (search.trim()) params.set('search', search.trim())
    if (status) params.set('status', status)
    setLoading(true)
    api<{ employees: Employee[] }>(`/api/employees?${params.toString()}`)
      .then((data) => {
        setEmployees(data.employees)
        setError('')
      })
      .catch((caught) => setError(text(errorMessage(caught))))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    const timer = window.setTimeout(load, 250)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status])

  function startCreate() {
    setEditing(null)
    setForm(emptyEmployeeForm())
    setErrors({})
    setOpen(true)
  }

  function startEdit(employee: Employee) {
    setEditing(employee)
    setForm({
      fullName: employee.fullName,
      phone: employee.phone ?? '',
      email: employee.email ?? '',
      defaultRate: penceToInput(employee.defaultRate),
      status: employee.status,
      notes: employee.notes ?? '',
    })
    setErrors({})
    setOpen(true)
  }

  async function save() {
    const nextErrors = validateEmployee(form, t)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    setBusy(true)
    try {
      const body = {
        fullName: form.fullName,
        phone: form.phone,
        email: form.email,
        defaultRate: form.defaultRate,
        status: form.status,
        notes: form.notes,
      }
      if (editing) {
        await api(`/api/employees/${editing.id}`, { method: 'PUT', body })
        toast.success(t('employees.updated'))
      } else {
        await api('/api/employees', { method: 'POST', body })
        toast.success(t('employees.added'))
      }
      setOpen(false)
      load()
    } catch (caught) {
      const details = fieldErrors(caught)
      setErrors(Object.fromEntries(Object.entries(details).map(([key, value]) => [key, text(value)])))
      toast.error(text(errorMessage(caught)))
    } finally {
      setBusy(false)
    }
  }

  async function changeStatus(employee: Employee) {
    setBusy(true)
    try {
      await api(`/api/employees/${employee.id}`, {
        method: 'PUT',
        body: {
          fullName: employee.fullName,
          phone: employee.phone ?? '',
          email: employee.email ?? '',
          defaultRate: penceToInput(employee.defaultRate),
          status: employee.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
          notes: employee.notes ?? '',
        },
      })
      toast.success(employee.status === 'ACTIVE' ? t('employees.disabled') : t('employees.enabled'))
      setDisableTarget(null)
      load()
    } catch (caught) {
      toast.error(text(errorMessage(caught)))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        title={t('employees.title')}
        subtitle={t('employees.subtitle')}
        action={
          <Button onClick={startCreate} data-testid="add-employee">
            <Plus className="h-4 w-4" /> {t('employees.add')}
          </Button>
        }
      />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <TextInput value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('employees.search')} aria-label={t('employees.searchLabel')} />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          aria-label={t('employees.filterStatus')}
          className="min-h-11 rounded-lg border border-[#D0D5DD] bg-white px-3 text-sm sm:w-48"
        >
          <option value="">{t('employees.allStatuses')}</option>
          <option value="ACTIVE">{t('status.ACTIVE')}</option>
          <option value="INACTIVE">{t('status.INACTIVE')}</option>
        </select>
      </div>
      {error ? <ErrorBanner message={error} onRetry={load} /> : null}
      {loading ? <LoadingState label={t('employees.loading')} /> : null}
      {!loading && employees.length === 0 ? (
        <EmptyState title={t('employees.emptyTitle')} body={t('employees.emptyBody')} />
      ) : null}
      {!loading && employees.length > 0 ? (
        <>
          <div className="space-y-3 md:hidden">
            {employees.map((employee) => (
              <Card key={employee.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink">{employee.fullName}</p>
                    <p className="text-sm text-ink-muted">{employee.phone || t('common.noPhone')}</p>
                    <p className="text-sm text-ink-muted">{employee.email || t('common.noEmail')}</p>
                  </div>
                  <Badge tone={statusTone(employee.status)}>{statusLabel(employee.status, t)}</Badge>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div><dt className="text-ink-muted">{t('employees.defaultRate')}</dt><dd className="font-medium">{formatGBP(employee.defaultRate)}</dd></div>
                  <div><dt className="text-ink-muted">{t('common.services')}</dt><dd className="font-medium">{employee.serviceCount}</dd></div>
                  <div className="col-span-2"><dt className="text-ink-muted">{t('employees.totalEarned')}</dt><dd className="font-medium">{formatGBP(employee.totalEarned)}</dd></div>
                </dl>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link to={`/employees/${employee.id}`} className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-brand">{t('common.view')}</Link>
                  <Button variant="secondary" onClick={() => startEdit(employee)}>{t('common.edit')}</Button>
                  <Button variant="ghost" onClick={() => setDisableTarget(employee)}>{employee.status === 'ACTIVE' ? t('employees.disable') : t('employees.enable')}</Button>
                </div>
              </Card>
            ))}
          </div>
          <Card className="hidden overflow-hidden md:block">
            <table className="w-full">
              <thead className="border-b border-line bg-brand-soft">
                <tr>
                  {[t('common.employee'), t('common.phone'), t('common.email'), t('employees.defaultRate'), t('common.services'), t('employees.totalEarned'), t('common.status'), t('common.actions')].map((heading) => (
                    <th key={heading} className={thClass}>{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.id} className="border-b border-line last:border-0">
                    <td className={`${tdClass} font-medium`}>{employee.fullName}</td>
                    <td className={tdClass}>{employee.phone || t('common.none')}</td>
                    <td className={tdClass}>{employee.email || t('common.none')}</td>
                    <td className={tdClass}>{formatGBP(employee.defaultRate)}</td>
                    <td className={tdClass}>{employee.serviceCount}</td>
                    <td className={tdClass}>{formatGBP(employee.totalEarned)}</td>
                    <td className={tdClass}><Badge tone={statusTone(employee.status)}>{statusLabel(employee.status, t)}</Badge></td>
                    <td className={tdClass}>
                      <div className="flex gap-1">
                        <Link to={`/employees/${employee.id}`} className="rounded-lg p-2 text-ink-muted hover:bg-brand-soft hover:text-brand" aria-label={t('employees.viewName', { name: employee.fullName })} title={t('common.view')}><Eye className="h-4 w-4" /></Link>
                        <button type="button" className="rounded-lg p-2 text-ink-muted hover:bg-brand-soft hover:text-brand" aria-label={t('employees.editName', { name: employee.fullName })} title={t('common.edit')} onClick={() => startEdit(employee)}><Pencil className="h-4 w-4" /></button>
                        <button type="button" className="rounded-lg px-2 text-sm font-semibold text-ink-muted hover:bg-brand-soft hover:text-ink" onClick={() => setDisableTarget(employee)}>
                          {employee.status === 'ACTIVE' ? t('employees.disable') : t('employees.enable')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      ) : null}

      <Modal open={open} title={editing ? t('employees.editTitle') : t('employees.addTitle')} subtitle={t('employees.formHint')} onClose={() => !busy && setOpen(false)}>
        <EmployeeFields form={form} onChange={setForm} errors={errors} />
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={busy}>{t('common.cancel')}</Button>
          <Button onClick={() => void save()} disabled={busy} data-testid="save-employee">{busy ? t('common.saving') : t('employees.save')}</Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(disableTarget)}
        title={disableTarget?.status === 'ACTIVE' ? t('employees.disableTitle') : t('employees.enableTitle')}
        message={
          disableTarget?.status === 'ACTIVE'
            ? t('employees.disableMessage', { name: disableTarget.fullName })
            : t('employees.enableMessage', { name: disableTarget?.fullName ?? '' })
        }
        confirmLabel={disableTarget?.status === 'ACTIVE' ? t('employees.disable') : t('employees.enable')}
        tone={disableTarget?.status === 'ACTIVE' ? 'danger' : 'primary'}
        busy={busy}
        onClose={() => setDisableTarget(null)}
        onConfirm={() => disableTarget && void changeStatus(disableTarget)}
      />
    </div>
  )
}
