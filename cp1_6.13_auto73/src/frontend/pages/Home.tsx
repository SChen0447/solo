import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { profileApi, worksApi } from '../api';
import type { Profile, Work } from '../types';
import './Home.css';

interface HomeProps {
  currentWorkId: string | null;
  isPlaying: boolean;
  onPlay: (work: Work) => void;
  onTogglePlay: () => void;
}

export default function Home({ currentWorkId, isPlaying, onPlay, onTogglePlay }: HomeProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [works, setWorks] = useState<Work[]>([]);
  const worksRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      profileApi.getProfile(),
      worksApi.getWorks()
    ]).then(([profileData, worksData]) => {
      setProfile(profileData);
      setWorks(worksData);
    }).catch(err => console.error('Failed to load data:', err));
  }, []);

  const handlePlayClick = () => {
    if (works.length > 0) {
      if (currentWorkId === works[0].id) {
        onTogglePlay();
      } else {
        onPlay(works[0]);
      }
      setTimeout(() => {
        worksRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleWorkClick = (workId: string) => {
    navigate(`/works/${workId}`);
  };

  return (
    <div className="home page-transition">
      <section className="hero-section">
        <div className="play-button-container">
          <button
            className="play-btn main-play-btn"
            onClick={handlePlayClick}
            aria-label={isPlaying ? '暂停' : '播放'}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
        </div>
        
        <div className="profile-card glass-card">
          <div className="profile-cover">
            {profile?.coverImage ? (
              <img src={profile.coverImage} alt="封面" />
            ) : (
              <div className="cover-placeholder">
                <span>🎵</span>
              </div>
            )}
          </div>
          <div className="profile-info">
            <h1 className="profile-name">{profile?.name || '加载中...'}</h1>
            <p className="profile-signature">{profile?.signature || ''}</p>
            <p className="profile-bio">{profile?.bio || ''}</p>
          </div>
        </div>
      </section>

      <section className="works-section" ref={worksRef}>
        <div className="section-header">
          <h2>最新作品</h2>
          <button className="view-all-btn" onClick={() => navigate('/works')}>
            查看全部 →
          </button>
        </div>
        
        <div className="works-grid">
          {works.map(work => (
            <div
              key={work.id}
              className={`work-card glass-card ${currentWorkId === work.id ? 'playing' : ''}`}
              onClick={() => handleWorkClick(work.id)}
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
                  <span className="play-icon-small">
                    {currentWorkId === work.id && isPlaying ? '⏸' : '▶'}
                  </span>
                </div>
              </div>
              <div className="work-info">
                <h3 className="work-title">{work.title}</h3>
                <div className="work-meta">
                  <span className="work-duration">⏱ {formatDuration(work.duration)}</span>
                  <span className="work-plays">▶ {work.plays}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
