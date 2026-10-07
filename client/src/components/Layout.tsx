import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  Briefcase,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  Settings,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import { api } from '../lib/api'
import type { Settings as CompanySettings } from '../lib/types'
import { useAuth } from '../context/AuthContext'
import { Logo } from './Logo'

const navigation = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/employees', label: 'Employees', icon: Users },
  { to: '/services', label: 'Services', icon: Briefcase },
  { to: '/expenses', label: 'Expenses', icon: Receipt },
  { to: '/payments', label: 'Payments', icon: Wallet },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
]

function navClass(active: boolean) {
  return `flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition ${
    active ? 'bg-brand-light text-brand' : 'text-ink hover:bg-brand-soft'
  }`
}

export function Layout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [menu, setMenu] = useState(false)
  const [company, setCompany] = useState('CMH Cleaning')

  useEffect(() => {
    setOpen(false)
    setMenu(false)
  }, [location.pathname])

  useEffect(() => {
    api<{ settings: CompanySettings }>('/api/settings')
      .then((data) => setCompany(data.settings.companyName))
      .catch(() => undefined)
  }, [location.pathname])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 py-5">
        <Logo className="h-11 w-auto" />
        <button type="button" className="rounded-lg p-2 text-ink md:hidden" aria-label="Close menu" onClick={() => setOpen(false)}>
          <X className="h-5 w-5" />
        </button>
      </div>
      <nav className="flex-1 space-y-1 px-3" aria-label="Main">
        {navigation.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => navClass(isActive)}
          >
            <item.icon className="h-5 w-5" aria-hidden="true" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-line p-3">
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-brand-soft"
          onClick={() => navigate('/profile')}
        >
          <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-light text-sm font-bold text-brand">
            {user?.name.slice(0, 1).toUpperCase()}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-ink">{user?.name}</span>
            <span className="block truncate text-xs text-ink-muted">{user?.email}</span>
          </span>
        </button>
        <button
          type="button"
          className="mt-1 flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-ink hover:bg-brand-soft"
          onClick={() => void logout()}
        >
          <LogOut className="h-5 w-5" aria-hidden="true" />
          Logout
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-canvas">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2">
        Skip to content
      </a>
      {open ? <button type="button" className="fixed inset-0 z-30 bg-[#172033]/40 md:hidden" aria-label="Close menu" onClick={() => setOpen(false)} /> : null}
      <aside className={`fixed inset-y-0 left-0 z-40 w-[17.5rem] border-r border-line bg-white transition-transform md:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        {sidebar}
      </aside>
      <div className="md:pl-[17.5rem]">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-line bg-white/95 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <button type="button" className="rounded-lg p-2 text-ink md:hidden" aria-label="Open menu" onClick={() => setOpen(true)}>
              <Menu className="h-5 w-5" />
            </button>
            <div className="md:hidden">
              <Logo className="h-8 w-auto" />
            </div>
            <p className="hidden text-sm font-semibold text-ink md:block">{company}</p>
          </div>
          <div className="relative">
            <button
              type="button"
              className="flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-ink hover:bg-brand-soft"
              aria-expanded={menu}
              aria-haspopup="menu"
              onClick={() => setMenu((value) => !value)}
            >
              <span className="grid h-8 w-8 place-items-center rounded-full bg-brand text-xs font-bold text-white">
                {user?.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="hidden sm:inline">Profile</span>
            </button>
            {menu ? (
              <div role="menu" className="absolute right-0 mt-2 w-52 rounded-xl border border-line bg-white p-1 shadow-card">
                <button type="button" role="menuitem" className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-brand-soft" onClick={() => navigate('/profile')}>
                  Profile
                </button>
                <button type="button" role="menuitem" className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-brand-soft" onClick={() => void logout()}>
                  Logout
                </button>
              </div>
            ) : null}
          </div>
        </header>
        <main id="main" className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
