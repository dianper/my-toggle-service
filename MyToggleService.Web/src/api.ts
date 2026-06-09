import type {
  CreateToggleRequest,
  EvaluateToggleResponse,
  Toggle,
} from './types'

let authToken = ''

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: authToken ? `Bearer ${authToken}` : '',
      ...(init?.headers ?? {}),
    },
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `Request failed: ${response.status}`)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

export async function getDevToken(subject = 'web-admin'): Promise<string> {
  const payload = await request<{ token: string }>(`/api/auth/dev-token?subject=${encodeURIComponent(subject)}`, {
    method: 'POST',
  })

  authToken = payload.token
  return authToken
}

export async function listToggles(application?: string): Promise<Toggle[]> {
  const query = application
    ? `/api/toggles?application=${encodeURIComponent(application)}&includeGlobal=true`
    : '/api/toggles?includeGlobal=true'

  return request<Toggle[]>(query)
}

export async function createToggle(payload: CreateToggleRequest): Promise<void> {
  await request('/api/toggles', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function setToggleEnabled(id: string, isEnabled: boolean): Promise<void> {
  await request(`/api/toggles/${id}/enabled`, {
    method: 'PATCH',
    body: JSON.stringify({ isEnabled }),
  })
}

export async function evaluateToggle(
  application: string,
  key: string,
  tenantId: string | null,
): Promise<EvaluateToggleResponse> {
  const params = new URLSearchParams({ application, key })
  if (tenantId) {
    params.set('tenantId', tenantId)
  }

  return request<EvaluateToggleResponse>(`/api/evaluate/single?${params.toString()}`)
}
