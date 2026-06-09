import { v4 as uuidv4 } from 'uuid';

const AVATAR_COLORS = [
  '#667eea', '#764ba2', '#f093fb', '#f5576c',
  '#4facfe', '#00f2fe', '#43e97b', '#38f9d7',
  '#fa709a', '#fee140', '#30cfd0', '#667eea'
];

export function generateId(): string {
  return uuidv4();
}

export function generateAvatar(nickname: string): { letter: string; color: string } {
  const letter = nickname.charAt(0).toUpperCase();
  const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
  return { letter, color };
}

export function generateShortHash(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let hash = '';
  for (let i = 0; i < 5; i++) {
    hash += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return hash;
}

export function sanitizeString(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
