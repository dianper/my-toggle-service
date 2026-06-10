import { useEffect, useMemo, useState } from 'react'
import { listApplications, listToggles, setToggleEnabled, evaluateToggle, createToggle } from '../../../api'
import type { Application, Toggle } from '../../../types'

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}

function RefreshIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  )
}

export default function ListTogglesPage() {
  const [applications, setApplications] = useState<Application[]>([])
  const [toggles, setToggles] = useState<Toggle[]>([])
  const [applicationFilter, setApplicationFilter] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingApplications, setIsLoadingApplications] = useState(true)
  const [evaluation, setEvaluation] = useState('')
  const [status, setStatus] = useState('')

  // Create toggle modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newApplicationId, setNewApplicationId] = useState('')
  const [newKey, setNewKey] = useState('')
  const [newTenants, setNewTenants] = useState('')
  const [newEnabled, setNewEnabled] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  const canCreate = useMemo(
    () => newApplicationId.trim() !== '' && newKey.trim() !== '',
    [newApplicationId, newKey],
  )

  async function loadData() {
    setIsLoading(true)
    try {
      const data = await listToggles(applicationFilter || undefined)
      setToggles(data)
      setStatus(`${data.length} toggle${data.length !== 1 ? 's' : ''}`)
    } catch (error) {
      setStatus(`Failed to load toggles: ${(error as Error).message}`)
    } finally {
      setIsLoading(false)
    }
  }

  async function loadApplications() {
    setIsLoadingApplications(true)
    try {
      const data = await listApplications()
      setApplications(data)
    } catch (error) {
      setStatus(`Failed to load applications: ${(error as Error).message}`)
    } finally {
      setIsLoadingApplications(false)
    }
  }

  useEffect(() => {
    ;(async () => {
      try {
        await loadApplications()
        await loadData()
      } catch (error) {
        setStatus(`Failed to initialize: ${(error as Error).message}`)
        setIsLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!isLoadingApplications) {
      loadData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationFilter])

  async function handleToggleStatus(toggle: Toggle) {
    try {
      await setToggleEnabled(toggle.id, !toggle.isEnabled)
      await loadData()
    } catch (error) {
      setStatus(`Failed to update toggle: ${(error as Error).message}`)
    }
  }

  async function handleEvaluate(toggle: Toggle) {
    try {
      const result = await evaluateToggle(toggle.applicationId, toggle.key, toggle.tenantId)
      setEvaluation(
        `${toggle.applicationName}/${result.key} → enabled=${result.isEnabled} (${result.resolution})`,
      )
    } catch (error) {
      setEvaluation(`Evaluation failed: ${(error as Error).message}`)
    }
  }

  function openCreateModal() {
    setNewKey('')
    setNewTenants('')
    setNewEnabled(false)
    setCreateError('')
    setNewApplicationId(applications[0]?.id ?? '')
    setShowCreateModal(true)
  }

  async function handleCreate() {
    if (!canCreate) return

    const tenantIds = newTenants
      .split(',')
      .map((x) => x.trim())
      .filter((x) => x.length > 0)

    setIsCreating(true)
    setCreateError('')
    try {
      await createToggle({
        key: newKey.trim(),
        applicationId: newApplicationId,
        isEnabled: newEnabled,
        tenantIds: tenantIds.length === 0 ? null : tenantIds,
      })
      setShowCreateModal(false)
      await loadData()
    } catch (error) {
      setCreateError((error as Error).message)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <>
      {/* Page header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">Feature Toggles</h2>
          <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
            {isLoading ? 'Loading…' : status}
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3.5 py-2 text-sm font-semibold text-[var(--accent-contrast)] transition hover:brightness-110"
        >
          <PlusIcon />
          New Toggle
        </button>
      </div>

      {/* Filters bar */}
      <div className="mb-4 flex items-center gap-3">
        <div className="relative">
          <select
            className="appearance-none rounded-lg border border-[var(--surface-border)] bg-[var(--surface-base)] py-2 pl-3 pr-8 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
            value={applicationFilter}
            onChange={(e) => setApplicationFilter(e.target.value)}
          >
            <option value="">All applications</option>
            {applications.map((app) => (
              <option key={app.id} value={app.id}>
                {app.name}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-[var(--text-tertiary)]">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
          </div>
        </div>
        <button
          type="button"
          onClick={loadData}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-base)] px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
        >
          <RefreshIcon />
          Refresh
        </button>
        {evaluation && (
          <span className="ml-auto rounded-lg border border-[var(--surface-border)] bg-[var(--surface-muted)] px-3 py-2 text-xs text-[var(--text-secondary)]">
            {evaluation}
          </span>
        )}
      </div>

      {/* Toggles table */}
      <div className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-base)] shadow-[var(--card-shadow)]">
        {isLoading ? (
          <div className="px-6 py-12 text-center text-sm text-[var(--text-secondary)]">Loading…</div>
        ) : toggles.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-[var(--text-secondary)]">No toggles found.</p>
            <button
              type="button"
              onClick={openCreateModal}
              className="mt-3 text-sm font-semibold text-[var(--accent)] hover:underline"
            >
              Create your first toggle →
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--surface-border)] text-left text-xs uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
                  <th className="px-6 py-3 font-semibold">Application</th>
                  <th className="px-6 py-3 font-semibold">Key</th>
                  <th className="px-6 py-3 font-semibold">Tenant</th>
                  <th className="px-6 py-3 font-semibold">State</th>
                  <th className="px-6 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {toggles.map((toggle, i) => (
                  <tr
                    key={toggle.id}
                    className={`transition-colors hover:bg-[var(--surface-muted)] ${i < toggles.length - 1 ? 'border-b border-[var(--surface-border-soft)]' : ''}`}
                  >
                    <td className="px-6 py-3.5 font-semibold text-[var(--text-primary)]">{toggle.applicationName}</td>
                    <td className="px-6 py-3.5 font-mono text-xs text-[var(--text-secondary)]">{toggle.key}</td>
                    <td className="px-6 py-3.5">
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
                    <td className="px-6 py-3.5">
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
                    <td className="px-6 py-3.5">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(toggle)}
                          className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-muted)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-elevated)]"
                        >
                          Toggle
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEvaluate(toggle)}
                          className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-muted)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-elevated)]"
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
      </div>

      {/* New Toggle Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowCreateModal(false)}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-base)] p-6 shadow-[var(--panel-shadow)]">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">New Toggle</h3>
                <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
                  Create a feature toggle for an application.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg p-1 text-[var(--text-tertiary)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-medium text-[var(--text-secondary)]">
                Application <span className="text-[var(--danger-text)]">*</span>
                <div className="relative mt-1.5">
                  <select
                    className="w-full appearance-none rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] py-2.5 pl-3 pr-8 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-50"
                    value={newApplicationId}
                    onChange={(e) => setNewApplicationId(e.target.value)}
                    disabled={applications.length === 0}
                  >
                    {applications.length === 0 ? (
                      <option value="">No applications available</option>
                    ) : (
                      applications.map((app) => (
                        <option key={app.id} value={app.id}>
                          {app.name}
                        </option>
                      ))
                    )}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-[var(--text-tertiary)]">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
                  </div>
                </div>
              </label>

              <label className="block text-sm font-medium text-[var(--text-secondary)]">
                Key <span className="text-[var(--danger-text)]">*</span>
                <input
                  autoFocus
                  className="mt-1.5 w-full rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder="billing.new-checkout"
                />
              </label>

              <label className="block text-sm font-medium text-[var(--text-secondary)]">
                Tenant IDs
                <input
                  className="mt-1.5 w-full rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
                  value={newTenants}
                  onChange={(e) => setNewTenants(e.target.value)}
                  placeholder="comma-separated UUIDs, empty = global"
                />
              </label>

              <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm font-medium text-[var(--text-secondary)]">
                <input
                  type="checkbox"
                  checked={newEnabled}
                  onChange={(e) => setNewEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-[var(--surface-border)] accent-[var(--accent)]"
                />
                Start enabled
              </label>

              {createError && <p className="text-xs text-[var(--danger-text)]">{createError}</p>}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg border border-[var(--surface-border)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-muted)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={isCreating || !canCreate || applications.length === 0}
                  className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-contrast)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isCreating ? 'Creating…' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
