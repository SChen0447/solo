import type {
  Project,
  ProjectSummary,
  Scene,
  Chapter,
  Feedback,
  EmotionStats,
  LogEntry,
  Character
} from '@/types';

const API_BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(API_BASE + url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  getProjects: () => request<ProjectSummary[]>('/projects'),
  createProject: (data: { title: string; cover?: string }) =>
    request<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getProject: (id: string) => request<Project>(`/projects/${id}`),
  updateProject: (id: string, data: Partial<Project>) =>
    request<Project>(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  getScenes: (projectId: string) => request<Scene[]>(`/projects/${projectId}/scenes`),
  createScene: (projectId: string, data: Partial<Scene>) =>
    request<Scene>(`/projects/${projectId}/scenes`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateScene: (sceneId: string, data: Partial<Scene>) =>
    request<Scene>(`/scenes/${sceneId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  submitFeedback: (projectId: string, chapterId: string, data: { emotion: string; comment?: string }) =>
    request<Feedback>(`/projects/${projectId}/chapters/${chapterId}/feedback`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getFeedbackStats: (projectId: string, chapterId: string) =>
    request<EmotionStats>(`/projects/${projectId}/chapters/${chapterId}/feedback/stats`),

  getLogs: (projectId: string) => request<LogEntry[]>(`/projects/${projectId}/logs`),
  restoreVersion: (projectId: string, logId: string) =>
    request<Project>(`/projects/${projectId}/restore/${logId}`, {
      method: 'POST',
    }),
};

export const SCENE_STATUS_LABELS: Record<string, string> = {
  draft: '草稿',
  lineart: '线稿',
  coloring: '上色',
  finished: '完稿',
};

export const SCENE_STATUS_COLORS: Record<string, string> = {
  draft: '#9A9A9A',
  lineart: '#4A90D9',
  coloring: '#F5A623',
  finished: '#7ED321',
};

export const EMOTION_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
  excited: { label: '激动', emoji: '🤩', color: '#FF6B6B' },
  touched: { label: '感动', emoji: '🥹', color: '#FF8FAB' },
  suspense: { label: '悬疑', emoji: '🤔', color: '#A78BFA' },
  funny: { label: '搞笑', emoji: '😂', color: '#FFD93D' },
  shocked: { label: '震撼', emoji: '😱', color: '#6BCB77' },
  depressed: { label: '致郁', emoji: '😢', color: '#60A5FA' },
};

export const PLATFORM_CONFIG: Record<string, { label: string; icon: string }> = {
  website: { label: '个人网站', icon: '🌐' },
  weibo: { label: '微博', icon: '📱' },
  pixiv: { label: 'Pixiv', icon: '🎨' },
  twitter: { label: 'Twitter', icon: '🐦' },
};
