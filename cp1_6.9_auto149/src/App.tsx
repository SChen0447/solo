import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import DetailPage from './pages/DetailPage';
import UploadPage from './pages/UploadPage';
import CollectionPage from './pages/CollectionPage';
import Navbar from './components/Navbar';
import { User } from './types';

const App: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [displayLocation, setDisplayLocation] = useState(location);
  const [transitionStage, setTransitionStage] = useState('fadeIn');
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('stardust_user');
    if (stored) {
      setUser(JSON.parse(stored));
    }
    setAuthChecked(true);
  }, []);

  useEffect(() => {
    if (!authChecked) return;
    if (!user && location.pathname !== '/login') {
      navigate('/login', { replace: true });
    }
    if (user && location.pathname === '/login') {
      navigate('/', { replace: true });
    }
  }, [user, location, navigate, authChecked]);

  useEffect(() => {
    if (location !== displayLocation) {
      setTransitionStage('fadeOut');
    }
  }, [location, displayLocation]);

  const handleAnimationEnd = () => {
    if (transitionStage === 'fadeOut') {
      setTransitionStage('fadeIn');
      setDisplayLocation(location);
    }
  };

  const handleLogin = (loggedUser: User) => {
    setUser(loggedUser);
    localStorage.setItem('stardust_user', JSON.stringify(loggedUser));
    navigate('/');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('stardust_user');
    navigate('/login');
  };

  const showNavbar = user && displayLocation.pathname !== '/login';

  if (!authChecked) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #120a2a, #0a1630)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#aa88ff',
        fontSize: '18px'
      }}>
        ✦ 正在进入星界...
      </div>
    );
  }

  if (!user && location.pathname !== '/login') {
    return <Navigate to="/login" replace />;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0815' }}>
      {showNavbar && <Navbar user={user!} onLogout={handleLogout} currentPath={displayLocation.pathname} />}
      <div
        style={{
          minHeight: '100vh',
          opacity: transitionStage === 'fadeIn' ? 1 : 0,
          transition: 'opacity 0.3s ease',
          paddingTop: showNavbar ? '80px' : '0'
        }}
        onTransitionEnd={handleAnimationEnd}
      >
        <Routes location={displayLocation}>
          <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
          <Route path="/" element={<HomePage user={user} />} />
          <Route path="/item/:id" element={<DetailPage user={user} />} />
          <Route path="/upload" element={<UploadPage user={user} />} />
          <Route path="/collection" element={<CollectionPage user={user} />} />
        </Routes>
      </div>
    </div>
  );
};

export default App;
