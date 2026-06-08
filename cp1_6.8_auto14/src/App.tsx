import { useState, useEffect, useCallback } from 'react';
import Dashboard from './components/Dashboard';
import { applicationApi } from './api';
import type { Application, FilterType, ViewMode } from './types';

export default function App() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('board');
  const [editingApp, setEditingApp] = useState<Application | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await applicationApi.getAll(filter === 'all' ? undefined : filter);
      setApplications(data);
    } catch (error) {
      console.error('Failed to fetch applications:', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const handleAdd = () => {
    setEditingApp(null);
    setIsModalOpen(true);
  };

  const handleEdit = (app: Application) => {
    setEditingApp(app);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    setDeletingIds(prev => new Set(prev).add(id));
    setTimeout(async () => {
      try {
        await applicationApi.remove(id);
        setApplications(prev => prev.filter(app => app.id !== id));
      } catch (error) {
        console.error('Failed to delete application:', error);
      } finally {
        setDeletingIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    }, 300);
  };

  const handleSave = async (data: Omit<Application, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (editingApp) {
        const updated = await applicationApi.update(editingApp.id, data);
        setApplications(prev => prev.map(app => app.id === editingApp.id ? updated : app));
      } else {
        const newApp = await applicationApi.create(data);
        setApplications(prev => [newApp, ...prev]);
      }
      setIsModalOpen(false);
      setEditingApp(null);
    } catch (error) {
      console.error('Failed to save application:', error);
    }
  };

  const handleNotesUpdate = async (id: string, notes: string) => {
    try {
      await applicationApi.update(id, { notes });
      setApplications(prev => prev.map(app => app.id === id ? { ...app, notes } : app));
    } catch (error) {
      console.error('Failed to update notes:', error);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1 className="header-title">📋 简历投递追踪看板</h1>
          <div className="header-actions">
            <button className="btn btn-primary" onClick={handleAdd}>
              + 添加投递
            </button>
          </div>
        </div>
      </header>
      <main className="main-content">
        <Dashboard
          applications={applications}
          filter={filter}
          setFilter={setFilter}
          viewMode={viewMode}
          setViewMode={setViewMode}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onNotesUpdate={handleNotesUpdate}
          isModalOpen={isModalOpen}
          setIsModalOpen={setIsModalOpen}
          editingApp={editingApp}
          onSave={handleSave}
          deletingIds={deletingIds}
          loading={loading}
        />
      </main>
    </div>
  );
}
