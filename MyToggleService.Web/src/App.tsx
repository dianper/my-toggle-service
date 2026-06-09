import { useEffect, useMemo, useState } from 'react'
import {
  createToggle,
  evaluateToggle,
  getDevToken,
  listToggles,
  setToggleEnabled,
} from './api'
import type { Toggle } from './types'

type ThemeMode = 'light' | 'dark'

function App() {
  const [theme, setTheme] = useState<ThemeMode>('light')
  const [toggles, setToggles] = useState<Toggle[]>([])
  const [applicationFilter, setApplicationFilter] = useState('')
  const [newApplication, setNewApplication] = useState('service-a')
  const [newKey, setNewKey] = useState('billing.new-checkout')
  const [newTenants, setNewTenants] = useState('')
  const [newEnabled, setNewEnabled] = useState(false)
  const [evaluation, setEvaluation] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [status, setStatus] = useState('Initializing...')

  const canCreate = useMemo(
    () => newApplication.trim() !== '' && newKey.trim() !== '',
    [newApplication, newKey],
  )

  useEffect(() => {
    const stored = localStorage.getItem('mts-theme')
    if (stored === 'light' || stored === 'dark') {
      setTheme(stored)
      return
    }

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    setTheme(prefersDark ? 'dark' : 'light')
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('mts-theme', theme)
  }, [theme])

  async function loadData() {
    setIsLoading(true)
    try {
      const data = await listToggles(applicationFilter || undefined)
      setToggles(data)
      setStatus(`Loaded: ${data.length} toggle(s)`)
    } catch (error) {
      setStatus(`Failed to load toggles: ${(error as Error).message}`)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    ;(async () => {
      try {
        await getDevToken('web-admin')
        await loadData()
      } catch (error) {
        setStatus(`Failed to get dev token: ${(error as Error).message}`)
        setIsLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleCreate() {
    if (!canCreate) {
      return
    }

    const tenantIds = newTenants
      .split(',')
      .map((x) => x.trim())
      .filter((x) => x.length > 0)

    try {
      await createToggle({
        key: newKey.trim(),
        application: newApplication.trim(),
        isEnabled: newEnabled,
        tenantIds: tenantIds.length === 0 ? null : tenantIds,
      })
      setStatus('Toggle created successfully.')
      setNewTenants('')
      await loadData()
    } catch (error) {
      setStatus(`Failed to create toggle: ${(error as Error).message}`)
    }
  }

  async function handleToggleStatus(toggle: Toggle) {
    try {
      await setToggleEnabled(toggle.id, !toggle.isEnabled)
      setStatus(`Toggle ${toggle.key} updated to ${!toggle.isEnabled ? 'enabled' : 'disabled'}.`)
      await loadData()
    } catch (error) {
      setStatus(`Failed to update toggle: ${(error as Error).message}`)
    }
  }

  async function handleEvaluate(toggle: Toggle) {
    try {
      const result = await evaluateToggle(toggle.application, toggle.key, toggle.tenantId)
      setEvaluation(
        `Resolved ${result.application}/${result.key} => enabled=${result.isEnabled} (${result.resolution})`,
      )
    } catch (error) {
      setEvaluation(`Evaluation failed: ${(error as Error).message}`)
    }
  }

  return (
    <main className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] transition-colors duration-300">
      <div className="mx-auto max-w-6xl px-4 py-10 md:px-8">
        <header className="mb-8 overflow-hidden rounded-[28px] border border-[var(--surface-border)] bg-[var(--surface-elevated)] shadow-[var(--panel-shadow)] backdrop-blur">
          <div className="flex flex-col gap-6 px-6 py-6 md:px-8 md:py-7">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--accent-strong)]">
                  Internal Platform
                </p>
                <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
                  Feature Toggle Control Room
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--text-secondary)] md:text-base">
                  Manage feature switches across applications with clear tenant-specific
                  overrides and a global fallback model.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start rounded-full border border-[var(--surface-border)] bg-[var(--surface-muted)] p-1">
                {(['light', 'dark'] as ThemeMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setTheme(mode)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold capitalize transition ${
                      theme === mode
                        ? 'bg-[var(--accent)] text-[var(--accent-contrast)] shadow-sm'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)]'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 text-sm md:grid-cols-3">
              <div className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-muted)] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                  Scope model
                </p>
                <p className="mt-2 text-[var(--text-secondary)]">
                  Tenant-specific toggles override global rules for the same application key.
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-muted)] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                  Team usage
                </p>
                <p className="mt-2 text-[var(--text-secondary)]">
                  Built for internal teams that need a small, centralized control plane.
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-muted)] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                  Current status
                </p>
                <p className="mt-2 text-[var(--text-secondary)]">{status}</p>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-6 md:grid-cols-2">
          <article className="rounded-[24px] border border-[var(--surface-border)] bg-[var(--surface-base)] p-5 shadow-[var(--card-shadow)] transition-colors md:p-6">
            <h2 className="text-lg font-bold md:text-xl">Create Toggle</h2>
            <div className="mt-4 grid gap-3">
              <label className="text-sm font-medium text-[var(--text-secondary)]">
                Application
                <input
                  className="mt-1 w-full rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] px-3 py-2.5 text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
                  value={newApplication}
                  onChange={(event) => setNewApplication(event.target.value)}
                />
              </label>
              <label className="text-sm font-medium text-[var(--text-secondary)]">
                Key
                <input
                  className="mt-1 w-full rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] px-3 py-2.5 text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
                  value={newKey}
                  onChange={(event) => setNewKey(event.target.value)}
                />
              </label>
              <label className="text-sm font-medium text-[var(--text-secondary)]">
                Tenant IDs (CSV, empty = global)
                <input
                  className="mt-1 w-full rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] px-3 py-2.5 text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
                  value={newTenants}
                  onChange={(event) => setNewTenants(event.target.value)}
                  placeholder="2bc1..., 9ad4..."
                />
              </label>
              <label className="inline-flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)]">
                <input
                  type="checkbox"
                  checked={newEnabled}
                  onChange={(event) => setNewEnabled(event.target.checked)}
                  className="h-4 w-4 rounded border-[var(--surface-border)] text-[var(--accent)] focus:ring-[var(--ring)]"
                />
                Start enabled
              </label>
              <button
                type="button"
                onClick={handleCreate}
                disabled={!canCreate}
                className="rounded-xl bg-[var(--accent)] px-4 py-2.5 font-semibold text-[var(--accent-contrast)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </article>

          <article className="rounded-[24px] border border-[var(--surface-border)] bg-[var(--surface-base)] p-5 shadow-[var(--card-shadow)] transition-colors md:p-6">
            <h2 className="text-lg font-bold md:text-xl">Filters & Runtime Status</h2>
            <div className="mt-4 grid gap-3">
              <label className="text-sm font-medium text-[var(--text-secondary)]">
                Filter by application
                <input
                  className="mt-1 w-full rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] px-3 py-2.5 text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
                  value={applicationFilter}
                  onChange={(event) => setApplicationFilter(event.target.value)}
                  placeholder="service-a"
                />
              </label>
              <button
                type="button"
                onClick={loadData}
                className="rounded-xl border border-[var(--surface-border-strong)] bg-[var(--surface-muted)] px-4 py-2.5 font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-elevated)]"
              >
                Refresh
              </button>
              <p className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--text-secondary)]">
                {status}
              </p>
              {evaluation && (
                <p className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--text-secondary)]">
                  {evaluation}
                </p>
              )}
            </div>
          </article>
        </section>

        <section className="mt-6 rounded-[24px] border border-[var(--surface-border)] bg-[var(--surface-base)] p-5 shadow-[var(--card-shadow)] transition-colors md:p-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <h2 className="text-lg font-bold md:text-xl">Toggle Inventory</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Global entries are shared across tenants unless a tenant-specific rule exists.
            </p>
          </div>

          {isLoading ? (
            <p className="mt-4 text-sm text-[var(--text-secondary)]">Loading toggles...</p>
          ) : toggles.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--text-secondary)]">No toggles found.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[var(--surface-border)] text-left text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                    <th className="py-3 pr-3">Application</th>
                    <th className="py-3 pr-3">Key</th>
                    <th className="py-3 pr-3">Tenant</th>
                    <th className="py-3 pr-3">State</th>
                    <th className="py-3 pr-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {toggles.map((toggle) => (
                    <tr key={toggle.id} className="border-b border-[var(--surface-border-soft)] last:border-b-0">
                      <td className="py-3 pr-3 font-medium">{toggle.application}</td>
                      <td className="py-3 pr-3 text-[var(--text-secondary)]">{toggle.key}</td>
                      <td className="py-3 pr-3">
                        {toggle.tenantId ? (
                          <span className="inline-flex rounded-full border border-[var(--surface-border)] bg-[var(--tenant-chip-bg)] px-2.5 py-1 text-xs font-medium text-[var(--tenant-chip-text)]">
                            {toggle.tenantId}
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full border border-[var(--surface-border)] bg-[var(--global-chip-bg)] px-2.5 py-1 text-xs font-semibold text-[var(--global-chip-text)]">
                            Global
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            toggle.isEnabled
                              ? 'bg-[var(--success-bg)] text-[var(--success-text)]'
                              : 'bg-[var(--danger-bg)] text-[var(--danger-text)]'
                          }`}
                        >
                          {toggle.isEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </td>
                      <td className="py-3 pr-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(toggle)}
                            className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-elevated)]"
                          >
                            Toggle
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEvaluate(toggle)}
                            className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-elevated)]"
                          >
                            Evaluate
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

export default App
