import { useState, useEffect, useCallback } from 'react';
import { Project } from '../types';
import projectsData from '../data/projects.json';

interface UseProjectsReturn {
  projects: Project[];
  loading: boolean;
  error: Error | null;
  likes: Record<number, number>;
  toggleLike: (projectId: number) => void;
}

const LIKES_STORAGE_KEY = 'portfolio_project_likes';

const loadLikesFromStorage = (): Record<number, number> => {
  try {
    const stored = localStorage.getItem(LIKES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

const saveLikesToStorage = (likes: Record<number, number>): void => {
  try {
    localStorage.setItem(LIKES_STORAGE_KEY, JSON.stringify(likes));
  } catch {
    console.warn('Failed to save likes to localStorage');
  }
};

export const useProjects = (): UseProjectsReturn => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [likes, setLikes] = useState<Record<number, number>>(() => loadLikesFromStorage());

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        await new Promise(resolve => setTimeout(resolve, 300));
        setProjects(projectsData as Project[]);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load projects'));
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  const toggleLike = useCallback((projectId: number) => {
    setLikes(prev => {
      const newLikes = { ...prev };
      newLikes[projectId] = (newLikes[projectId] || 0) === 0 ? 1 : 0;
      saveLikesToStorage(newLikes);
      return newLikes;
    });
  }, []);

  return { projects, loading, error, likes, toggleLike };
};
