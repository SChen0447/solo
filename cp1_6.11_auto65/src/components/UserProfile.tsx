import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import '../styles/userProfile.css';

const UserProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { users, rooms, currentUser, setCurrentUser, likeRoom } = useApp();
  const [activeTab, setActiveTab] = useState<'joined' | 'liked'>('joined');
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');

  const user = users.find(u => u.id === id) || (currentUser?.id === id ? currentUser : null);
  const isCurrentUser = currentUser?.id === id;

  const joinedRooms = rooms.filter(r => user?.joinedRooms.includes(r.id))
    .sort((a, b) => b.createdAt - a.createdAt);

  const likedRooms = rooms.filter(r => user?.likedRooms.includes(r.id))
    .sort((a, b) => b.likes - a.likes);

  const handleEditName = () => {
    if (!isCurrentUser || !currentUser) return;
    setEditName(currentUser.name);
    setIsEditing(true);
  };

  const handleSaveName = () => {
    if (!editName.trim() || !currentUser) return;
    const newUser = {
      ...currentUser,
      name: editName.trim(),
      avatarInitial: editName.trim().charAt(0)
    };
    setCurrentUser(newUser);
    setIsEditing(false);
  };

  const handleRoomClick = (roomId: string) => {
    navigate(`/room/${roomId}`);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return '今天';
    if (days === 1) return '昨天';
    if (days < 7) return `${days}天前`;
    if (days < 30) return `${Math.floor(days / 7)}周前`;
    return `${Math.floor(days / 30)}个月前`;
  };

  const countUserLyrics = (roomId: string) => {
    const room = rooms.find(r => r.id === roomId);
    if (!room || !user) return 0;
    return room.lyrics.filter(l => l.userId === user.id).length;
  };

  if (!user) {
    return (
      <div className="user-profile-page">
        <div className="page-container">
          <div className="card not-found-card">
            <h2>用户不存在</h2>
            <p>该用户可能已不存在</p>
            <button className="btn btn-primary" onClick={() => navigate('/')}>
              返回首页
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="user-profile-page">
      <div className="profile-header">
        <div className="profile-header-bg"></div>
        <div className="page-container">
          <div className="profile-info animate-fade-in">
            <div
              className="profile-avatar"
              style={{ backgroundColor: user.color }}
            >
              {user.avatarInitial}
            </div>
            <div className="profile-details">
              {isEditing ? (
                <div className="edit-name-row">
                  <input
                    type="text"
                    className="input edit-name-input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    maxLength={10}
                    autoFocus
                  />
                  <button className="btn btn-primary btn-small" onClick={handleSaveName}>
                    保存
                  </button>
                  <button className="btn btn-secondary btn-small" onClick={() => setIsEditing(false)}>
                    取消
                  </button>
                </div>
              ) : (
                <div className="name-row">
                  <h1 className="profile-name">{user.name}</h1>
                  {isCurrentUser && (
                    <button className="edit-btn" onClick={handleEditName}>
                      ✏️
                    </button>
                  )}
                </div>
              )}
              <div className="profile-stats">
                <div className="stat-item">
                  <span className="stat-value">{joinedRooms.length}</span>
                  <span className="stat-label">参与房间</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{likedRooms.length}</span>
                  <span className="stat-label">喜欢的</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">
                    {joinedRooms.reduce((sum, r) => sum + countUserLyrics(r.id), 0)}
                  </span>
                  <span className="stat-label">创作句子</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="page-container">
        <div className="tabs-section">
          <div className="tabs">
            <button
              className={`tab ${activeTab === 'joined' ? 'active' : ''}`}
              onClick={() => setActiveTab('joined')}
            >
              参与的接龙
            </button>
            <button
              className={`tab ${activeTab === 'liked' ? 'active' : ''}`}
              onClick={() => setActiveTab('liked')}
            >
              喜欢的
            </button>
          </div>
        </div>

        <div className="rooms-list">
          {(activeTab === 'joined' ? joinedRooms : likedRooms).map((room, index) => (
            <div
              key={room.id}
              className="card room-item animate-slide-up"
              style={{ animationDelay: `${index * 0.05}s` }}
              onClick={() => handleRoomClick(room.id)}
            >
              <div className="room-item-info">
                <h3 className="room-item-title">{room.name}</h3>
                <div className="room-item-tags">
                  {room.tags.map(tag => (
                    <span key={tag} className="tag">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="room-item-meta">
                  {activeTab === 'joined' && (
                    <>
                      <span>贡献 {countUserLyrics(room.id)} 句</span>
                      <span className="dot-sep">·</span>
                    </>
                  )}
                  <span>{room.lyrics.length} 句歌词</span>
                  <span className="dot-sep">·</span>
                  <span>{formatDate(room.createdAt)}</span>
                </div>
              </div>
              <div className="room-item-stats">
                <span className="stat-pill">
                  ❤️ {room.likes}
                </span>
                {activeTab === 'liked' && isCurrentUser && (
                  <button
                    className={`like-btn ${currentUser?.likedRooms.includes(room.id) ? 'liked' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      likeRoom(room.id);
                    }}
                  >
                    {currentUser?.likedRooms.includes(room.id) ? '❤️' : '🤍'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {(activeTab === 'joined' ? joinedRooms : likedRooms).length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">
              {activeTab === 'joined' ? '🎵' : '❤️'}
            </div>
            <p>
              {activeTab === 'joined'
                ? '还没有参与任何接龙'
                : '还没有喜欢的接龙'}
            </p>
            <p className="empty-hint">
              {activeTab === 'joined'
                ? '快去首页找一个感兴趣的房间开始创作吧'
                : '看到喜欢的别忘了点赞哦'}
            </p>
            <button className="btn btn-primary" onClick={() => navigate('/')}>
              去首页看看
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
