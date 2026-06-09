export type Toggle = {
  id: string
  key: string
  application: string
  tenantId: string | null
  isEnabled: boolean
  createdAt: string
  updatedAt: string
}

export type CreateToggleRequest = {
  key: string
  application: string
  isEnabled: boolean
  tenantIds: string[] | null
}

export type EvaluateToggleResponse = {
  key: string
  application: string
  tenantId: string | null
  isEnabled: boolean
  resolution: string
}
