import { useEffect, useMemo, useState } from 'react'
import { createToggle, listApplications } from '../../api'
import type { Application } from '../../types'

export default function CreateTogglePage() {
  const [applications, setApplications] = useState<Application[]>([])
  const [newApplicationId, setNewApplicationId] = useState('')
  const [newKey, setNewKey] = useState('billing.new-checkout')
  const [newTenants, setNewTenants] = useState('')
  const [newEnabled, setNewEnabled] = useState(false)
  const [isLoadingApplications, setIsLoadingApplications] = useState(true)
  const [status, setStatus] = useState('Loading applications...')

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

  useEffect(() => {
    ;(async () => {
      try {
        await loadApplications()
        setStatus('Ready to create toggle')
      } catch (error) {
        setStatus(`Failed to initialize: ${(error as Error).message}`)
      }
    })()
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
        applicationId: newApplicationId,
        isEnabled: newEnabled,
        tenantIds: tenantIds.length === 0 ? null : tenantIds,
      })
      setStatus('Toggle created successfully.')
      setNewTenants('')
      setNewKey('billing.new-checkout')
      setNewEnabled(false)
    } catch (error) {
      setStatus(`Failed to create toggle: ${(error as Error).message}`)
    }
  }

  return (
    <section className="grid gap-6">
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
    </section>
  )
}

export default function CreateTogglePage() {
  const [applications, setApplications] = useState<Application[]>([])
  const [newApplicationId, setNewApplicationId] = useState('')
  const [newKey, setNewKey] = useState('billing.new-checkout')
  const [newTenants, setNewTenants] = useState('')
  const [newEnabled, setNewEnabled] = useState(false)
  const [newApplicationName, setNewApplicationName] = useState('')
  const [newApplicationDescription, setNewApplicationDescription] = useState('')
  const [isLoadingApplications, setIsLoadingApplications] = useState(true)
  const [isCreatingApplication, setIsCreatingApplication] = useState(false)
  const [status, setStatus] = useState('Loading applications...')

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

  useEffect(() => {
    ;(async () => {
      try {
        await loadApplications()
        setStatus('Ready to create toggle')
      } catch (error) {
        setStatus(`Failed to initialize: ${(error as Error).message}`)
      }
    })()
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
        applicationId: newApplicationId,
        isEnabled: newEnabled,
        tenantIds: tenantIds.length === 0 ? null : tenantIds,
      })
      setStatus('Toggle created successfully.')
      setNewTenants('')
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
