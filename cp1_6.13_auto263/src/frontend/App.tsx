import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import type { Painting } from '@/types';
import { fetchPaintings } from '@/api/paintings';
import Navbar from '@/components/Navbar';
import BackToTop from '@/components/BackToTop';
import GalleryView from '@/GalleryView';
import PaintingDetail from '@/components/PaintingDetail';
import { useAuthStore } from '@/store/useAuthStore';

function App() {
  const [, setPaintings] = useState<Painting[]>([]);
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    fetchPaintings()
      .then((data) => setPaintings(data))
      .catch((err) => console.error('加载画作失败:', err));
  }, []);

  return (
    <div className="app-container">
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<GalleryView />} />
          <Route path="/painting/:id" element={<PaintingDetail />} />
          <Route
            path="/favorites"
            element={isAuthenticated ? <GalleryView /> : <Navigate to="/" replace />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <BackToTop />
    </div>
  );
}

export default App;
