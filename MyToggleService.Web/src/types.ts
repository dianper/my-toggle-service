export type Application = {
  id: string
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
}

export type Toggle = {
  id: string
  key: string
  applicationId: string
  applicationName: string
  tenantId: string | null
  isEnabled: boolean
  createdAt: string
  updatedAt: string
}

export type CreateToggleRequest = {
  key: string
  applicationId: string
  isEnabled: boolean
  tenantIds: string[] | null
}

export type CreateApplicationRequest = {
  name: string
  description: string | null
}

export type EvaluateToggleResponse = {
  key: string
  applicationId: string
  tenantId: string | null
  isEnabled: boolean
  resolution: string
}

export type User = {
  email: string
  displayName: string
}
