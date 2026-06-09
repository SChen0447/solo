import { useState } from 'react';
import { format } from 'date-fns';
import { ChevronRight, ChevronLeft, Plus, StickyNote, ArrowUpDown } from 'lucide-react';
import type { Note, Project } from './types';

interface SidebarProps {
  projects: Project[];
  currentProjectId: string;
  notes: Note[];
  collapsed: boolean;
  sortByLikes: boolean;
  onToggleCollapse: () => void;
  onSelectProject: (id: string) => void;
  onCreateProject: (name: string) => void;
  onToggleSort: () => void;
}

export default function Sidebar({
  projects,
  currentProjectId,
  notes,
  collapsed,
  sortByLikes,
  onToggleCollapse,
  onSelectProject,
  onCreateProject,
  onToggleSort,
}: SidebarProps) {
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  const handleCreateProject = () => {
    if (newProjectName.trim()) {
      onCreateProject(newProjectName.trim());
      setNewProjectName('');
      setShowNewProject(false);
    }
  };

  return (
    <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <button className="sidebar-toggle" onClick={onToggleCollapse}>
        {collapsed ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
      </button>

      <div className="sidebar-header">
        <div className="sidebar-title">
          <StickyNote size={18} style={{ color: '#FFB74D' }} />
          灵感碰撞板
        </div>

        <select
          className="project-selector"
          value={currentProjectId}
          onChange={(e) => onSelectProject(e.target.value)}
        >
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <div className="project-actions">
          {showNewProject ? (
            <>
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                placeholder="项目名称"
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.08)',
                  color: 'white',
                  outline: 'none',
                  fontSize: 14,
                }}
              />
              <button className="btn-primary" onClick={handleCreateProject}>
                创建
              </button>
            </>
          ) : (
            <button
              className="btn-primary"
              onClick={() => setShowNewProject(true)}
            >
              <Plus size={16} />
              新建项目
            </button>
          )}
        </div>

        <div
          className={`sort-toggle ${sortByLikes ? 'active' : ''}`}
          onClick={onToggleSort}
          style={{ marginTop: 12 }}
        >
          <ArrowUpDown size={16} />
          <span>按点赞数排序</span>
          <label className="switch" style={{ marginLeft: 'auto' }}>
            <input type="checkbox" checked={sortByLikes} onChange={onToggleSort} />
            <span className="slider" />
          </label>
        </div>
      </div>

      <div className="sidebar-content">
        {notes.length === 0 ? (
          <div className="empty-state">
            <StickyNote size={48} />
            <div>暂无便签</div>
            <div style={{ fontSize: 12, marginTop: 6, opacity: 0.7 }}>
              双击画布创建第一张便签
            </div>
          </div>
        ) : (
          <div className="note-list">
            {notes.map(note => (
              <div key={note.id} className="note-thumb">
                <div className="note-thumb-content">
                  {note.content || '（空便签）'}
                </div>
                <div className="note-thumb-meta">
                  <span>{format(note.createdAt, 'MM/dd HH:mm')}</span>
                  <span>👍 {note.likes} · 💬 {note.comments.length}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
