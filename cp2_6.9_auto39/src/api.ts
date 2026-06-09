export interface VoteOption {
  text: string;
  votes: number;
}

export interface Vote {
  id: string;
  title: string;
  options: VoteOption[];
  createdAt: number;
  totalVotes: number;
}

export interface CreateVoteResponse {
  id: string;
  editToken: string;
  vote: Vote;
}

const BASE_URL = '/api';

export async function getAllVotes(): Promise<Vote[]> {
  const response = await fetch(`${BASE_URL}/votes`);
  if (!response.ok) throw new Error('获取投票列表失败');
  return response.json();
}

export async function getVote(id: string): Promise<Vote> {
  const response = await fetch(`${BASE_URL}/votes/${id}`);
  if (!response.ok) throw new Error('获取投票失败');
  return response.json();
}

export async function createVote(title: string, options: string[]): Promise<CreateVoteResponse> {
  const response = await fetch(`${BASE_URL}/votes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, options })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: '创建投票失败' }));
    throw new Error(err.error || '创建投票失败');
  }
  return response.json();
}

export async function submitVote(voteId: string, sessionId: string, optionIndex: number): Promise<Vote> {
  const response = await fetch(`${BASE_URL}/votes/${voteId}/vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, optionIndex })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: '投票失败' }));
    throw new Error(err.error || '投票失败');
  }
  return response.json();
}

export async function deleteVote(voteId: string, editToken: string): Promise<boolean> {
  const response = await fetch(`${BASE_URL}/votes/${voteId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ editToken })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: '删除投票失败' }));
    throw new Error(err.error || '删除投票失败');
  }
  return true;
}

export function getSessionId(): string {
  let sid = localStorage.getItem('vote_session_id');
  if (!sid) {
    sid = crypto.randomUUID();
    localStorage.setItem('vote_session_id', sid);
  }
  return sid;
}

export function saveEditToken(voteId: string, token: string): void {
  const tokens = JSON.parse(localStorage.getItem('vote_edit_tokens') || '{}');
  tokens[voteId] = token;
  localStorage.setItem('vote_edit_tokens', JSON.stringify(tokens));
}

export function getEditToken(voteId: string): string | null {
  const tokens = JSON.parse(localStorage.getItem('vote_edit_tokens') || '{}');
  return tokens[voteId] || null;
}

export function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  return `${days}天前`;
}

export const BAR_COLORS = [
  '#6366F1', '#8B5CF6', '#EC4899', '#F43F5E', '#F97316', '#EAB308', '#22C55E', '#06B6D4'
];
