import React, { useState, useRef, useEffect } from 'react';
import { MOOD_OPTIONS } from '../types';
import { useAuth } from '../AuthContext';
import { capsuleApi, uploadApi, userApi } from '../api';
import { User } from '../types';

interface Props {
  onClose: () => void;
  onCreated: () => void;
  isAnimating: boolean;
}

export default function CreateCapsuleModal({ onClose, onCreated, isAnimating }: Props) {
  const { user } = useAuth();
  const [recipient, setRecipient] = useState('');
  const [userSuggestions, setUserSuggestions] = useState<User[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedMoodIdx, setSelectedMoodIdx] = useState<number | null>(null);
  const [content, setContent] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [openDate, setOpenDate] = useState('');
  const [openTime, setOpenTime] = useState('00:00');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30);
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 1);
    setOpenDate(defaultDate.toISOString().split('T')[0]);

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, []);

  const today = new Date();
  const minDate = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const maxDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const handleRecipientChange = (val: string) => {
    setRecipient(val);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (val.trim().length >= 1) {
      searchTimerRef.current = window.setTimeout(async () => {
        try {
          const users = await userApi.search(val.trim());
          setUserSuggestions(users.filter(u => u.id !== user?.id));
          setShowSuggestions(true);
        } catch {
          setUserSuggestions([]);
        }
      }, 300);
    } else {
      setUserSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectUser = (u: User) => {
    setRecipient(u.username);
    setShowSuggestions(false);
    setUserSuggestions([]);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const valid = files.filter(f => {
      if (f.size > 5 * 1024 * 1024) {
        alert(`图片 ${f.name} 超过5MB限制`);
        return false;
      }
      if (!/jpe?g|png/i.test(f.type)) {
        alert(`图片 ${f.name} 只支持jpg/png格式`);
        return false;
      }
      return true;
    });

    const newPhotos = [...photos, ...valid].slice(0, 3);
    setPhotos(newPhotos);

    const newPreviews = [...photoPreviews];
    valid.slice(0, 3 - photos.length).forEach(f => {
      const reader = new FileReader();
      reader.onload = () => newPreviews.push(reader.result as string);
      reader.readAsDataURL(f);
    });
    setTimeout(() => setPhotoPreviews(newPreviews.slice(0, 3)), 100);
  };

  const removePhoto = (idx: number) => {
    setPhotos(photos.filter((_, i) => i !== idx));
    setPhotoPreviews(photoPreviews.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!recipient.trim()) { setError('请输入收件人用户名'); return; }
    if (selectedMoodIdx === null) { setError('请选择心情'); return; }
    if (!content.trim()) { setError('请输入文字内容'); return; }
    if (content.length > 200) { setError('内容不能超过200字'); return; }
    if (!openDate || !openTime) { setError('请选择开启时间'); return; }

    const openAt = new Date(`${openDate}T${openTime}`);
    if (openAt <= new Date()) { setError('开启时间必须是未来时间'); return; }

    setLoading(true);
    try {
      let photoUrls: string[] = [];
      if (photos.length > 0) {
        photoUrls = await uploadApi.photos(photos);
      }

      const mood = MOOD_OPTIONS[selectedMoodIdx];
      await capsuleApi.create({
        senderId: user!.id,
        senderName: user!.username,
        recipientName: recipient.trim(),
        mood: mood.emoji,
        moodColor: mood.color,
        content: content.trim(),
        photos: photoUrls,
        openAt: openAt.toISOString()
      });

      onCreated();
    } catch (err: any) {
      setError(err.message || '创建失败');
      setLoading(false);
    }
  };

  return (
    <div className={`modal-backdrop create-capsule-modal ${isAnimating ? 'burying' : ''}`} onClick={!isAnimating ? onClose : undefined}>
      <div className="modal-content create-content" onClick={e => e.stopPropagation()}>
        {!isAnimating && (
          <button className="modal-close" onClick={onClose}>×</button>
        )}

        {isAnimating ? (
          <div className="burying-animation">
            <div className="burying-capsule">
              <div className="capsule-body" style={{ background: selectedMoodIdx !== null ? MOOD_OPTIONS[selectedMoodIdx].color : '#ffdd88' }}>
                <span className="capsule-mood">{selectedMoodIdx !== null ? MOOD_OPTIONS[selectedMoodIdx].emoji : '✦'}</span>
              </div>
              <div className="burying-trail"></div>
            </div>
            <p className="burying-text">胶囊已埋藏，正融入星图中...</p>
          </div>
        ) : (
          <>
            <h2>埋藏时空胶囊</h2>
            <p className="modal-subtitle">封装此刻的心情与回忆，寄往未来</p>

            <form onSubmit={handleSubmit}>
              <div className="form-group recipient-group">
                <label>收件人</label>
                <div className="recipient-input-wrap">
                  <input
                    type="text"
                    placeholder="输入收件人用户名"
                    value={recipient}
                    onChange={e => handleRecipientChange(e.target.value)}
                    onFocus={() => recipient && setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                    autoComplete="off"
                  />
                  {showSuggestions && userSuggestions.length > 0 && (
                    <div className="user-suggestions">
                      {userSuggestions.map(u => (
                        <div key={u.id} className="suggestion-item" onMouseDown={() => handleSelectUser(u)}>
                          <div className="suggestion-avatar" style={{ background: u.avatar }}>
                            {u.username[0].toUpperCase()}
                          </div>
                          <span>{u.username}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>此刻心情</label>
                <div className="mood-grid">
                  {MOOD_OPTIONS.map((m, i) => (
                    <button
                      key={m.emoji}
                      type="button"
                      className={`mood-btn ${selectedMoodIdx === i ? 'selected' : ''}`}
                      onClick={() => setSelectedMoodIdx(i)}
                      style={{
                        '--mood-color': m.color,
                      } as React.CSSProperties}
                    >
                      <span className="mood-emoji">{m.emoji}</span>
                      <span className="mood-name">{m.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>
                  文字内容
                  <span className="char-count">{content.length}/200</span>
                </label>
                <textarea
                  placeholder="此刻你想说些什么？（最多200字）"
                  value={content}
                  onChange={e => setContent(e.target.value.slice(0, 200))}
                  rows={4}
                  maxLength={200}
                />
              </div>

              <div className="form-group">
                <label>照片（最多3张，每张不超过5MB）</label>
                <div className="photo-upload-area">
                  {photoPreviews.map((p, i) => (
                    <div key={i} className="photo-preview">
                      <img src={p} alt="" />
                      <button type="button" className="remove-photo" onClick={() => removePhoto(i)}>×</button>
                    </div>
                  ))}
                  {photos.length < 3 && (
                    <button
                      type="button"
                      className="upload-btn"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      + 添加照片
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/jpg"
                    multiple
                    onChange={handlePhotoSelect}
                    style={{ display: 'none' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>开启时间（30天内）</label>
                <div className="datetime-inputs">
                  <input
                    type="date"
                    value={openDate}
                    min={minDate}
                    max={maxDate}
                    onChange={e => setOpenDate(e.target.value)}
                  />
                  <input
                    type="time"
                    value={openTime}
                    onChange={e => setOpenTime(e.target.value)}
                  />
                </div>
              </div>

              {error && <div className="form-error">{error}</div>}

              <button type="submit" className="btn-primary submit-btn" disabled={loading}>
                {loading ? '埋藏中...' : '✦ 埋藏胶囊'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
