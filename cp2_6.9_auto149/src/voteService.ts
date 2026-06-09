export interface VoteOption {
  text: string;
  count: number;
}

export interface VoteDetail {
  id: string;
  title: string;
  options: VoteOption[];
  createdAt: number;
  durationHours: number;
  status: 'active' | 'closed';
  totalVotes: number;
}

export interface VoteListItem {
  id: string;
  title: string;
  createdAt: number;
  status: 'active' | 'closed';
  totalVotes: number;
}

export interface VoteListResponse {
  items: VoteListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateVoteRequest {
  title: string;
  options: string[];
  durationHours: number;
}

export interface CreateVoteResponse {
  id: string;
}

const API_BASE = '/api';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: '请求失败' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export function createVote(data: CreateVoteRequest): Promise<CreateVoteResponse> {
  return fetch(`${API_BASE}/vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(handleResponse<CreateVoteResponse>);
}

export function getVote(id: string): Promise<VoteDetail> {
  return fetch(`${API_BASE}/vote/${id}`, {
    method: 'GET',
  }).then(handleResponse<VoteDetail>);
}

export function submitVote(id: string, optionIndex: number): Promise<VoteDetail> {
  return fetch(`${API_BASE}/vote/${id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ optionIndex }),
  }).then(handleResponse<VoteDetail>);
}

export function getVotes(
  page: number = 1,
  pageSize: number = 10,
  filter: 'all' | 'active' | 'closed' = 'all'
): Promise<VoteListResponse> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    filter,
  });
  return fetch(`${API_BASE}/votes?${params.toString()}`, {
    method: 'GET',
  }).then(handleResponse<VoteListResponse>);
}
