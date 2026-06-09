import React from 'react';
import type { Project } from '../types';
import { useAppContext } from '../context/AppContext';

interface ProgressRingProps {
  progress: number;
  color: string;
  size?: number;
  strokeWidth?: number;
}

const ProgressRing: React.FC<ProgressRingProps> = ({ progress, color, size = 48, strokeWidth = 5 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(0,0,0,0.08)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        style={{
          transform: 'rotate(90deg)',
          transformOrigin: 'center',
          fontSize: 12,
          fontWeight: 700,
          fill: '#1E1E2E'
        }}
      >
        {Math.round(progress)}%
      </text>
    </svg>
  );
};

interface ProjectCardProps {
  project: Project;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
  const { navigateTo } = useAppContext();
  const stats = project.stats || { total: 0, completed: 0, inprogress: 0, todo: 0 };
  const progress = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;

  return (
    <div
      onClick={() => navigateTo('kanban', project.id)}
      style={{
        width: 320,
        height: 200,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        border: '4px solid #E0E0E0',
        padding: 20,
        cursor: 'pointer',
        position: 'relative',
        transition: 'border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        userSelect: 'none'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = project.color;
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#E0E0E0';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={{
        position: 'absolute',
        top: 16,
        right: 16
      }}>
        <ProgressRing progress={progress} color={project.color} />
      </div>

      <div style={{ paddingRight: 60 }}>
        <div style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          backgroundColor: project.color,
          marginBottom: 10
        }} />
        <h3 style={{
          fontSize: 16,
          fontWeight: 700,
          color: '#1E1E2E',
          lineHeight: 1.4,
          marginBottom: 8,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical'
        }}>
          {project.name}
        </h3>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 12,
          color: '#666'
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <span>{project.client}</span>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 12,
          color: '#666'
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <span>截止: {project.deadline}</span>
        </div>
        <div style={{
          display: 'flex',
          gap: 12,
          marginTop: 4
        }}>
          <span style={{
            fontSize: 11,
            color: '#888',
            padding: '2px 8px',
            backgroundColor: '#FFEBEE',
            borderRadius: 4
          }}>
            待办 {stats.todo}
          </span>
          <span style={{
            fontSize: 11,
            color: '#888',
            padding: '2px 8px',
            backgroundColor: '#FFF8E1',
            borderRadius: 4
          }}>
            进行中 {stats.inprogress}
          </span>
          <span style={{
            fontSize: 11,
            color: '#888',
            padding: '2px 8px',
            backgroundColor: '#E8F5E9',
            borderRadius: 4
          }}>
            已完成 {stats.completed}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ProjectCard;
