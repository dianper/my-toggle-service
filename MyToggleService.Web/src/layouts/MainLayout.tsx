import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'

function IconApps() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}

function IconToggle() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1" y="5" width="22" height="14" rx="7" />
      <circle cx="16" cy="12" r="3" fill="currentColor" stroke="none" />
    </svg>
  )
}

function IconTenant() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <path d="M20 8v6" />
      <path d="M23 11h-6" />
    </svg>
  )
}

function IconSun() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  )
}

function IconMoon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

function IconLogout() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

function IconPanel() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18" />
    </svg>
  )
}

const navItems = [
  { to: '/applications', label: 'Applications', icon: <IconApps /> },
  { to: '/toggles', label: 'Feature Toggles', icon: <IconToggle /> },
  { to: '/tenants', label: 'Tenants', icon: <IconTenant /> },
]

export default function MainLayout() {
  const { theme, setTheme, isInitialized, user, logout } = useAppContext()
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('mts-sidebar-collapsed')
    setIsSidebarCollapsed(stored === 'true')
  }, [])

  const toggleSidebar = () => {
    setIsSidebarCollapsed((previous) => {
      const next = !previous
      localStorage.setItem('mts-sidebar-collapsed', String(next))
      return next
    })
  }

  if (!isInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--bg-canvas)' }}>
        <p className="text-sm text-[var(--text-secondary)]">Initializing…</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen text-[var(--text-primary)]" style={{ background: 'var(--bg-canvas)' }}>
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-20 flex flex-col border-r border-[var(--surface-border)] bg-[var(--surface-base)] transition-all ${isSidebarCollapsed ? 'w-[76px]' : 'w-[220px]'}`}>
        {/* Brand */}
        <div className={`border-b border-[var(--surface-border)] ${isSidebarCollapsed ? 'px-2 py-3' : 'px-5 py-4'}`}>
          <div className={`flex items-start ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
            {isSidebarCollapsed ? null : (
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent-strong)]">
                  Fortytwo
                </span>
                <h1 className="mt-0.5 text-sm font-black tracking-tight text-[var(--text-primary)]">
                  Toggle Service
                </h1>
              </div>
            )}
            <button
              type="button"
              onClick={toggleSidebar}
              className="rounded-md p-2 text-[var(--text-secondary)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
              title={isSidebarCollapsed ? 'Expand menu' : 'Collapse menu'}
              aria-label={isSidebarCollapsed ? 'Expand menu' : 'Collapse menu'}
            >
              <IconPanel />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className={`flex-1 overflow-y-auto py-3 ${isSidebarCollapsed ? 'px-1.5' : 'px-2'}`}>
          {isSidebarCollapsed ? null : (
            <p className="px-3 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--text-tertiary)]">
              Platform
            </p>
          )}
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              title={item.label}
              className={({ isActive }) =>
                `flex items-center rounded-lg py-2 text-sm font-medium transition-colors ${isSidebarCollapsed ? 'justify-center px-2' : 'gap-2.5 px-3'} ${
                  isActive
                    ? 'bg-[var(--accent)] text-[var(--accent-contrast)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]'
                }`
              }
            >
              {item.icon}
              {isSidebarCollapsed ? null : item.label}
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div className={`border-t border-[var(--surface-border)] ${isSidebarCollapsed ? 'px-1.5 py-3' : 'px-3 py-3'}`}>
          {isSidebarCollapsed ? null : (
            <div className="mb-3 flex items-center gap-2 rounded-lg bg-[var(--surface-muted)] px-3 py-2">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--text-tertiary)]">
                  Logged in
                </p>
                <p className="truncate text-xs font-medium text-[var(--text-primary)]" title={user?.email}>
                  {user?.email}
                </p>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={logout}
            title="Logout"
            className={`flex w-full items-center justify-center rounded-lg py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] ${isSidebarCollapsed ? 'px-2' : 'gap-2 px-3'}`}
          >
            <IconLogout />
            {isSidebarCollapsed ? null : 'Logout'}
          </button>
        </div>

        {/* Theme toggle */}
        <div className={`border-t border-[var(--surface-border)] ${isSidebarCollapsed ? 'px-1.5 py-3' : 'px-3 py-4'}`}>
          {isSidebarCollapsed ? null : (
            <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--text-tertiary)]">
              Appearance
            </p>
          )}
          <div className={`rounded-lg border border-[var(--surface-border)] bg-[var(--surface-muted)] p-0.5 ${isSidebarCollapsed ? 'grid gap-1' : 'flex'}`}>
            {(['light', 'dark'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setTheme(mode)}
                title={mode === 'light' ? 'Light mode' : 'Dark mode'}
                className={`flex flex-1 items-center justify-center rounded-md py-1.5 text-xs font-semibold capitalize transition ${isSidebarCollapsed ? 'px-2' : 'gap-1.5'} ${
                  theme === mode
                    ? 'bg-[var(--accent)] text-[var(--accent-contrast)] shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {mode === 'light' ? <IconSun /> : <IconMoon />}
                {isSidebarCollapsed ? null : mode}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Content area */}
      <div className={`flex flex-1 flex-col transition-all ${isSidebarCollapsed ? 'ml-[76px]' : 'ml-[220px]'}`}>
        <main className="flex-1 px-8 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
