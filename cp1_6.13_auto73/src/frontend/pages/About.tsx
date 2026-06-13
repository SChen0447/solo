import { useEffect, useState } from 'react';
import { profileApi } from '../api';
import type { Profile } from '../types';
import './About.css';

export default function About() {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    profileApi.getProfile()
      .then(data => setProfile(data))
      .catch(err => console.error('Failed to load profile:', err));
  }, []);

  return (
    <div className="about-page page-transition">
      <div className="about-container glass-card">
        <div className="about-header">
          <div className="about-avatar">
            {profile?.coverImage ? (
              <img src={profile.coverImage} alt="头像" />
            ) : (
              <div className="avatar-placeholder">🎵</div>
            )}
          </div>
          <h1>{profile?.name || '独立音乐人'}</h1>
          <p className="about-signature">{profile?.signature || ''}</p>
        </div>

        <div className="about-content">
          <section className="about-section">
            <h2>关于我</h2>
            <p>{profile?.bio || '加载中...'}</p>
          </section>

          <section className="about-section">
            <h2>音乐风格</h2>
            <div className="style-tags">
              <span className="tag style-tag">流行</span>
              <span className="tag style-tag">电子</span>
              <span className="tag style-tag">轻音乐</span>
              <span className="tag style-tag">民谣</span>
            </div>
          </section>

          <section className="about-section">
            <h2>联系方式</h2>
            <div className="contact-info">
              <div className="contact-item">
                <span className="contact-icon">📧</span>
                <span>musician@example.com</span>
              </div>
              <div className="contact-item">
                <span className="contact-icon">🐦</span>
                <span>@musician_official</span>
              </div>
              <div className="contact-item">
                <span className="contact-icon">📷</span>
                <span>@musician_daily</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
