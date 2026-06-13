import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CreateCapsule from './pages/CreateCapsule';
import CapsuleDetail from './pages/CapsuleDetail';
import { isAuthenticated, getAuthUser, clearAuth } from './utils/api';
import { User } from './types';

const App: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated()) {
      setUser(getAuthUser());
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated()) {
      const publicPaths = ['/login', '/register'];
      if (!publicPaths.includes(location.pathname)) {
        navigate('/login');
      }
    } else if (!isLoading && isAuthenticated()) {
      if (location.pathname === '/login' || location.pathname === '/' || location.pathname === '/register') {
        navigate('/dashboard');
      }
    }
  }, [location.pathname, isLoading, navigate]);

  const handleLogout = () => {
    clearAuth();
    setUser(null);
    navigate('/login');
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className={`page-transition ${location.pathname}`}>
      <Routes>
        <Route path="/login" element={<Login onLogin={setUser} />} />
        <Route path="/register" element={<Register onRegister={setUser} />} />
        <Route path="/dashboard" element={<Dashboard user={user} onLogout={handleLogout} />} />
        <Route path="/create" element={<CreateCapsule user={user} onLogout={handleLogout} />} />
        <Route path="/capsule/:id" element={<CapsuleDetail user={user} onLogout={handleLogout} />} />
        <Route path="*" element={<Navigate to={isAuthenticated() ? '/dashboard' : '/login'} replace />} />
      </Routes>
    </div>
  );
};

export default App;
