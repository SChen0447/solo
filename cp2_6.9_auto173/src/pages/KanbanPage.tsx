import React, { useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import KanbanBoard from '../components/KanbanBoard';

const KanbanPage: React.FC = () => {
  const { currentProjectId, projects, loadTasks, navigateTo } = useAppContext();
  const project = projects.find(p => p.id === currentProjectId);

  useEffect(() => {
    if (currentProjectId) {
      loadTasks(currentProjectId);
    }
  }, [currentProjectId, loadTasks]);

  if (!project || !currentProjectId) {
    return (
      <div style={{
        backgroundColor: 'var(--bg-secondary)',
        minHeight: 'calc(100vh - 56px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-secondary)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 16, marginBottom: 16 }}>未选择项目</p>
          <button onClick={() => navigateTo('projects')} className="btn-primary">
            返回项目列表
          </button>
        </div>
      </div>
    );
  }

  const stats = project.stats || { total: 0, completed: 0, inprogress: 0, todo: 0 };
  const progress = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  return (
    <div style={{
      backgroundColor: 'var(--bg-secondary)',
      minHeight: 'calc(100vh - 56px)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{
        padding: '24px 32px 0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--border-dark)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={() => navigateTo('projects')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              padding: 6,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 13,
              transition: 'color 0.15s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#64FFDA'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            返回
          </button>
          <div style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            backgroundColor: project.color
          }} />
          <h1 style={{
            fontSize: 22,
            fontWeight: 700,
            color: 'var(--text-primary)'
          }}>
            {project.name}
          </h1>
          <span style={{
            fontSize: 12,
            padding: '3px 10px',
            borderRadius: 6,
            backgroundColor: 'rgba(100, 255, 218, 0.1)',
            color: '#64FFDA'
          }}>
            {progress}% 完成
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 20, fontSize: 13, color: 'var(--text-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            {project.client}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            截止: {project.deadline}
          </div>
        </div>
      </div>

      <KanbanBoard projectId={currentProjectId} />
    </div>
  );
};

export default KanbanPage;
