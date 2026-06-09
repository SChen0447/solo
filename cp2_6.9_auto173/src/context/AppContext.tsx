import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { AppContextType, Project, Task, User, Page, Comment } from '../types';

const AppContext = createContext<AppContextType | null>(null);

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentPage, setCurrentPage] = useState<Page>('projects');
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const loadProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      setProjects(data);
    } catch (e) {
      console.error('Failed to load projects:', e);
    }
  }, []);

  const loadTasks = useCallback(async (projectId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`);
      const data = await res.json();
      setTasks(data);
    } catch (e) {
      console.error('Failed to load tasks:', e);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      setUsers(data);
    } catch (e) {
      console.error('Failed to load users:', e);
    }
  }, []);

  const createProject = useCallback(async (name: string, client: string, deadline: string): Promise<Project | null> => {
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, client, deadline })
      });
      if (!res.ok) return null;
      const data = await res.json();
      setProjects(prev => [...prev, data]);
      return data;
    } catch (e) {
      console.error('Failed to create project:', e);
      return null;
    }
  }, []);

  const updateTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!res.ok) return;
      const updated = await res.json();
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updated } : t));
      if (selectedTask?.id === taskId) {
        setSelectedTask(prev => prev ? { ...prev, ...updated } : null);
      }
    } catch (e) {
      console.error('Failed to update task:', e);
    }
  }, [selectedTask]);

  const createTask = useCallback(async (task: Omit<Task, 'id' | 'status' | 'createdAt'>) => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task)
      });
      if (!res.ok) return;
      const newTask = await res.json();
      setTasks(prev => [...prev, { ...newTask, comments: [] }]);
    } catch (e) {
      console.error('Failed to create task:', e);
    }
  }, []);

  const sendMessage = useCallback(async (projectId: string, sender: string, content: string) => {
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, sender, content })
      });
    } catch (e) {
      console.error('Failed to send message:', e);
    }
  }, []);

  const addComment = useCallback(async (taskId: string, sender: string, content: string) => {
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, sender, content })
      });
      if (!res.ok) return;
      const newComment: Comment = await res.json();
      setTasks(prev => prev.map(t => {
        if (t.id === taskId) {
          return { ...t, comments: [...(t.comments || []), newComment] };
        }
        return t;
      }));
      setSelectedTask(prev => {
        if (prev?.id === taskId) {
          return { ...prev, comments: [...(prev.comments || []), newComment] };
        }
        return prev;
      });
    } catch (e) {
      console.error('Failed to add comment:', e);
    }
  }, []);

  const navigateTo = useCallback((page: Page, projectId?: string) => {
    setCurrentPage(page);
    if (projectId) {
      setCurrentProjectId(projectId);
    }
    if (page !== 'kanban') {
      setCurrentProjectId(null);
      setSelectedTask(null);
    }
  }, []);

  useEffect(() => {
    loadProjects();
    loadUsers();
  }, [loadProjects, loadUsers]);

  const value: AppContextType = {
    projects,
    tasks,
    users,
    currentPage,
    currentProjectId,
    selectedTask,
    loadProjects,
    loadTasks,
    loadUsers,
    createProject,
    updateTask,
    createTask,
    sendMessage,
    addComment,
    navigateTo,
    setSelectedTask
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
