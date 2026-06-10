import { memo, useMemo } from 'react';
import type { Project } from '../types';
import { Calendar, Trash2, Clock } from 'lucide-react';
import { darkenColor } from '../utils/colors';

interface ProjectGridProps {
  projects: Project[];
  onSelect: (projectId: string) => void;
  onDelete: (projectId: string) => void;
}

function ProjectGrid({ projects, onSelect, onDelete }: ProjectGridProps) {
  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => b.createdAt - a.createdAt);
  }, [projects]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getDaysRemaining = (deadline: number) => {
    const now = Date.now();
    const diff = deadline - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  };

  if (projects.length === 0) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: 60,
        color: '#718096'
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🎨</div>
        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: '#4a5568' }}>还没有项目</div>
        <div style={{ fontSize: 14 }}>点击左侧"新建项目"按钮开始创建你的第一个创意项目</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 32, height: '100%', overflow: 'auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#2d3748', marginBottom: 4 }}>我的项目</h1>
        <p style={{ fontSize: 14, color: '#718096' }}>共 {projects.length} 个项目</p>
      </div>

      <div
        style={{
          columnCount: 3,
          columnGap: 20,
          '@media (max-width: 1024px)': { columnCount: 2 },
          '@media (max-width: 768px)': { columnCount: 1 }
        } as React.CSSProperties}
      >
        {sortedProjects.map(project => (
          <div
            key={project.id}
            onClick={() => onSelect(project.id)}
            style={{
              display: 'inline-block',
              width: '100%',
              marginBottom: 20,
              breakInside: 'avoid',
              background: project.color,
              borderRadius: 8,
              padding: 20,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              transform: 'translateY(0)',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-6px)';
              e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.12)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
            }}
          >
            <button
              onClick={e => {
                e.stopPropagation();
                if (confirm('确定要删除这个项目吗？')) {
                  onDelete(project.id);
                }
              }}
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                background: 'rgba(255,255,255,0.6)',
                border: 'none',
                borderRadius: 4,
                padding: 6,
                cursor: 'pointer',
                opacity: 0,
                transition: 'opacity 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#718096'
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }}
            >
              <Trash2 size={14} />
            </button>

            <h3 style={{
              fontSize: 18,
              fontWeight: 700,
              color: darkenColor(project.color, 0.6),
              marginBottom: 8,
              paddingRight: 30
            }}>
              {project.name}
            </h3>

            {project.description && (
              <p style={{
                fontSize: 13,
                color: darkenColor(project.color, 0.45),
                lineHeight: 1.5,
                marginBottom: 16
              }}>
                {project.description}
              </p>
            )}

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              fontSize: 12,
              color: darkenColor(project.color, 0.35),
              paddingTop: 12,
              borderTop: `1px solid ${darkenColor(project.color, 0.1)}`
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Calendar size={12} />
                {formatDate(project.createdAt)}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={12} />
                {getDaysRemaining(project.deadline) > 0
                  ? `还剩 ${getDaysRemaining(project.deadline)} 天`
                  : `已过期 ${Math.abs(getDaysRemaining(project.deadline))} 天`}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default memo(ProjectGrid);
