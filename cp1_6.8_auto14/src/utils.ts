import { format, differenceInDays, formatISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { ApplicationStatus } from './types';

export const statusConfig: Record<ApplicationStatus, { label: string; color: string; bgColor: string }> = {
  applied: { label: '已投递', color: '#1976d2', bgColor: 'rgba(25, 118, 210, 0.1)' },
  interviewing: { label: '面试中', color: '#2e7d32', bgColor: 'rgba(46, 125, 50, 0.1)' },
  rejected: { label: '已拒绝', color: '#c62828', bgColor: 'rgba(198, 40, 40, 0.1)' },
  offer: { label: '已offer', color: '#f9a825', bgColor: 'rgba(249, 168, 37, 0.1)' },
};

export const statusColors = {
  applied: '#1976d2',
  interviewing: '#2e7d32',
  rejected: '#c62828',
  offer: '#f9a825',
};

export function formatDate(dateStr: string): string {
  return format(new Date(dateStr), 'yyyy年MM月dd日', { locale: zhCN });
}

export function formatMonth(dateStr: string): string {
  return format(new Date(dateStr), 'yyyy年MM月', { locale: zhCN });
}

export function daysSinceApply(applyDate: string): number {
  return differenceInDays(new Date(), new Date(applyDate));
}

export function getTodayDateString(): string {
  return formatISO(new Date(), { representation: 'date' });
}

export function debounce<T extends (...args: any[]) => void>(fn: T, delay: number): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
