import type { StoryProject } from '@/types';

const STORAGE_KEY = 'storytoon_project';

export const saveProjectToLocal = (project: StoryProject): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
  } catch (e) {
    console.error('Failed to save project to localStorage:', e);
  }
};

export const loadProjectFromLocal = (): StoryProject | null => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data) as StoryProject;
    }
  } catch (e) {
    console.error('Failed to load project from localStorage:', e);
  }
  return null;
};

export const clearProjectFromLocal = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear project from localStorage:', e);
  }
};
