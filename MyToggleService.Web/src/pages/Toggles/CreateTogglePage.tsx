import { useEffect, useMemo, useState } from 'react'
import { createApplication, createToggle, listApplications, listTenants } from '../../api'
import type { Application, Tenant } from '../../types'

export default function CreateTogglePage() {
  const [applications, setApplications] = useState<Application[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [newApplicationId, setNewApplicationId] = useState('')
  const [newKey, setNewKey] = useState('billing.new-checkout')
  const [selectedTenantIds, setSelectedTenantIds] = useState<string[]>([])
  const [newEnabled, setNewEnabled] = useState(false)
  const [newApplicationName, setNewApplicationName] = useState('')
  const [newApplicationDescription, setNewApplicationDescription] = useState('')
  const [isLoadingApplications, setIsLoadingApplications] = useState(true)
  const [isLoadingTenants, setIsLoadingTenants] = useState(true)
  const [isCreatingApplication, setIsCreatingApplication] = useState(false)
  const [status, setStatus] = useState('Loading data...')

  const canCreate = useMemo(
    () => newApplicationId.trim() !== '' && newKey.trim() !== '',
    [newApplicationId, newKey],
  )

  async function loadApplications() {
    setIsLoadingApplications(true)
    try {
      const data = await listApplications()
      setApplications(data)

      if (data.length > 0) {
        setNewApplicationId((previous) => previous || data[0].id)
      } else {
        setNewApplicationId('')
      }
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
        setStatus('Ready to create toggle')
      } catch (error) {
        setStatus(`Failed to initialize: ${(error as Error).message}`)
      }
    })()
  }, [])

  function toggleTenant(tenantId: string) {
    setSelectedTenantIds((previous) =>
      previous.includes(tenantId)
        ? previous.filter((item) => item !== tenantId)
        : [...previous, tenantId],
    )
  }

  async function handleCreate() {
    if (!canCreate) {
      return
    }

    try {
      await createToggle({
        key: newKey.trim(),
        applicationId: newApplicationId,
        isEnabled: newEnabled,
        tenantIds: selectedTenantIds.length === 0 ? null : selectedTenantIds,
      })
      setStatus('Toggle created successfully.')
      setSelectedTenantIds([])
      setNewKey('billing.new-checkout')
      setNewEnabled(false)
    } catch (error) {
      setStatus(`Failed to create toggle: ${(error as Error).message}`)
    }
  }

  async function handleCreateApplication() {
    const name = newApplicationName.trim()
    if (!name) {
      return
    }

    setIsCreatingApplication(true)
    try {
      const created = await createApplication({
        name,
        description: newApplicationDescription.trim() || null,
      })

      setApplications((previous) => [...previous, created].sort((a, b) => a.name.localeCompare(b.name)))
      setNewApplicationId(created.id)
      setNewApplicationName('')
      setNewApplicationDescription('')
      setStatus(`Application ${created.name} created successfully.`)
    } catch (error) {
      setStatus(`Failed to create application: ${(error as Error).message}`)
    } finally {
      setIsCreatingApplication(false)
    }
  }

  return (
    <section className="grid gap-6 md:grid-cols-2">
      <article className="rounded-[24px] border border-[var(--surface-border)] bg-[var(--surface-base)] p-5 shadow-[var(--card-shadow)] transition-colors md:p-6">
        <h2 className="text-lg font-bold md:text-xl">Create Toggle</h2>
        <div className="mt-4 grid gap-3">
          <label className="text-sm font-medium text-[var(--text-secondary)]">
            Application
            <select
              className="mt-1 w-full rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] px-3 py-2.5 text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
              value={newApplicationId}
              onChange={(event) => setNewApplicationId(event.target.value)}
              disabled={isLoadingApplications || applications.length === 0}
            >
              {applications.length === 0 ? (
                <option value="">No applications available</option>
              ) : (
                applications.map((application) => (
                  <option key={application.id} value={application.id}>
                    {application.name}
                  </option>
                ))
              )}
            </select>
          </label>
          <label className="text-sm font-medium text-[var(--text-secondary)]">
            Key
            <input
              className="mt-1 w-full rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] px-3 py-2.5 text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
              value={newKey}
              onChange={(event) => setNewKey(event.target.value)}
            />
          </label>
          <div className="text-sm font-medium text-[var(--text-secondary)]">
            Tenants
            <p className="mt-1 text-xs text-[var(--text-tertiary)]">Leave empty to create a global toggle.</p>
            <div className="mt-2 max-h-44 overflow-y-auto rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] p-2.5">
              {isLoadingTenants ? (
                <p className="text-xs text-[var(--text-tertiary)]">Loading tenants...</p>
              ) : tenants.length === 0 ? (
                <p className="text-xs text-[var(--text-tertiary)]">No tenants registered yet.</p>
              ) : (
                <div className="space-y-2">
                  {tenants.map((tenant) => {
                    const isSelected = selectedTenantIds.includes(tenant.id)
                    return (
                      <label key={tenant.id} className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 transition hover:bg-[var(--surface-base)]">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleTenant(tenant.id)}
                          className="mt-0.5 h-4 w-4 rounded border-[var(--surface-border)] text-[var(--accent)] focus:ring-[var(--ring)]"
                        />
                        <span className="flex-1">
                          <span className="block text-sm font-semibold text-[var(--text-primary)]">{tenant.name}</span>
                          <span className="font-mono text-[11px] text-[var(--text-tertiary)]">{tenant.id}</span>
                        </span>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
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
            disabled={!canCreate || applications.length === 0 || isLoadingApplications}
            className="rounded-xl bg-[var(--accent)] px-4 py-2.5 font-semibold text-[var(--accent-contrast)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Create
          </button>
          <p className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--text-secondary)]">
            {status}
          </p>
        </div>
      </article>

      <article className="rounded-[24px] border border-[var(--surface-border)] bg-[var(--surface-base)] p-5 shadow-[var(--card-shadow)] transition-colors md:p-6">
        <h2 className="text-lg font-bold md:text-xl">Register Application</h2>
        <div className="mt-4 grid gap-3">
          <label className="text-sm font-medium text-[var(--text-secondary)]">
            Name
            <input
              className="mt-1 w-full rounded-xl border border-[var(--surface-border)] bg-[var(--surface-elevated)] px-3 py-2.5 text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
              value={newApplicationName}
              onChange={(event) => setNewApplicationName(event.target.value)}
              placeholder="service-a"
            />
          </label>
          <label className="text-sm font-medium text-[var(--text-secondary)]">
            Description (optional)
            <input
              className="mt-1 w-full rounded-xl border border-[var(--surface-border)] bg-[var(--surface-elevated)] px-3 py-2.5 text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
              value={newApplicationDescription}
              onChange={(event) => setNewApplicationDescription(event.target.value)}
              placeholder="Short description (optional)"
            />
          </label>
          <button
            type="button"
            onClick={handleCreateApplication}
            disabled={isCreatingApplication || newApplicationName.trim().length === 0}
            className="rounded-xl border border-[var(--surface-border-strong)] bg-[var(--surface-elevated)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-base)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isCreatingApplication ? 'Creating...' : 'Create Application'}
          </button>
        </div>
      </article>
    </section>
  )
}
