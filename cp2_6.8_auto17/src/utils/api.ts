export interface PollOption {
  id: string
  text: string
  votes: number
}

export interface Poll {
  id: string
  code: string
  title: string
  options: PollOption[]
  deadline: string
  createdAt: string
  isExpired?: boolean
  totalVotes?: number
}

export interface CreatePollRequest {
  title: string
  options: string[]
  deadline: string
}

const API_BASE = '/api'

export async function createPoll(data: CreatePollRequest): Promise<Poll> {
  const response = await fetch(`${API_BASE}/poll`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || '创建投票失败')
  }

  return response.json()
}

export async function getPoll(code: string): Promise<Poll> {
  const response = await fetch(`${API_BASE}/poll/${code}`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || '获取投票信息失败')
  }

  return response.json()
}

export async function votePoll(code: string, optionId: string): Promise<{ success: boolean; options: PollOption[]; totalVotes: number }> {
  const response = await fetch(`${API_BASE}/poll/${code}/vote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ optionId }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || '投票失败')
  }

  return response.json()
}
