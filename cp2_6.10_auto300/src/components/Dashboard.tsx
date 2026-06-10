import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { Plus, Clock, TrendingUp, Film } from 'lucide-react';
import { api } from '@/utils/api';
import type { ProjectSummary } from '@/types';

function ProgressRing({ progress, size = 64 }: { progress: number; size?: number }) {
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg width={size} height={size} className="progress-ring">
      <circle
        stroke="#EDE7DD"
        fill="transparent"
        strokeWidth={stroke}
        r={radius}
        cx={size / 2}
        cy={size / 2}
      />
      <circle
        stroke="var(--accent-color)"
        fill="transparent"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        r={radius}
        cx={size / 2}
        cy={size / 2}
        style={{
          transform: 'rotate(-90deg)',
          transformOrigin: '50% 50%',
          transition: 'stroke-dashoffset 500ms ease-out',
        }}
      />
      <text
        x={size / 2}
        y={size / 2 + 5}
        textAnchor="middle"
        fontSize={size < 50 ? 12 : 16}
        fontWeight={900}
        fill="var(--text-primary)"
        fontFamily="var(--font-display)"
      >
        {progress}%
      </text>
    </svg>
  );
}

function ProjectCard({ project, index }: { project: ProjectSummary; index: number }) {
  const navigate = useNavigate();

  return (
    <Draggable draggableId={project.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => navigate(`/project/${project.id}`)}
          style={{
            ...provided.draggableProps.style,
            background: 'var(--card-bg)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            boxShadow: snapshot.isDragging ? 'var(--shadow-lg)' : 'var(--shadow-sm)',
            cursor: 'pointer',
            transition: snapshot.isDragging ? 'none' : 'var(--transition-normal)',
            transform: snapshot.isDragging ? provided.draggableProps.style?.transform as string : 'translateY(0)',
          }}
          onMouseEnter={(e) => {
            if (!snapshot.isDragging) {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
            }
          }}
          onMouseLeave={(e) => {
            if (!snapshot.isDragging) {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
            }
          }}
        >
          <div style={{ position: 'relative', paddingTop: '130%', overflow: 'hidden' }}>
            <img
              src={project.cover}
              alt={project.title}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
              loading="lazy"
            />
            <div
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                background: 'rgba(255,255,255,0.95)',
                borderRadius: '50%',
                padding: 2,
                backdropFilter: 'blur(4px)',
              }}
            >
              <ProgressRing progress={project.progress} size={56} />
            </div>
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                background: 'linear-gradient(to top, rgba(44,44,44,0.85), transparent)',
                padding: '40px 16px 16px',
              }}
            >
              <h3
                style={{
                  color: 'white',
                  fontSize: 20,
                  textShadow: '0 2px 8px rgba(0,0,0,0.5)',
                }}
              >
                {project.title}
              </h3>
            </div>
          </div>
          <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: 13 }}>
              <Clock size={14} />
              <span>更新于 {new Date(project.updatedAt).toLocaleDateString('zh-CN')}</span>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}

export default function Dashboard() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await api.getProjects();
      setProjects(data);
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(projects);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    const reordered = items.map((p, i) => ({ ...p, order: i }));
    setProjects(reordered);
    reordered.forEach((p) => api.updateProject(p.id, { order: p.order }));
  };

  const totalProgress = projects.length > 0
    ? Math.round(projects.reduce((acc, p) => acc + p.progress, 0) / projects.length)
    : 0;

  return (
    <div className="single-column">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginBottom: 32,
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <h1 style={{ fontSize: 48, marginBottom: 8, letterSpacing: 2 }}>创作仪表盘</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 16 }}>
            管理你的漫画宇宙，追踪每一个项目的进度
          </p>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <div
            style={{
              background: 'var(--card-bg)',
              padding: '16px 24px',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div style={{ width: 48, height: 48, background: '#FFF0F0', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Film size={24} style={{ color: 'var(--accent-color)' }} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>项目总数</div>
              <div style={{ fontSize: 28, fontWeight: 900, fontFamily: 'var(--font-display)' }}>{projects.length}</div>
            </div>
          </div>
          <div
            style={{
              background: 'var(--card-bg)',
              padding: '16px 24px',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div style={{ width: 48, height: 48, background: '#F0FFF0', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={24} style={{ color: '#4CAF50' }} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>平均进度</div>
              <div style={{ fontSize: 28, fontWeight: 900, fontFamily: 'var(--font-display)' }}>{totalProgress}%</div>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: 24, marginBottom: 16 }}>加载中...</div>
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="projects">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                  gap: 24,
                }}
              >
                {projects.map((project, index) => (
                  <ProjectCard key={project.id} project={project} index={index} />
                ))}
                {provided.placeholder}
                <Link
                  to="/"
                  onClick={(e) => {
                    e.preventDefault();
                    const title = prompt('新项目名称：');
                    if (title) {
                      api.createProject({ title }).then((p) => {
                        loadProjects();
                      });
                    }
                  }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 320,
                    background: 'var(--card-bg)',
                    borderRadius: 'var(--radius-lg)',
                    border: '3px dashed var(--border-color)',
                    color: 'var(--text-secondary)',
                    transition: 'var(--transition-normal)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent-color)';
                    e.currentTarget.style.color = 'var(--accent-color)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }}
                >
                  <Plus size={48} style={{ marginBottom: 12 }} />
                  <span style={{ fontSize: 18, fontWeight: 600 }}>新建项目</span>
                </Link>
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}
    </div>
  );
}
