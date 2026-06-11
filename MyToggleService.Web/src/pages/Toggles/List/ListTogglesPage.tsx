import { useEffect, useMemo, useState } from 'react'
import {
  createToggle,
  deleteToggle,
  evaluateToggle,
  listApplications,
  listTenants,
  listToggles,
  setToggleEnabled,
  updateToggleGroup,
} from '../../../api'
import type { Application, Tenant, Toggle } from '../../../types'

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
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [toggles, setToggles] = useState<Toggle[]>([])
  const [applicationFilter, setApplicationFilter] = useState('')
  const [tenantFilter, setTenantFilter] = useState('')
  const [keyFilter, setKeyFilter] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingApplications, setIsLoadingApplications] = useState(true)
  const [isLoadingTenants, setIsLoadingTenants] = useState(true)
  const [evaluation, setEvaluation] = useState('')
  const [status, setStatus] = useState('')

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newApplicationId, setNewApplicationId] = useState('')
  const [newKey, setNewKey] = useState('')
  const [newTenantIds, setNewTenantIds] = useState<string[]>([])
  const [newEnabled, setNewEnabled] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  const [editTarget, setEditTarget] = useState<Toggle | null>(null)
  const [editApplicationId, setEditApplicationId] = useState('')
  const [editKey, setEditKey] = useState('')
  const [editTenantIds, setEditTenantIds] = useState<string[]>([])
  const [editEnabled, setEditEnabled] = useState(false)
  const [editGroupHasMixedStates, setEditGroupHasMixedStates] = useState(false)
  const [isEditSaving, setIsEditSaving] = useState(false)
  const [editError, setEditError] = useState('')

  const [deleteTarget, setDeleteTarget] = useState<Toggle | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const canCreate = useMemo(
    () => newApplicationId.trim() !== '' && newKey.trim() !== '',
    [newApplicationId, newKey],
  )

  const tenantNameById = useMemo(
    () => new Map(tenants.map((tenant) => [tenant.id, tenant.name])),
    [tenants],
  )

  const filteredToggles = useMemo(() => {
    const normalizedKeyFilter = keyFilter.trim().toLowerCase()

    return toggles.filter((toggle) => {
      if (tenantFilter === '__global__' && toggle.tenantId !== null) {
        return false
      }

      if (tenantFilter !== '' && tenantFilter !== '__global__' && toggle.tenantId !== tenantFilter) {
        return false
      }

      if (normalizedKeyFilter !== '' && !toggle.key.toLowerCase().includes(normalizedKeyFilter)) {
        return false
      }

      return true
    })
  }, [toggles, tenantFilter, keyFilter])

  const statusText = useMemo(() => {
    if (status) {
      return status
    }

    const hasLocalFilters = tenantFilter !== '' || keyFilter.trim() !== ''
    const suffix = hasLocalFilters ? ` (filtered from ${toggles.length})` : ''
    return `${filteredToggles.length} toggle${filteredToggles.length !== 1 ? 's' : ''}${suffix}`
  }, [status, filteredToggles.length, toggles.length, tenantFilter, keyFilter])

  async function loadData() {
    setIsLoading(true)
    try {
      const data = await listToggles(applicationFilter || undefined)
      setToggles(data)
      setStatus('')
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

  async function loadTenants() {
    setIsLoadingTenants(true)
    try {
      const data = await listTenants()
      setTenants(data)
    } catch (error) {
      setStatus(`Failed to load tenants: ${(error as Error).message}`)
    } finally {
      setIsLoadingTenants(false)
    }
  }

  useEffect(() => {
    ;(async () => {
      try {
        await Promise.all([loadApplications(), loadTenants()])
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
        `${toggle.applicationName}/${result.key} -> enabled=${result.isEnabled} (${result.resolution})`,
      )
    } catch (error) {
      setEvaluation(`Evaluation failed: ${(error as Error).message}`)
    }
  }

  function toggleSelection(current: string[], id: string) {
    if (current.includes(id)) {
      return current.filter((item) => item !== id)
    }

    return [...current, id]
  }

  function openCreateModal() {
    setNewKey('')
    setNewTenantIds([])
    setNewEnabled(false)
    setCreateError('')
    setNewApplicationId(applications[0]?.id ?? '')
    setShowCreateModal(true)
  }

  function openEditModal(toggle: Toggle) {
    const group = toggles.filter(
      (item) => item.applicationId === toggle.applicationId && item.key === toggle.key,
    )
    const tenantIds = group
      .map((item) => item.tenantId)
      .filter((id): id is string => id !== null)

    const allEnabled = group.every((item) => item.isEnabled)
    const noneEnabled = group.every((item) => !item.isEnabled)

    setEditTarget(toggle)
    setEditApplicationId(toggle.applicationId)
    setEditKey(toggle.key)
    setEditTenantIds(tenantIds)
    setEditEnabled(toggle.isEnabled)
    setEditGroupHasMixedStates(!allEnabled && !noneEnabled)
    setEditError('')
  }

  async function handleEdit() {
    if (!editTarget || !editKey.trim()) return

    setIsEditSaving(true)
    setEditError('')
    try {
      await updateToggleGroup({
        key: editKey.trim(),
        applicationId: editApplicationId,
        isEnabled: editEnabled,
        tenantIds: editTenantIds.length === 0 ? null : editTenantIds,
      })
      setEditTarget(null)
      await loadData()
    } catch (error) {
      setEditError((error as Error).message)
    } finally {
      setIsEditSaving(false)
    }
  }

  function openDeleteModal(toggle: Toggle) {
    setDeleteTarget(toggle)
    setDeleteError('')
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setIsDeleting(true)
    setDeleteError('')
    try {
      await deleteToggle(deleteTarget.id)
      setDeleteTarget(null)
      await loadData()
    } catch (error) {
      setDeleteError((error as Error).message)
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleCreate() {
    if (!canCreate) return

    setIsCreating(true)
    setCreateError('')
    try {
      await createToggle({
        key: newKey.trim(),
        applicationId: newApplicationId,
        isEnabled: newEnabled,
        tenantIds: newTenantIds.length === 0 ? null : newTenantIds,
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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">Feature Toggles</h2>
          <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
            {isLoading ? 'Loading…' : statusText}
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

      <div className="mb-4 flex flex-wrap items-center gap-3">
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
        <div className="relative">
          <select
            className="appearance-none rounded-lg border border-[var(--surface-border)] bg-[var(--surface-base)] py-2 pl-3 pr-8 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
            value={tenantFilter}
            onChange={(e) => setTenantFilter(e.target.value)}
            disabled={isLoadingTenants}
          >
            <option value="">All tenants</option>
            <option value="__global__">Global only</option>
            {tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.name}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-[var(--text-tertiary)]">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
          </div>
        </div>
        <input
          className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-base)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
          value={keyFilter}
          onChange={(e) => setKeyFilter(e.target.value)}
          placeholder="Filter by key"
        />
        <button
          type="button"
          onClick={loadData}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-base)] px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
        >
          <RefreshIcon />
          Refresh
        </button>
        {evaluation && (
          <span className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-muted)] px-3 py-2 text-xs text-[var(--text-secondary)] md:ml-auto">
            {evaluation}
          </span>
        )}
      </div>

      <div className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-base)] shadow-[var(--card-shadow)]">
        {isLoading ? (
          <div className="px-6 py-12 text-center text-sm text-[var(--text-secondary)]">Loading…</div>
        ) : filteredToggles.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-[var(--text-secondary)]">No toggles found.</p>
            <button
              type="button"
              onClick={openCreateModal}
              className="mt-3 text-sm font-semibold text-[var(--accent)] hover:underline"
            >
              Create your first toggle {'->'}
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
                {filteredToggles.map((toggle, i) => (
                  <tr
                    key={toggle.id}
                    className={`transition-colors hover:bg-[var(--surface-muted)] ${i < filteredToggles.length - 1 ? 'border-b border-[var(--surface-border-soft)]' : ''}`}
                  >
                    <td className="px-6 py-3.5 font-semibold text-[var(--text-primary)]">{toggle.applicationName}</td>
                    <td className="px-6 py-3.5 font-mono text-xs text-[var(--text-secondary)]">{toggle.key}</td>
                    <td className="px-6 py-3.5">
                      {toggle.tenantId ? (
                        <span className="inline-flex rounded-full border border-[var(--surface-border)] bg-[var(--tenant-chip-bg)] px-2.5 py-1 text-xs font-medium text-[var(--tenant-chip-text)]">
                          {tenantNameById.get(toggle.tenantId) ?? toggle.tenantId}
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
                          {toggle.isEnabled ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEvaluate(toggle)}
                          className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-muted)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-elevated)]"
                        >
                          Evaluate
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(toggle)}
                          className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-muted)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-elevated)]"
                        >
                          Edit Group
                        </button>
                        <button
                          type="button"
                          onClick={() => openDeleteModal(toggle)}
                          className="rounded-lg border border-[var(--danger-text)]/30 bg-[var(--danger-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--danger-text)] transition hover:brightness-95"
                        >
                          Delete
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

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowCreateModal(false)}
          />
          <div className="relative w-full max-w-lg rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-base)] p-6 shadow-[var(--panel-shadow)]">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">New Toggle</h3>
                <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
                  Select zero, one or many tenants. No tenant means global.
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

              <div className="block text-sm font-medium text-[var(--text-secondary)]">
                Tenants
                <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">Selected: {newTenantIds.length}</p>
                <div className="mt-1.5 max-h-40 overflow-y-auto rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] p-2">
                  {isLoadingTenants ? (
                    <p className="px-2 py-1 text-xs text-[var(--text-tertiary)]">Loading tenants...</p>
                  ) : tenants.length === 0 ? (
                    <p className="px-2 py-1 text-xs text-[var(--text-tertiary)]">No tenants registered yet.</p>
                  ) : (
                    tenants.map((tenant) => {
                      const selected = newTenantIds.includes(tenant.id)
                      return (
                        <label key={tenant.id} className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 transition hover:bg-[var(--surface-base)]">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => setNewTenantIds((previous) => toggleSelection(previous, tenant.id))}
                            className="mt-0.5 h-4 w-4 rounded border-[var(--surface-border)] accent-[var(--accent)]"
                          />
                          <span className="flex-1">
                            <span className="block text-sm font-semibold text-[var(--text-primary)]">{tenant.name}</span>
                            <span className="font-mono text-[11px] text-[var(--text-tertiary)]">{tenant.id}</span>
                          </span>
                        </label>
                      )
                    })
                  )}
                </div>
              </div>

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

      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditTarget(null)} />
          <div className="relative w-full max-w-lg rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-base)] p-6 shadow-[var(--panel-shadow)]">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">Edit Toggle Group</h3>
                <p className="mt-0.5 text-sm text-[var(--text-secondary)]">Update application, key, enabled flag and tenant set.</p>
              </div>
              <button type="button" onClick={() => setEditTarget(null)} className="rounded-lg p-1 text-[var(--text-tertiary)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]">
                <CloseIcon />
              </button>
            </div>
            <div className="space-y-4">
              <label className="block text-sm font-medium text-[var(--text-secondary)]">
                Application <span className="text-[var(--danger-text)]">*</span>
                <div className="relative mt-1.5">
                  <select
                    className="w-full appearance-none rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] py-2.5 pl-3 pr-8 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
                    value={editApplicationId}
                    onChange={(e) => setEditApplicationId(e.target.value)}
                  >
                    {applications.map((app) => (
                      <option key={app.id} value={app.id}>{app.name}</option>
                    ))}
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
                  value={editKey}
                  onChange={(e) => setEditKey(e.target.value)}
                />
              </label>

              <div className="block text-sm font-medium text-[var(--text-secondary)]">
                Tenants
                <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">Selected: {editTenantIds.length}. Empty = global.</p>
                <div className="mt-1.5 max-h-40 overflow-y-auto rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] p-2">
                  {isLoadingTenants ? (
                    <p className="px-2 py-1 text-xs text-[var(--text-tertiary)]">Loading tenants...</p>
                  ) : tenants.length === 0 ? (
                    <p className="px-2 py-1 text-xs text-[var(--text-tertiary)]">No tenants registered yet.</p>
                  ) : (
                    tenants.map((tenant) => {
                      const selected = editTenantIds.includes(tenant.id)
                      return (
                        <label key={tenant.id} className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 transition hover:bg-[var(--surface-base)]">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => setEditTenantIds((previous) => toggleSelection(previous, tenant.id))}
                            className="mt-0.5 h-4 w-4 rounded border-[var(--surface-border)] accent-[var(--accent)]"
                          />
                          <span className="flex-1">
                            <span className="block text-sm font-semibold text-[var(--text-primary)]">{tenant.name}</span>
                            <span className="font-mono text-[11px] text-[var(--text-tertiary)]">{tenant.id}</span>
                          </span>
                        </label>
                      )
                    })
                  )}
                </div>
              </div>

              <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm font-medium text-[var(--text-secondary)]">
                <input
                  type="checkbox"
                  checked={editEnabled}
                  onChange={(e) => setEditEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-[var(--surface-border)] accent-[var(--accent)]"
                />
                Enabled for all selected targets
              </label>

              {editGroupHasMixedStates && (
                <p className="text-xs text-[var(--text-secondary)]">
                  This group currently has mixed enabled states. Saving here applies one state to the entire group.
                </p>
              )}
              {editError && <p className="text-xs text-[var(--danger-text)]">{editError}</p>}

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setEditTarget(null)} className="rounded-lg border border-[var(--surface-border)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-muted)]">Cancel</button>
                <button type="button" onClick={handleEdit} disabled={isEditSaving || !editKey.trim()} className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-contrast)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50">
                  {isEditSaving ? 'Saving…' : 'Save Group'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="relative w-full max-w-sm rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-base)] p-6 shadow-[var(--panel-shadow)]">
            <h3 className="text-base font-bold text-[var(--text-primary)]">Delete Toggle</h3>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Are you sure you want to delete toggle <span className="font-mono font-semibold text-[var(--text-primary)]">{deleteTarget.key}</span>? This action cannot be undone.
            </p>
            {deleteError && <p className="mt-3 text-xs text-[var(--danger-text)]">{deleteError}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setDeleteTarget(null)} className="rounded-lg border border-[var(--surface-border)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-muted)]">Cancel</button>
              <button type="button" onClick={handleDelete} disabled={isDeleting} className="rounded-lg bg-[var(--danger-text)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-90 disabled:cursor-not-allowed disabled:opacity-50">
                {isDeleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
