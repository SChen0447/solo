import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { BookOpen, Plus, User } from 'lucide-react';
import Dashboard from './components/Dashboard';
import ProjectDetail from './components/ProjectDetail';

function App() {
  const navigate = useNavigate();

  return (
    <div className="app-layout">
      <nav className="main-nav">
        <Link to="/" className="nav-logo">
          <div className="nav-logo-icon">
            <BookOpen size={24} />
          </div>
          <span className="nav-logo-text">漫画编辑部</span>
        </Link>
        <div className="nav-actions">
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '10px 20px',
              background: 'var(--accent-color)',
              color: 'white',
              borderRadius: 'var(--radius-lg)',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'var(--transition-normal)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--accent-color)')}
          >
            <Plus size={18} />
            新建项目
          </button>
          <div className="nav-user">
            <User size={16} />
            <span>主编大人</span>
          </div>
        </div>
      </nav>
      <div className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/project/:id" element={<ProjectDetail />} />
          <Route path="/project/:id/stats" element={<ProjectDetail activeTab="stats" />} />
          <Route path="/project/:id/logs" element={<ProjectDetail activeTab="logs" />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
