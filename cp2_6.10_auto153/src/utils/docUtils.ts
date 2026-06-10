import { v4 as uuidv4 } from 'uuid';

export interface DocVersion {
  version: string;
  content: string;
  timestamp: string;
}

export interface CommentReply {
  id: string;
  author: string;
  content: string;
  timestamp: string;
}

export interface Comment {
  id: string;
  anchorText: string;
  author: string;
  content: string;
  timestamp: string;
  replies: CommentReply[];
}

export function generateTimestamp(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${hh}:${mm}`;
}

export function saveVersionSnapshot(
  content: string,
  history: DocVersion[]
): DocVersion {
  const nextMajor = history.length + 1;
  const version = `v${nextMajor}.0`;
  return {
    version,
    content,
    timestamp: generateTimestamp(),
  };
}

export function generateNextVersion(history: DocVersion[]): string {
  const nextMajor = history.length + 1;
  return `v${nextMajor}.0`;
}

export function exportMarkdown(content: string, filename = 'document.md'): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function generateShareLink(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 6; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `https://docshare.dev/${token}`;
}

export function generateId(): string {
  return uuidv4();
}
