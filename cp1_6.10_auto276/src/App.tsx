import { useState, useCallback } from 'react';
import { useStorage } from './hooks/useStorage';
import { v4 as uuidv4 } from 'uuid';
import { SOFT_COLORS, FRAGMENT_COLORS, GRID_SIZE } from './constants';
import { getRandomColor } from './utils/colors';
import type { View, Project, InspirationFragment, Task, FragmentConnection, Priority, TaskStatus, AppData } from './types';
import ProjectGrid from './components/ProjectGrid';
import ProjectEditor from './components/ProjectEditor';
import CreativeMap from './components/CreativeMap';
import { LayoutGrid, Map, Plus, X } from 'lucide-react';

export default function App() {
  const { data, loaded, saveData } = useStorage();
  const [view, setView] = useState<View>('projects');
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '', deadline: '' });

  const navigateToProjects = useCallback(() => {
    setView('projects');
    setActiveProjectId(null);
  }, []);

  const navigateToEditor = useCallback((projectId: string) => {
    setActiveProjectId(projectId);
    setView('editor');
  }, []);

  const navigateToMap = useCallback(() => {
    setView('map');
    setActiveProjectId(null);
  }, []);

  const createProject = useCallback(() => {
    if (!newProject.name.trim()) return;
    const project: Project = {
      id: uuidv4(),
      name: newProject.name.trim(),
      description: newProject.description.trim(),
      color: getRandomColor(SOFT_COLORS),
      createdAt: Date.now(),
      deadline: newProject.deadline ? new Date(newProject.deadline).getTime() : Date.now() + 7 * 24 * 60 * 60 * 1000
    };
    saveData({ ...data, projects: [...data.projects, project] });
    setNewProject({ name: '', description: '', deadline: '' });
    setShowCreateModal(false);
  }, [data, newProject, saveData]);

  const deleteProject = useCallback((projectId: string) => {
    saveData({
      projects: data.projects.filter(p => p.id !== projectId),
      fragments: data.fragments.filter(f => f.projectId !== projectId),
      tasks: data.tasks.filter(t => t.projectId !== projectId),
      connections: data.connections.filter(c => {
        const fragA = data.fragments.find(f => f.id === c.fragmentAId);
        const fragB = data.fragments.find(f => f.id === c.fragmentBId);
        return fragA?.projectId !== projectId && fragB?.projectId !== projectId;
      })
    });
  }, [data, saveData]);

  const addFragment = useCallback((projectId: string) => {
    const fragment: InspirationFragment = {
      id: uuidv4(),
      projectId,
      text: '新灵感',
      imagePath: '',
      color: getRandomColor(FRAGMENT_COLORS),
      x: 100 + Math.random() * 400,
      y: 100 + Math.random() * 300
    };
    saveData({ ...data, fragments: [...data.fragments, fragment] });
  }, [data, saveData]);

  const updateFragment = useCallback((fragmentId: string, updates: Partial<InspirationFragment>) => {
    saveData({
      ...data,
      fragments: data.fragments.map(f => f.id === fragmentId ? { ...f, ...updates } : f)
    });
  }, [data, saveData]);

  const deleteFragment = useCallback((fragmentId: string) => {
    saveData({
      ...data,
      fragments: data.fragments.filter(f => f.id !== fragmentId),
      tasks: data.tasks.map(t => t.fragmentId === fragmentId ? { ...t, fragmentId: null } : t),
      connections: data.connections.filter(c => c.fragmentAId !== fragmentId && c.fragmentBId !== fragmentId)
    });
  }, [data, saveData]);

  const addTask = useCallback((projectId: string) => {
    const task: Task = {
      id: uuidv4(),
      projectId,
      fragmentId: null,
      name: '新任务',
      priority: 'medium',
      status: 'todo'
    };
    saveData({ ...data, tasks: [...data.tasks, task] });
  }, [data, saveData]);

  const updateTask = useCallback((taskId: string, updates: Partial<Task>) => {
    saveData({
      ...data,
      tasks: data.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t)
    });
  }, [data, saveData]);

  const deleteTask = useCallback((taskId: string) => {
    saveData({ ...data, tasks: data.tasks.filter(t => t.id !== taskId) });
  }, [data, saveData]);

  const addConnection = useCallback((fragmentAId: string, fragmentBId: string) => {
    const exists = data.connections.some(
      c => (c.fragmentAId === fragmentAId && c.fragmentBId === fragmentBId) ||
           (c.fragmentAId === fragmentBId && c.fragmentBId === fragmentAId)
    );
    if (exists || fragmentAId === fragmentBId) return;
    const connection: FragmentConnection = {
      id: uuidv4(),
      fragmentAId,
      fragmentBId,
      relevance: 3
    };
    saveData({ ...data, connections: [...data.connections, connection] });
  }, [data, saveData]);

  if (!loaded) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f7f7f7' }}>
        <div style={{ fontSize: 18, color: '#718096' }}>加载中...</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', overflow: 'hidden' }}>
      <nav style={sidebarStyle}>
        <div style={{ padding: 24, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Creative Studio</div>
          <div style={{ fontSize: 12, color: '#a0aec0' }}>插画师创意管理</div>
        </div>

        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <NavButton
            active={view === 'projects'}
            icon={<LayoutGrid size={18} />}
            label="项目列表"
            onClick={navigateToProjects}
          />
          <NavButton
            active={view === 'map'}
            icon={<Map size={18} />}
            label="创意图谱"
            onClick={navigateToMap}
          />
        </div>

        {view === 'projects' && (
          <div style={{ padding: 12, marginTop: 'auto' }}>
            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: '#4299e1',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#3182ce')}
              onMouseLeave={e => (e.currentTarget.style.background = '#4299e1')}
            >
              <Plus size={18} />
              新建项目
            </button>
          </div>
        )}
      </nav>

      <main style={{ flex: 1, overflow: 'auto', minWidth: 768 }}>
        {view === 'projects' && (
          <ProjectGrid
            projects={data.projects}
            onSelect={navigateToEditor}
            onDelete={deleteProject}
          />
        )}
        {view === 'editor' && activeProjectId && (
          <ProjectEditor
            project={data.projects.find(p => p.id === activeProjectId)!}
            fragments={data.fragments.filter(f => f.projectId === activeProjectId)}
            tasks={data.tasks.filter(t => t.projectId === activeProjectId)}
            connections={data.connections.filter(c => {
              const fragA = data.fragments.find(f => f.id === c.fragmentAId);
              const fragB = data.fragments.find(f => f.id === c.fragmentBId);
              return fragA?.projectId === activeProjectId && fragB?.projectId === activeProjectId;
            })}
            allFragments={data.fragments}
            onBack={navigateToProjects}
            onAddFragment={() => addFragment(activeProjectId)}
            onUpdateFragment={updateFragment}
            onDeleteFragment={deleteFragment}
            onAddTask={() => addTask(activeProjectId)}
            onUpdateTask={updateTask}
            onDeleteTask={deleteTask}
            onAddConnection={addConnection}
          />
        )}
        {view === 'map' && (
          <CreativeMap
            projects={data.projects}
            fragments={data.fragments}
            tasks={data.tasks}
            connections={data.connections}
            onSelectProject={navigateToEditor}
          />
        )}
      </main>

      {showCreateModal && (
        <div style={modalOverlayStyle} onClick={() => setShowCreateModal(false)}>
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#2d3748' }}>新建项目</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 4, color: '#718096' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>项目名称 *</label>
                <input
                  type="text"
                  value={newProject.name}
                  onChange={e => setNewProject({ ...newProject, name: e.target.value })}
                  placeholder="输入项目名称..."
                  style={inputStyle}
                  autoFocus
                />
              </div>
              <div>
                <label style={labelStyle}>一句话描述</label>
                <input
                  type="text"
                  value={newProject.description}
                  onChange={e => setNewProject({ ...newProject, description: e.target.value })}
                  placeholder="简要描述这个项目..."
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>截止日期</label>
                <input
                  type="date"
                  value={newProject.deadline}
                  onChange={e => setNewProject({ ...newProject, deadline: e.target.value })}
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ ...buttonStyle, background: '#edf2f7', color: '#4a5568' }}
              >
                取消
              </button>
              <button
                onClick={createProject}
                disabled={!newProject.name.trim()}
                style={{ ...buttonStyle, background: newProject.name.trim() ? '#4299e1' : '#a0aec0', cursor: newProject.name.trim() ? 'pointer' : 'not-allowed' }}
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NavButton({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        background: active ? 'rgba(66, 153, 225, 0.2)' : 'transparent',
        color: active ? '#fff' : '#cbd5e0',
        border: 'none',
        borderRadius: 6,
        fontSize: 14,
        fontWeight: 500,
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.2s ease'
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    >
      {icon}
      {label}
    </button>
  );
}

const sidebarStyle: React.CSSProperties = {
  width: 220,
  minWidth: 220,
  height: '100%',
  background: '#2d3748',
  display: 'flex',
  flexDirection: 'column',
  '@media (max-width: 1024px)': {
    width: '100%',
    height: 60,
    flexDirection: 'row',
    alignItems: 'center'
  } as any
};

const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000
};

const modalStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: 8,
  padding: 32,
  width: 480,
  maxWidth: '90%',
  boxShadow: '0 20px 50px rgba(0,0,0,0.2)'
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  color: '#4a5568',
  marginBottom: 8
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  border: '1px solid #e2e8f0',
  borderRadius: 6,
  fontSize: 14,
  color: '#2d3748',
  outline: 'none',
  transition: 'border-color 0.2s ease',
  fontFamily: 'inherit'
};

const buttonStyle: React.CSSProperties = {
  padding: '10px 20px',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  fontFamily: 'inherit'
};
