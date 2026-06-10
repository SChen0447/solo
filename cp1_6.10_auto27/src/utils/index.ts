import { v4 as uuidv4 } from 'uuid';
import type { Toast } from '@/types';

export const generateId = (): string => uuidv4();

export const generateActivityCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export const formatTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatDateTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const createToast = (message: string, type: Toast['type'] = 'success'): Toast => ({
  id: generateId(),
  message,
  type
});

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

export const playDingSound = (): void => {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.value = 880;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.15);
  } catch (e) {
    console.error('Failed to play sound:', e);
  }
};

export const randomGender = (): 'male' | 'female' => (Math.random() > 0.5 ? 'male' : 'female');

export const getDefaultAvatar = (name: string): string => {
  const initial = name.charAt(0).toUpperCase();
  const colors = ['3a86ff', '9d4edd', 'e94560', '10b981', 'f59e0b', '06b6d4'];
  const color = colors[name.charCodeAt(0) % colors.length];
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initial)}&background=${color}&color=fff&size=128&bold=true`;
};

export const getHourFromTimestamp = (timestamp: number): number => {
  return new Date(timestamp).getHours();
};

export const interpolateColor = (ratio: number): string => {
  const clamped = Math.max(0, Math.min(1, ratio));
  const r = Math.round(58 + (233 - 58) * clamped);
  const g = Math.round(134 + (69 - 134) * clamped);
  const b = Math.round(255 + (96 - 255) * clamped);
  return `rgb(${r}, ${g}, ${b})`;
};

export const animateNumber = (
  target: number,
  duration: number,
  callback: (value: number) => void
): void => {
  const start = performance.now();
  const step = (currentTime: number) => {
    const elapsed = currentTime - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    callback(Math.round(target * eased));
    if (progress < 1) {
      requestAnimationFrame(step);
    }
  };
  requestAnimationFrame(step);
};
