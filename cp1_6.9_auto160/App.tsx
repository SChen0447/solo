import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import ArchivePage from './pages/ArchivePage';
import CapsuleOpenerPage from './pages/CapsuleOpenerPage';
import CreateCapsuleModal from './components/CreateCapsuleModal';
import { Capsule } from './types';
import { capsuleApi } from './api';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <>{children}</>;
  return <Navigate to="/login" replace />;
}

export default function App() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [capsules, setCapsules] = useState<Capsule[]>([]);
  const [openingCapsule, setOpeningCapsule] = useState<Capsule | null>(null);
  const [newCapsuleAnim, setNewCapsuleAnim] = useState(false);

  const loadCapsules = async () => {
    if (!user) return;
    try {
      const list = await capsuleApi.list(user.id);
      setCapsules(list);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (user) loadCapsules();
  }, [user]);

  const handleCapsuleCreated = () => {
    setNewCapsuleAnim(true);
    setTimeout(() => {
      setShowCreateModal(false);
      setNewCapsuleAnim(false);
      loadCapsules();
    }, 2000);
  };

  const handleOpenCapsule = (capsule: Capsule) => {
    if (!capsule.isOpened) {
      const now = new Date();
      const openAt = new Date(capsule.openAt);
      if (now < openAt) {
        const days = Math.ceil((openAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        alert(`还需等待 ${Math.ceil(days)} 天后才能开启此胶囊`);
        return;
      }
    }
    setOpeningCapsule(capsule);
    navigate(`/capsule/${capsule.id}`);
  };

  const handleCapsuleOpened = () => {
    setOpeningCapsule(null);
    loadCapsules();
  };

  const isLoginPage = location.pathname === '/login';

  return (
    <div className="app">
      {!isLoginPage && user && (
        <Navbar
          onNewCapsule={() => setShowCreateModal(true)}
          capsules={capsules}
          onRefresh={loadCapsules}
          onOpenCapsule={handleOpenCapsule}
        />
      )}

      <main className={!isLoginPage ? 'main-content' : ''}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <ArchivePage
                  capsules={capsules}
                  onOpenCapsule={handleOpenCapsule}
                  onNewCapsule={() => setShowCreateModal(true)}
                  onRefresh={loadCapsules}
                />
              </PrivateRoute>
            }
          />
          <Route
            path="/capsule/:id"
            element={
              <PrivateRoute>
                <CapsuleOpenerPage
              capsule={openingCapsule}
              onOpened={handleCapsuleOpened}
              onBack={() => {
                setOpeningCapsule(null);
                navigate('/');
              }}
            />
              </PrivateRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {showCreateModal && (
        <CreateCapsuleModal
          onClose={() => !newCapsuleAnim && setShowCreateModal(false)}
          onCreated={handleCapsuleCreated}
          isAnimating={newCapsuleAnim}
        />
      )}
    </div>
  );
}
