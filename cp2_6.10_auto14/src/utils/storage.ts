import type { MindMapData } from '../types';

const STORAGE_KEY = 'mindmap_data_v1';

export function set(data: MindMapData): void {
  try {
    const json = JSON.stringify(data);
    localStorage.setItem(STORAGE_KEY, json);
  } catch (e) {
    console.error('Failed to save mindmap data to localStorage:', e);
  }
}

export function get(): MindMapData | null {
  try {
    const json = localStorage.getItem(STORAGE_KEY);
    if (!json) return null;
    return JSON.parse(json) as MindMapData;
  } catch (e) {
    console.error('Failed to load mindmap data from localStorage:', e);
    return null;
  }
}

export function clear(): void {
  localStorage.removeItem(STORAGE_KEY);
}
