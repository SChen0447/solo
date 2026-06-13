import React, { useCallback, useEffect, useState } from 'react';
import AlbumCard from '../components/AlbumCard';
import AlbumModal from '../components/AlbumModal';
import type { AlbumDetail, AlbumListItem, Genre, Sticker } from '../types';
import { CURRENT_USER_ID, fetchAlbum, fetchAlbums, submitGuess } from '../api';
import { useApp } from '../App';
import '../styles/home.scss';

function HomePage(): JSX.Element {
  const [albums, setAlbums] = useState<AlbumListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlbum, setSelectedAlbum] = useState<AlbumDetail | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const { updateScore, addStickers, showConfetti, triggerScoreDelta } = useApp();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await fetchAlbums();
        if (mounted) setAlbums(data);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleCardClick = useCallback(async (album: AlbumListItem) => {
    try {
      const detail = await fetchAlbum(album.id);
      setSelectedAlbum(detail);
      setModalOpen(true);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleSubmit = useCallback(
    async (genre: Genre): Promise<{
      correct: boolean;
      correctGenre: Genre;
      scoreChange: number;
      sticker: Sticker | null;
    }> => {
      if (!selectedAlbum) {
        return { correct: false, correctGenre: '爵士', scoreChange: 0, sticker: null };
      }
      const correct = genre === selectedAlbum.correctGenre;
      const result = await submitGuess(CURRENT_USER_ID, selectedAlbum.id, genre, correct);
      updateScore(result.score);
      triggerScoreDelta(result.scoreChange);
      if (result.sticker) {
        addStickers([result.sticker]);
      }
      if (result.correct) {
        setTimeout(showConfetti, 200);
      }
      return result;
    },
    [selectedAlbum, updateScore, addStickers, triggerScoreDelta, showConfetti]
  );

  const handleClose = () => {
    setModalOpen(false);
    setTimeout(() => setSelectedAlbum(null), 350);
  };

  return (
    <div className="home-page">
      <header className="page-header fade-in-up">
        <div className="page-header__text">
          <p className="breadcrumb">首页 / <span>盲听大厅</span></p>
          <h2 className="page-title">
            <span className="title-icon">🎧</span>
            盲听大厅
          </h2>
          <p className="page-subtitle">
            共 <strong>{albums.length}</strong> 张神秘黑胶唱片待您品鉴 ·
            猜对风格获得积分与专属标签贴纸
          </p>
        </div>
        <div className="page-header__decor" aria-hidden>
          <div className="decor-ring r1" />
          <div className="decor-ring r2" />
          <div className="decor-ring r3" />
        </div>
      </header>

      {loading ? (
        <div className="grid-skeleton">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="skeleton-card fade-in-up" style={{ animationDelay: `${0.04 * i}s` }} />
          ))}
        </div>
      ) : (
        <div className="album-grid">
          {albums.map((album, i) => (
            <AlbumCard
              key={album.id}
              album={album}
              index={i}
              onClick={() => handleCardClick(album)}
            />
          ))}
        </div>
      )}

      <AlbumModal
        album={selectedAlbum}
        open={modalOpen}
        onClose={handleClose}
        onSubmitGuess={handleSubmit}
      />
    </div>
  );
}

export default HomePage;
