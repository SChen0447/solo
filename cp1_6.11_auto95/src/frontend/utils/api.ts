import type { User, Capsule, PageContent, Notebook } from '../../shared/types';

const BASE_URL = '/api';

function getAuthHeaders() {
  const userStr = localStorage.getItem('user');
  if (!userStr) return {};
  const user = JSON.parse(userStr);
  return {
    'x-user-id': user.id,
    'x-username': user.username,
    'x-email': user.email
  };
}

export async function register(username: string, email: string, password: string) {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password })
  });
  return res.json();
}

export async function login(email: string, password: string) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return res.json();
}

export async function getCapsules(): Promise<{ success: boolean; capsules: Capsule[] }> {
  const res = await fetch(`${BASE_URL}/capsule/list`, {
    headers: getAuthHeaders()
  });
  return res.json();
}

export async function createCapsule(
  notebookId: string,
  title: string,
  content: PageContent,
  openDate: Date,
  isShared: boolean = false,
  sharedWith: string[] = []
) {
  const res = await fetch(`${BASE_URL}/capsule`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify({
      notebookId,
      title,
      content,
      openDate: openDate.toISOString(),
      isShared,
      sharedWith
    })
  });
  return res.json();
}

export async function openCapsule(capsuleId: string): Promise<{
  success: boolean;
  content: PageContent;
  capsule: Capsule;
  error?: string;
}> {
  const res = await fetch(`${BASE_URL}/capsule/open/${capsuleId}`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  return res.json();
}

export async function getNotebooks(): Promise<{ success: boolean; notebooks: Notebook[] }> {
  const res = await fetch(`${BASE_URL}/notebooks`, {
    headers: getAuthHeaders()
  });
  return res.json();
}

export async function createNotebook(title: string, isShared: boolean = false) {
  const res = await fetch(`${BASE_URL}/notebooks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify({ title, isShared })
  });
  return res.json();
}

export async function inviteCollaborator(notebookId: string, username: string, email: string) {
  const res = await fetch(`${BASE_URL}/collaborators/invite`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify({ notebookId, username, email })
  });
  return res.json();
}
