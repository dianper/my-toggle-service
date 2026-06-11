import { useEffect, useState } from 'react'
import { createTenant, deleteTenant, listTenants, updateTenant } from '../../api'
import type { Tenant } from '../../types'

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

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [tenantId, setTenantId] = useState('')
  const [name, setName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const [editTarget, setEditTarget] = useState<Tenant | null>(null)
  const [editName, setEditName] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editError, setEditError] = useState('')

  const [deleteTarget, setDeleteTarget] = useState<Tenant | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  async function load() {
    setIsLoading(true)
    try {
      const data = await listTenants()
      setTenants(data)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  function openCreateModal() {
    setTenantId('')
    setName('')
    setError('')
    setShowCreateModal(true)
  }

  async function handleCreate() {
    const trimmedId = tenantId.trim()
    const trimmed = name.trim()
    if (!trimmedId || !trimmed) return

    setIsSaving(true)
    setError('')
    try {
      const created = await createTenant({ id: trimmedId, name: trimmed })
      setTenants((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
      setShowCreateModal(false)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsSaving(false)
    }
  }

  function openEditModal(tenant: Tenant) {
    setEditTarget(tenant)
    setEditName(tenant.name)
    setEditError('')
  }

  async function handleEdit() {
    if (!editTarget || !editName.trim()) return

    setIsEditing(true)
    setEditError('')
    try {
      const updated = await updateTenant(editTarget.id, { name: editName.trim() })
      setTenants((prev) => prev.map((item) => (item.id === updated.id ? updated : item)).sort((a, b) => a.name.localeCompare(b.name)))
      setEditTarget(null)
    } catch (err) {
      setEditError((err as Error).message)
    } finally {
      setIsEditing(false)
    }
  }

  function openDeleteModal(tenant: Tenant) {
    setDeleteTarget(tenant)
    setDeleteError('')
  }

  async function handleDelete() {
    if (!deleteTarget) return

    setIsDeleting(true)
    setDeleteError('')
    try {
      await deleteTenant(deleteTarget.id)
      setTenants((prev) => prev.filter((item) => item.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err) {
      setDeleteError((err as Error).message)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">Tenants</h2>
          <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
            {isLoading ? 'Loading…' : `${tenants.length} registered tenant${tenants.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3.5 py-2 text-sm font-semibold text-[var(--accent-contrast)] transition hover:brightness-110"
        >
          <PlusIcon />
          New Tenant
        </button>
      </div>

      <div className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-base)] shadow-[var(--card-shadow)]">
        {isLoading ? (
          <div className="px-6 py-12 text-center text-sm text-[var(--text-secondary)]">Loading…</div>
        ) : tenants.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-[var(--text-secondary)]">No tenants registered yet.</p>
            <button
              type="button"
              onClick={openCreateModal}
              className="mt-3 text-sm font-semibold text-[var(--accent)] hover:underline"
            >
              Create your first tenant →
            </button>
          </div>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--surface-border)] text-left text-xs uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
                <th className="px-6 py-3 font-semibold">Name</th>
                <th className="px-6 py-3 font-semibold">ID</th>
                <th className="px-6 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((tenant, i) => (
                <tr
                  key={tenant.id}
                  className={`transition-colors hover:bg-[var(--surface-muted)] ${i < tenants.length - 1 ? 'border-b border-[var(--surface-border-soft)]' : ''}`}
                >
                  <td className="px-6 py-3.5 font-semibold text-[var(--text-primary)]">{tenant.name}</td>
                  <td className="px-6 py-3.5 font-mono text-xs text-[var(--text-tertiary)]">{tenant.id}</td>
                  <td className="px-6 py-3.5">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(tenant)}
                        className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-muted)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-elevated)]"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => openDeleteModal(tenant)}
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
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-base)] p-6 shadow-[var(--panel-shadow)]">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">New Tenant</h3>
                <p className="mt-0.5 text-sm text-[var(--text-secondary)]">Register a tenant for toggle targeting.</p>
              </div>
              <button type="button" onClick={() => setShowCreateModal(false)} className="rounded-lg p-1 text-[var(--text-tertiary)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]">
                <CloseIcon />
              </button>
            </div>
            <div className="space-y-4">
              <label className="block text-sm font-medium text-[var(--text-secondary)]">
                Tenant ID <span className="text-[var(--danger-text)]">*</span>
                <input
                  autoFocus
                  className="mt-1.5 w-full rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
                  value={tenantId}
                  onChange={(e) => setTenantId(e.target.value)}
                  placeholder="00000000-0000-0000-0000-000000000000"
                />
              </label>
              <label className="block text-sm font-medium text-[var(--text-secondary)]">
                Name <span className="text-[var(--danger-text)]">*</span>
                <input
                  className="mt-1.5 w-full rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  placeholder="tenant-acme"
                />
              </label>
              {error && <p className="text-xs text-[var(--danger-text)]">{error}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setShowCreateModal(false)} className="rounded-lg border border-[var(--surface-border)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-muted)]">Cancel</button>
                <button type="button" onClick={handleCreate} disabled={isSaving || !tenantId.trim() || !name.trim()} className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-contrast)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50">
                  {isSaving ? 'Creating…' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditTarget(null)} />
          <div className="relative w-full max-w-md rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-base)] p-6 shadow-[var(--panel-shadow)]">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">Edit Tenant</h3>
                <p className="mt-0.5 text-sm text-[var(--text-secondary)]">Update tenant name.</p>
              </div>
              <button type="button" onClick={() => setEditTarget(null)} className="rounded-lg p-1 text-[var(--text-tertiary)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]">
                <CloseIcon />
              </button>
            </div>
            <div className="space-y-4">
              <label className="block text-sm font-medium text-[var(--text-secondary)]">
                Name <span className="text-[var(--danger-text)]">*</span>
                <input
                  autoFocus
                  className="mt-1.5 w-full rounded-xl border border-[var(--surface-border)] bg-[var(--surface-muted)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleEdit()}
                />
              </label>
              {editError && <p className="text-xs text-[var(--danger-text)]">{editError}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setEditTarget(null)} className="rounded-lg border border-[var(--surface-border)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-muted)]">Cancel</button>
                <button type="button" onClick={handleEdit} disabled={isEditing || !editName.trim()} className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-contrast)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50">
                  {isEditing ? 'Saving…' : 'Save'}
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
            <h3 className="text-base font-bold text-[var(--text-primary)]">Delete Tenant</h3>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Are you sure you want to delete tenant <span className="font-semibold text-[var(--text-primary)]">{deleteTarget.name}</span>? This action cannot be undone.
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
