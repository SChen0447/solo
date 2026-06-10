import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useProjects } from './hooks/useProjects';
import { Timeline } from './components/Timeline';
import { DetailPanel } from './components/DetailPanel';
import { Project, ViewMode } from './types';

function App() {
  const { projects, loading, likes, toggleLike } = useProjects();
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('3d');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setViewMode('2d');
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleSelectProject = (project: Project | null) => {
    setSelectedProject(project);
  };

  const handleToggleView = () => {
    setSelectedProject(null);
    setViewMode(prev => (prev === '3d' ? '2d' : '3d'));
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <motion.div
          className="loading-spinner"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
      </div>
    );
  }

  const currentLike = selectedProject ? likes[selectedProject.id] || 0 : 0;
  const isCurrentLiked = currentLike > 0;

  return (
    <div className="app-container">
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="header-title">
          <div>DEV TIMELINE</div>
          <div className="header-subtitle">个人项目作品集 · 3D交互式展示</div>
        </div>
      </motion.header>

      {!isMobile && (
        <motion.div
          className="top-bar"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <motion.button
            className="mode-toggle"
            onClick={handleToggleView}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {viewMode === '3d' ? '🔲 切换至2D网格' : '🎡 切换至3D螺旋'}
          </motion.button>
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {projects.length > 0 && (
          <Timeline
            key={viewMode}
            projects={projects}
            selectedProject={selectedProject}
            viewMode={viewMode}
            likes={likes}
            onSelect={handleSelectProject}
            onLike={toggleLike}
          />
        )}
      </AnimatePresence>

      <DetailPanel
        project={selectedProject}
        liked={isCurrentLiked}
        likeCount={currentLike}
        onClose={() => handleSelectProject(null)}
        onLike={toggleLike}
      />
    </div>
  );
}

export default App;
