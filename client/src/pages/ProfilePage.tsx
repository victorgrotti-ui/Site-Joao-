import { PasswordForm } from '../components/PasswordForm'
import { Button, Card, PageHeader } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../i18n'
import { useTitle } from '../lib/useTitle'

export function ProfilePage() {
  const { t } = useI18n()
  useTitle(t('profile.title'))
  const { user, logout } = useAuth()

  return (
    <div>
      <PageHeader title={t('profile.title')} subtitle={t('profile.subtitle')} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <dl className="space-y-3 text-sm">
            <div><dt className="text-ink-muted">{t('common.name')}</dt><dd className="text-base font-semibold text-ink">{user?.name}</dd></div>
            <div><dt className="text-ink-muted">{t('common.email')}</dt><dd className="font-medium">{user?.email}</dd></div>
            <div><dt className="text-ink-muted">{t('common.role')}</dt><dd className="font-medium">{user?.role === 'ADMIN' ? t('common.administrator') : t('common.manager')}</dd></div>
          </dl>
          <Button className="mt-6" variant="secondary" onClick={() => void logout()}>{t('nav.logout')}</Button>
        </Card>
        <Card className="p-5">
          <h2 className="text-base font-semibold">{t('profile.change')}</h2>
          <div className="mt-4">
            <PasswordForm />
          </div>
        </Card>
      </div>
    </div>
  )
}
