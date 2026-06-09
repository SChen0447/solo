import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import ProjectCard from '../components/ProjectCard';
import NewProjectModal from '../components/NewProjectModal';

const ProjectsPage: React.FC = () => {
  const { projects } = useAppContext();
  const [showModal, setShowModal] = useState(false);

  const sortedProjects = [...projects].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div style={{
      backgroundColor: 'var(--bg-secondary)',
      minHeight: 'calc(100vh - 56px)',
      padding: '32px 40px',
      position: 'relative'
    }}>
      <div style={{
        maxWidth: 1400,
        margin: '0 auto'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 32
        }}>
          <div>
            <h1 style={{
              fontSize: 28,
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginBottom: 6
            }}>
              项目看板
            </h1>
            <p style={{
              fontSize: 14,
              color: 'var(--text-secondary)'
            }}>
              共 {projects.length} 个项目，点击卡片进入详情
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 14,
              padding: '12px 20px'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            新建项目
          </button>
        </div>

        {sortedProjects.length > 0 ? (
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 24,
            justifyContent: 'flex-start'
          }}>
            {sortedProjects.map(project => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '80px 40px',
            color: 'var(--text-secondary)'
          }}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: 20, opacity: 0.5 }}>
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="3" y1="9" x2="21" y2="9"></line>
              <line x1="9" y1="21" x2="9" y2="9"></line>
            </svg>
            <h3 style={{ fontSize: 18, marginBottom: 8, color: 'var(--text-primary)' }}>暂无项目</h3>
            <p style={{ fontSize: 14, marginBottom: 24 }}>点击上方按钮创建您的第一个项目</p>
            <button onClick={() => setShowModal(true)} className="btn-primary">
              + 新建项目
            </button>
          </div>
        )}
      </div>

      {showModal && <NewProjectModal onClose={() => setShowModal(false)} />}
    </div>
  );
};

export default ProjectsPage;
