import React, { useState } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import ActivityListPage from './pages/ActivityListPage';
import ActivityDetailPage from './pages/ActivityDetailPage';
import AdminPage from './pages/AdminPage';

const App: React.FC = () => {
  const [newActivityId, setNewActivityId] = useState<string | null>(null);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>悦读读书会</h1>
        <p>在书页间遇见更美好的自己</p>
        <nav className="nav-links">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            活动列表
          </NavLink>
          <NavLink
            to="/admin"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            管理员
          </NavLink>
        </nav>
      </header>

      <main>
        <Routes>
          <Route
            path="/"
            element={
              <ActivityListPage
                newActivityId={newActivityId}
                onClearNewActivity={() => setNewActivityId(null)}
              />
            }
          />
          <Route path="/activity/:id" element={<ActivityDetailPage />} />
          <Route
            path="/admin"
            element={<AdminPage onActivityCreated={(id) => setNewActivityId(id)} />}
          />
        </Routes>
      </main>
    </div>
  );
};

export default App;
