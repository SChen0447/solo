const BASE_URL = '/api'

function getUserId(): string | null {
  const stored = localStorage.getItem('user')
  if (!stored) return null
  try {
    return JSON.parse(stored).id
  } catch {
    return null
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const userId = getUserId()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (userId) {
    headers['x-user-id'] = userId
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || '请求失败')
  }
  return data as T
}

export const api = {
  register: (email: string, password: string) =>
    request<{ id: string; email: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  login: (email: string, password: string) =>
    request<{ id: string; email: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  me: () =>
    request<{ id: string; email: string }>('/auth/me'),

  createLetter: (data: {
    content: string
    envelopeColor: string
    stamp: string
    season: string
    openDate: string
  }) =>
    request('/letters', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getLetters: () =>
    request<Array<{
      id: string
      content: string | null
      envelopeColor: string
      stamp: string
      season: string
      openDate: string
      isOpened: boolean
      isArrived: boolean
    }>>('/letters'),

  getLetter: (id: string) =>
    request<{
      id: string
      content: string
      envelopeColor: string
      stamp: string
      season: string
      openDate: string
    }>(`/letters/${id}`),
}
