import { useEffect, useState } from 'react'
import { createApplication, listApplications } from '../../api'
import type { Application } from '../../types'

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

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setIsLoading(true)
    try {
      const data = await listApplications()
      setApplications(data)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  function openModal() {
    setName('')
    setDescription('')
    setError('')
    setShowModal(true)
  }

  async function handleCreate() {
    const trimmed = name.trim()
    if (!trimmed) return

    setIsSaving(true)
    setError('')
    try {
      const created = await createApplication({ name: trimmed, description: description.trim() || null })
      setApplications((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
      setShowModal(false)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      {/* Page header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">Applications</h2>
          <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
            {isLoading ? 'Loading…' : `${applications.length} registered application${applications.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          type="button"
          onClick={openModal}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3.5 py-2 text-sm font-semibold text-[var(--accent-contrast)] transition hover:brightness-110"
        >
          <PlusIcon />
          New Application
        </button>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-base)] shadow-[var(--card-shadow)]">
        {isLoading ? (
          <div className="px-6 py-12 text-center text-sm text-[var(--text-secondary)]">Loading…</div>
        ) : applications.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-[var(--text-secondary)]">No applications registered yet.</p>
            <button
              type="button"
              onClick={openModal}
              className="mt-3 text-sm font-semibold text-[var(--accent)] hover:underline"
            >
              Register your first application →
            </button>
          </div>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--surface-border)] text-left text-xs uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
                <th className="px-6 py-3 font-semibold">Name</th>
                <th className="px-6 py-3 font-semibold">Description</th>
                <th className="px-6 py-3 font-semibold">ID</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app, i) => (
                <tr
                  key={app.id}
                  className={`transition-colors hover:bg-[var(--surface-muted)] ${i < applications.length - 1 ? 'border-b border-[var(--surface-border-soft)]' : ''}`}
                >
                  <td className="px-6 py-3.5 font-semibold text-[var(--text-primary)]">{app.name}</td>
                  <td className="px-6 py-3.5 text-[var(--text-secondary)]">
                    {app.description ?? <span className="italic text-[var(--text-tertiary)]">—</span>}
                  </td>
                  <td className="px-6 py-3.5 font-mono text-xs text-[var(--text-tertiary)]">{app.id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* New Application Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-base)] p-6 shadow-[var(--panel-shadow)]">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">New Application</h3>
                <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
                  Register a new application to manage its toggles.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1 text-[var(--text-tertiary)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-medium text-[var(--text-secondary)]">
                Name <span className="text-[var(--danger-text)]">*</span>
                <input
                  autoFocus
                  className="mt-1.5 w-full rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  placeholder="service-a"
                />
              </label>
              <label className="block text-sm font-medium text-[var(--text-secondary)]">
                Description
                <input
                  className="mt-1.5 w-full rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  placeholder="Short description (optional)"
                />
              </label>
              {error && <p className="text-xs text-[var(--danger-text)]">{error}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-[var(--surface-border)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-muted)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={isSaving || !name.trim()}
                  className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-contrast)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving ? 'Creating…' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
