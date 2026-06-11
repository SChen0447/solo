import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import '../styles/history.css';

const HistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { rooms, likeRoom, currentUser } = useApp();
  const [sortBy, setSortBy] = useState<'likes' | 'time'>('likes');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const allTags = Array.from(new Set(rooms.flatMap(r => r.tags)));

  let filteredRooms = [...rooms];

  if (selectedTag) {
    filteredRooms = filteredRooms.filter(r => r.tags.includes(selectedTag));
  }

  if (sortBy === 'likes') {
    filteredRooms.sort((a, b) => b.likes - a.likes);
  } else {
    filteredRooms.sort((a, b) => b.createdAt - a.createdAt);
  }

  const handleCardClick = (roomId: string) => {
    navigate(`/room/${roomId}`);
  };

  const handleLike = (e: React.MouseEvent, roomId: string) => {
    e.stopPropagation();
    likeRoom(roomId);
  };

  const getRoomEmoji = (tags: string[]) => {
    const emojiMap: Record<string, string> = {
      '爱情': '💕',
      '梦想': '✨',
      '自然': '🌿',
      '夏天': '☀️',
      '励志': '💪',
      '宁静': '🌙',
      '城市': '🏙️',
      '夜晚': '🌃',
      '童年': '🎈',
      '回忆': '📸'
    };
    for (const tag of tags) {
      if (emojiMap[tag]) return emojiMap[tag];
    }
    return '🎵';
  };

  return (
    <div className="history-page">
      <div className="page-container">
        <div className="page-header animate-fade-in">
          <h1 className="page-title">历史接龙库</h1>
          <p className="page-subtitle">发现更多精彩的创作，寻找灵感</p>
        </div>

        <div className="filter-bar card animate-slide-up">
          <div className="filter-tags">
            <button
              className={`filter-tag ${!selectedTag ? 'active' : ''}`}
              onClick={() => setSelectedTag(null)}
            >
              全部
            </button>
            {allTags.map(tag => (
              <button
                key={tag}
                className={`filter-tag ${selectedTag === tag ? 'active' : ''}`}
                onClick={() => setSelectedTag(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
          <div className="sort-options">
            <span className="sort-label">排序：</span>
            <button
              className={`sort-btn ${sortBy === 'likes' ? 'active' : ''}`}
              onClick={() => setSortBy('likes')}
            >
              最热
            </button>
            <button
              className={`sort-btn ${sortBy === 'time' ? 'active' : ''}`}
              onClick={() => setSortBy('time')}
            >
              最新
            </button>
          </div>
        </div>

        <div className="waterfall-grid">
          {filteredRooms.map((room, index) => (
            <div
              key={room.id}
              className="waterfall-item animate-slide-up"
              style={{ animationDelay: `${index * 0.03}s` }}
            >
              <div
                className="card room-card"
                onClick={() => handleCardClick(room.id)}
              >
                <div
                  className="room-card-image"
                  style={{
                    background: `linear-gradient(135deg, ${room.lyrics[0]?.userColor || '#667eea'}40, ${room.lyrics[room.lyrics.length - 1]?.userColor || '#e94560'}40)`
                  }}
                >
                  <span className="room-emoji">{getRoomEmoji(room.tags)}</span>
                  <div className="room-card-overlay">
                    <span className="overlay-btn">查看详情</span>
                  </div>
                </div>
                <div className="room-card-content">
                  <h3 className="room-card-title">{room.name}</h3>
                  <div className="room-card-tags">
                    {room.tags.map(tag => (
                      <span key={tag} className="tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="room-card-preview">
                    {room.lyrics.slice(0, 3).map((lyric, i) => (
                      <p key={lyric.id} className="preview-line">
                        <span className="preview-index">{i + 1}.</span>
                        {lyric.text}
                      </p>
                    ))}
                  </div>
                  <div className="room-card-footer">
                    <div className="room-card-stats">
                      <span className="room-card-stat">
                        ❤️ {room.likes}
                      </span>
                      <span className="room-card-stat">
                        👥 {room.users.length}
                      </span>
                      <span className="room-card-stat">
                        📝 {room.lyrics.length}
                      </span>
                    </div>
                    <button
                      className={`like-btn ${currentUser?.likedRooms.includes(room.id) ? 'liked' : ''}`}
                      onClick={(e) => handleLike(e, room.id)}
                    >
                      {currentUser?.likedRooms.includes(room.id) ? '❤️' : '🤍'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredRooms.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <p>没有找到相关的接龙</p>
            <p className="empty-hint">试试其他标签吧</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryPage;
