import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ExhibitionEdit from './pages/ExhibitionEdit';
import Gallery from './pages/Gallery';
import { ensureVisitorId } from './utils/api';

function App() {
  const init = useAuthStore(s => s.init);
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const location = useLocation();

  useEffect(() => {
    init();
    ensureVisitorId();
  }, [init]);

  const RequireAuth = ({ children }: { children: JSX.Element }) => {
    if (!isAuthenticated) {
      return <Navigate to="/login" state={{ from: location }} replace />;
    }
    return children;
  };

  return (
    <div className="page-fade" key={location.pathname}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={
          <RequireAuth><Dashboard /></RequireAuth>
        } />
        <Route path="/exhibition/:id/edit" element={
          <RequireAuth><ExhibitionEdit /></RequireAuth>
        } />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/gallery/:id" element={<Gallery />} />
        <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </div>
  );
}

export default App;
