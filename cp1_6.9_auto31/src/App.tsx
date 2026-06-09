import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Editor from './pages/Editor';
import UserMenu from './components/UserMenu';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
};

const Navbar: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const showNav = user && location.pathname !== '/login' && location.pathname !== '/register';

  if (!showNav) return null;

  return (
    <nav className="navbar">
      <div className="navbar-brand" onClick={() => navigate('/dashboard')}>
        📔 数字手账
      </div>
      <div className="navbar-right">
        <UserMenu />
      </div>
    </nav>
  );
};

const Toast: React.FC<{ message: string; type: 'success' | 'error'; onClose: () => void }> = ({ message, type, onClose }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 2000);
    return () => clearTimeout(t);
  }, [onClose]);

  return <div className={`toast ${type}`}>{message}</div>;
};

export const useToast = () => {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  };

  const ToastComponent = toast ? <Toast {...toast} onClose={() => setToast(null)} /> : null;

  return { showToast, ToastComponent };
};

const App: React.FC = () => {
  return (
    <div className="page">
      <Navbar />
      <ToastWrapper />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/edit/:date" element={<ProtectedRoute><Editor /></ProtectedRoute>} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </div>
  );
};

export const ToastContext = React.createContext<{ showToast: (msg: string, type?: 'success' | 'error') => void }>({ showToast: () => {} });

const ToastWrapper: React.FC = () => {
  const { ToastComponent, showToast } = useToast();
  const ctx = React.useContext(ToastContext);
  return (
    <ToastContext.Provider value={{ showToast }}>
      {ToastComponent}
    </ToastContext.Provider>
  );
};

export const useAppToast = () => React.useContext(ToastContext);

export default App;
