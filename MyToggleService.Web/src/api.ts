import type {
  Application,
  CreateApplicationRequest,
  CreateToggleRequest,
  EvaluateToggleResponse,
  Toggle,
  User,
} from './types'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: 'include', // Include cookies (auth_token)
    headers: {
      'Content-Type': 'application/json',
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

// Authentication
export async function getMe(): Promise<User | null> {
  try {
    return await request<User>('/auth/me')
  } catch (error) {
    // User not authenticated
    return null
  }
}

export async function logout(): Promise<void> {
  try {
    await request('/auth/logout', {
      method: 'POST',
    })
  } catch (error) {
    console.error('Logout error:', error)
  }
  
  // Redirect to login after logout
  window.location.href = '/login'
}

// Applications
export async function listApplications(): Promise<Application[]> {
  return request<Application[]>('/api/applications')
}

export async function createApplication(payload: CreateApplicationRequest): Promise<Application> {
  return request<Application>('/api/applications', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function deleteApplication(id: string): Promise<void> {
  await request(`/api/applications/${id}`, {
    method: 'DELETE',
  })
}

// Toggles
export async function listToggles(applicationId?: string): Promise<Toggle[]> {
  const query = applicationId
    ? `/api/toggles?applicationId=${encodeURIComponent(applicationId)}&includeGlobal=true`
    : '/api/toggles?includeGlobal=true'

  return request<Toggle[]>(query)
}

export async function createToggle(payload: CreateToggleRequest): Promise<void> {
  await request('/api/toggles', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateToggle(
  id: string,
  payload: CreateToggleRequest,
): Promise<void> {
  await request(`/api/toggles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function deleteToggle(id: string): Promise<void> {
  await request(`/api/toggles/${id}`, {
    method: 'DELETE',
  })
}

export async function setToggleEnabled(id: string, isEnabled: boolean): Promise<void> {
  await request(`/api/toggles/${id}/enabled`, {
    method: 'PATCH',
    body: JSON.stringify({ isEnabled }),
  })
}

// Evaluation
export async function evaluateToggle(
  applicationId: string,
  key: string,
  tenantId: string | null,
): Promise<EvaluateToggleResponse> {
  const params = new URLSearchParams({ applicationId, key })
  if (tenantId) {
    params.set('tenantId', tenantId)
  }

  return request<EvaluateToggleResponse>(`/api/evaluate/single?${params.toString()}`)
}
