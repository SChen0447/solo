import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { validateLyric, getLastChar, getFirstChar } from '../utils/homophone';
import { playBeepSound, playSuccessSound } from '../utils/audio';
import CollabPanel from './CollabPanel';
import '../styles/lyricRoom.css';

const LyricRoom: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { rooms, currentUser, addLyric, joinRoom, leaveRoom, likeRoom } = useApp();
  const [inputValue, setInputValue] = useState('');
  const [validation, setValidation] = useState<{ valid: boolean; message: string; isHomophone?: boolean } | null>(null);
  const [showFlash, setShowFlash] = useState(false);
  const [particles, setParticles] = useState<Array<{ id: number; top: number; left: number }>>([]);
  const [isWaiting, setIsWaiting] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<'lyrics' | 'collab'>('lyrics');
  const lyricsEndRef = useRef<HTMLDivElement>(null);
  const particleIdRef = useRef(0);

  const room = rooms.find(r => r.id === id);

  useEffect(() => {
    if (room && currentUser) {
      joinRoom(room.id);
      if (room.users.length < 2) {
        setIsWaiting(true);
      }
    }
    return () => {
      if (room) {
        leaveRoom(room.id);
      }
    };
  }, [id]);

  useEffect(() => {
    if (room && room.users.length >= 2 && isWaiting) {
      setIsWaiting(false);
      playSuccessSound();
    }
  }, [room?.users.length]);

  useEffect(() => {
    lyricsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [room?.lyrics.length]);

  useEffect(() => {
    const interval = setInterval(() => {
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    if (value.trim().length > 0) {
      const lastLyric = room?.lyrics.length
        ? room.lyrics[room.lyrics.length - 1].text
        : null;
      const result = validateLyric(
        value,
        lastLyric,
        room?.rules.allowHomophone ?? true,
        room?.rules.requireLastChar ?? true
      );
      setValidation(result);
    } else {
      setValidation(null);
    }
  };

  const handleSend = () => {
    if (!room || !currentUser || !validation?.valid || isWaiting) return;

    const newLyric = {
      id: `l_${Date.now()}`,
      text: inputValue.trim(),
      userId: currentUser.id,
      userName: currentUser.name,
      userColor: currentUser.color,
      timestamp: Date.now()
    };

    addLyric(room.id, newLyric);
    setInputValue('');
    setValidation(null);

    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 100);

    const newParticles: Array<{ id: number; top: number; left: number }> = [];
    for (let i = 0; i < 8; i++) {
      newParticles.push({
        id: particleIdRef.current++,
        top: Math.random() * 60 + 20,
        left: 50 + Math.random() * 30
      });
    }
    setParticles(prev => [...prev, ...newParticles]);
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
    }, 800);

    playBeepSound(660, 0.15);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getGradientStyle = (index: number, total: number) => {
    const ratio = total <= 1 ? 0 : index / (total - 1);
    const startColor = [102, 126, 234];
    const endColor = [233, 69, 96];
    const r = Math.round(startColor[0] + (endColor[0] - startColor[0]) * ratio);
    const g = Math.round(startColor[1] + (endColor[1] - startColor[1]) * ratio);
    const b = Math.round(startColor[2] + (endColor[2] - startColor[2]) * ratio);
    return {
      background: `rgba(${r}, ${g}, ${b}, 0.25)`,
      borderLeft: `3px solid rgba(${r}, ${g}, ${b}, 0.8)`
    };
  };

  const renderLyricText = (text: string, index: number, isLast: boolean) => {
    if (!room || room.lyrics.length <= 1 || index === 0) {
      return <span>{text}</span>;
    }

    const prevLyric = room.lyrics[index - 1];
    const lastChar = getLastChar(prevLyric.text);
    const firstChar = getFirstChar(text);
    const isHomophoneMatch = lastChar !== firstChar && room.rules.allowHomophone;

    if (lastChar === firstChar || isHomophoneMatch) {
      return (
        <span>
          <span className={isHomophoneMatch ? 'homophone-highlight' : 'first-char-match'}>
            {text.charAt(0)}
          </span>
          {text.slice(1)}
        </span>
      );
    }
    return <span>{text}</span>;
  };

  if (!room) {
    return (
      <div className="room-not-found">
        <div className="card not-found-card">
          <h2>房间不存在</h2>
          <p>该房间可能已被删除或不存在</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            返回首页
          </button>
        </div>
      </div>
    );
  }

  const lastLyric = room.lyrics.length ? room.lyrics[room.lyrics.length - 1].text : null;

  return (
    <div className="lyric-room-page">
      {isWaiting && (
        <div className="waiting-overlay">
          <div className="waiting-content">
            <div className="waiting-indicator">
              <div className="spinner-ring"></div>
            </div>
            <h3>等待其他玩家加入...</h3>
            <p>房间号：{room.id}</p>
            <p className="waiting-hint">分享房间号邀请好友一起创作</p>
          </div>
        </div>
      )}

      <div className="room-container">
        <div className="room-main">
          <div className="room-header card">
            <div className="room-header-left">
              <button className="back-btn" onClick={() => navigate('/')}>
                ← 返回
              </button>
              <div>
                <h1 className="room-title">{room.name}</h1>
                <div className="room-tags">
                  {room.tags.map(tag => (
                    <span key={tag} className="tag">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="room-header-right">
              <button
                className={`like-btn-room ${currentUser?.likedRooms.includes(room.id) ? 'liked' : ''}`}
                onClick={() => likeRoom(room.id)}
              >
                <span className="like-icon">
                  {currentUser?.likedRooms.includes(room.id) ? '❤️' : '🤍'}
                </span>
                <span className="like-count">{room.likes}</span>
              </button>
              <div className="online-count">
                <span className="online-dot"></span>
                {room.onlineUsers.length} 人在线
              </div>
            </div>
          </div>

          <div className="mobile-tab-bar show-mobile">
            <button
              className={`mobile-tab ${mobilePanel === 'lyrics' ? 'active' : ''}`}
              onClick={() => setMobilePanel('lyrics')}
            >
              📝 歌词
            </button>
            <button
              className={`mobile-tab ${mobilePanel === 'collab' ? 'active' : ''}`}
              onClick={() => setMobilePanel('collab')}
            >
              👥 协作
            </button>
          </div>

          <div className={`lyrics-panel card ${showFlash ? 'flash-effect' : ''} ${mobilePanel === 'collab' ? 'hide-mobile' : ''}`}>
            <div className="lyrics-list">
              {room.lyrics.length === 0 ? (
                <div className="empty-lyrics">
                  <div className="empty-icon">✍️</div>
                  <p>还没有歌词，快来写下第一句吧！</p>
                  <p className="empty-hint">
                    {room.rules.requireLastChar
                      ? '下一句需要以上一句最后一个字开头'
                      : '自由发挥，尽情创作吧'}
                  </p>
                </div>
              ) : (
                room.lyrics.map((lyric, index) => (
                  <div
                    key={lyric.id}
                    className={`lyric-line ${index === room.lyrics.length - 1 ? 'animate-bounce-in latest' : ''}`}
                    style={getGradientStyle(index, room.lyrics.length)}
                  >
                    <div className="lyric-content">
                      <span className="lyric-index">{index + 1}</span>
                      <span className="lyric-text">
                        {renderLyricText(lyric.text, index, index === room.lyrics.length - 1)}
                      </span>
                    </div>
                    <div className="lyric-author" style={{ color: lyric.userColor }}>
                      {lyric.userName}
                    </div>
                  </div>
                ))
              )}
              <div ref={lyricsEndRef} />
            </div>

            {particles.map(particle => (
              <div
                key={particle.id}
                className="particle"
                style={{
                  top: `${particle.top}%`,
                  left: `${particle.left}%`
                }}
              />
            ))}
          </div>

          <div className={`input-area card ${mobilePanel === 'collab' ? 'hide-mobile' : ''}`}>
            {lastLyric && room.rules.requireLastChar && (
              <div className="rule-hint">
                <span className="hint-label">下一句开头：</span>
                <span className="hint-char">{getLastChar(lastLyric)}</span>
                {room.rules.allowHomophone && (
                  <span className="hint-sub">（或同音字）</span>
                )}
              </div>
            )}
            <div className="input-row">
              <input
                type="text"
                className="input lyric-input"
                placeholder="输入一句歌词（15-40字）..."
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                maxLength={40}
                disabled={isWaiting}
              />
              <button
                className="btn btn-primary send-btn"
                onClick={handleSend}
                disabled={!validation?.valid || isWaiting}
              >
                发送
              </button>
            </div>
            <div className="input-footer">
              <span className="char-count">
                {inputValue.length}/40
              </span>
              {validation && (
                <span className={`validation-msg ${validation.valid ? 'valid' : 'invalid'}`}>
                  {validation.message}
                  {validation.isHomophone && ' 🌟'}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className={`room-sidebar hide-mobile ${mobilePanel === 'collab' ? 'show-mobile' : ''}`}>
          <CollabPanel room={room} onInspirationClick={(text) => {
            setInputValue(text);
            const lastLyricText = room.lyrics.length
              ? room.lyrics[room.lyrics.length - 1].text
              : null;
            const result = validateLyric(
              text,
              lastLyricText,
              room.rules.allowHomophone,
              room.rules.requireLastChar
            );
            setValidation(result);
          }} />
        </div>
      </div>
    </div>
  );
};

export default LyricRoom;
