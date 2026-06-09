import { useState, useEffect, useCallback } from 'react';
import Board from './Board';
import Sidebar from './Sidebar';
import type { Note, Project } from './types';

const API_BASE = '/api';

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string>('default');
  const [notes, setNotes] = useState<Note[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sortByLikes, setSortByLikes] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/projects`);
      const data = await res.json();
      setProjects(data);
    } catch (e) {
      console.error('Failed to fetch projects:', e);
    }
  }, []);

  const fetchNotes = useCallback(async (projectId: string) => {
    try {
      const res = await fetch(`${API_BASE}/projects/${projectId}/notes`);
      const data = await res.json();
      setNotes(data);
    } catch (e) {
      console.error('Failed to fetch notes:', e);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      await fetchProjects();
      await fetchNotes(currentProjectId);
      setLoading(false);
    };
    init();
  }, [fetchProjects, fetchNotes, currentProjectId]);

  const createProject = async (name: string) => {
    try {
      const res = await fetch(`${API_BASE}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const project = await res.json();
      setProjects(prev => [...prev, project]);
      setCurrentProjectId(project.id);
    } catch (e) {
      console.error('Failed to create project:', e);
    }
  };

  const createNote = async (x: number, y: number) => {
    try {
      const res = await fetch(`${API_BASE}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: currentProjectId,
          content: '',
          x,
          y,
          width: 200,
          height: 200,
        }),
      });
      const note = await res.json();
      setNotes(prev => [...prev, note]);
      return note;
    } catch (e) {
      console.error('Failed to create note:', e);
    }
  };

  const updateNote = async (id: string, updates: Partial<Note>) => {
    try {
      const res = await fetch(`${API_BASE}/notes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const note = await res.json();
      setNotes(prev => prev.map(n => (n.id === id ? note : n)));
    } catch (e) {
      console.error('Failed to update note:', e);
    }
  };

  const likeNote = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/notes/${id}/like`, {
        method: 'PUT',
      });
      const note = await res.json();
      setNotes(prev => prev.map(n => (n.id === id ? note : n)));
    } catch (e) {
      console.error('Failed to like note:', e);
    }
  };

  const addComment = async (noteId: string, content: string) => {
    try {
      const res = await fetch(`${API_BASE}/notes/${noteId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const note = await res.json();
      setNotes(prev => prev.map(n => (n.id === noteId ? note : n)));
    } catch (e) {
      console.error('Failed to add comment:', e);
    }
  };

  const sortedNotes = sortByLikes
    ? [...notes].sort((a, b) => b.likes - a.likes)
    : notes;

  if (loading) {
    return (
      <div className="app-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#fff', fontSize: 18 }}>加载中...</div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Board
        notes={notes}
        onCreateNote={createNote}
        onUpdateNote={updateNote}
        onLikeNote={likeNote}
        onAddComment={addComment}
      />
      <Sidebar
        projects={projects}
        currentProjectId={currentProjectId}
        notes={sortedNotes}
        collapsed={sidebarCollapsed}
        sortByLikes={sortByLikes}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        onSelectProject={setCurrentProjectId}
        onCreateProject={createProject}
        onToggleSort={() => setSortByLikes(!sortByLikes)}
      />
    </div>
  );
}
