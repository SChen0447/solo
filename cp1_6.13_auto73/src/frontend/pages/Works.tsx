import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { worksApi } from '../api';
import type { Work } from '../types';
import './Works.css';

interface WorksProps {
  currentWorkId: string | null;
  isPlaying: boolean;
  onPlay: (work: Work) => void;
  onTogglePlay: () => void;
}

export default function Works({ currentWorkId, isPlaying, onPlay, onTogglePlay }: WorksProps) {
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    worksApi.getWorks()
      .then(data => {
        setWorks(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load works:', err);
        setLoading(false);
      });
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleWorkClick = (work: Work) => {
    navigate(`/works/${work.id}`);
  };

  const handlePlayClick = (e: React.MouseEvent, work: Work) => {
    e.stopPropagation();
    if (currentWorkId === work.id) {
      onTogglePlay();
    } else {
      onPlay(work);
    }
  };

  if (loading) {
    return (
      <div className="works-page page-transition">
        <div className="loading">加载中...</div>
      </div>
    );
  }

  return (
    <div className="works-page page-transition">
      <div className="works-header">
        <h1>所有作品</h1>
        <p className="works-count">共 {works.length} 首作品</p>
      </div>
      
      <div className="works-grid">
        {works.map(work => (
          <div
            key={work.id}
            className={`work-card glass-card ${currentWorkId === work.id ? 'playing' : ''}`}
            onClick={() => handleWorkClick(work)}
          >
            <div className="work-cover">
              {work.coverImage ? (
                <img src={work.coverImage} alt={work.title} />
              ) : (
                <div className="work-cover-placeholder">
                  <span>🎧</span>
                </div>
              )}
              <div className="work-play-overlay">
                <button
                  className="play-btn-small"
                  onClick={(e) => handlePlayClick(e, work)}
                  aria-label={currentWorkId === work.id && isPlaying ? '暂停' : '播放'}
                >
                  {currentWorkId === work.id && isPlaying ? '⏸' : '▶'}
                </button>
              </div>
            </div>
            <div className="work-info">
              <h3 className="work-title">{work.title}</h3>
              <div className="work-tags">
                {work.tags.slice(0, 2).map(tag => (
                  <span key={tag} className="tag">{tag}</span>
                ))}
              </div>
              <div className="work-meta">
                <span className="work-duration">⏱ {formatDuration(work.duration)}</span>
                <span className="work-plays">▶ {work.plays}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {works.length === 0 && (
        <div className="empty-state">
          <p>暂无作品</p>
        </div>
      )}
    </div>
  );
}
