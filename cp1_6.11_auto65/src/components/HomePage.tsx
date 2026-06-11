import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import '../styles/home.css';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { rooms, likeRoom, currentUser } = useApp();

  const sortedRooms = [...rooms].sort((a, b) => b.likes - a.likes);

  const handleCardClick = (roomId: string) => {
    navigate(`/room/${roomId}`);
  };

  const handleLike = (e: React.MouseEvent, roomId: string) => {
    e.stopPropagation();
    likeRoom(roomId);
  };

  const handleCreateRoom = () => {
    navigate('/create');
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
    <div className="home-page">
      <div className="page-container">
        <div className="create-room-section animate-fade-in">
          <div className="create-room-header">
            <div>
              <h2 className="create-room-title">开始你的创作之旅</h2>
              <p className="create-room-desc">
                创建一个新的接龙房间，邀请好友一起用歌词碰撞灵感
              </p>
            </div>
            <button className="btn btn-primary" onClick={handleCreateRoom}>
              + 创建房间
            </button>
          </div>
        </div>

        <div className="section-header">
          <h2 className="section-title">热门接龙</h2>
          <p className="section-desc">按点赞数排序，看看大家最喜欢的创作</p>
        </div>

        <div className="waterfall-grid">
          {sortedRooms.map((room, index) => (
            <div
              key={room.id}
              className="waterfall-item animate-slide-up"
              style={{ animationDelay: `${index * 0.05}s` }}
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
                    <span className="overlay-btn">开始接龙</span>
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
                    {room.lyrics.slice(0, 2).map((lyric, i) => (
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
      </div>
    </div>
  );
};

export default HomePage;
