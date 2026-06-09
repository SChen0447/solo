import React, { useState, useRef, useEffect } from 'react';
import { User, Song, parseVideoUrl, getThumbnailUrl, REACTIONS } from '../socket';

interface FloatingReaction {
  id: number;
  reaction: string;
  left: number;
  top: number;
}

interface PlayerProps {
  users: User[];
  queue: Song[];
  currentSong: Song | null;
  isPlaying: boolean;
  volume: number;
  nickname: string;
  yourId: string;
  hasReacted: boolean;
  floatingReactions: FloatingReaction[];
  onAddSong: (song: Omit<Song, 'id'>) => void;
  onRemoveSong: (songId: string) => void;
  onPlayNext: () => void;
  onPlayPause: (isPlaying: boolean) => void;
  onSetVolume: (volume: number) => void;
  onSendReaction: (reaction: string) => void;
  onSongEnded: () => void;
  onLeave: () => void;
}

const Player: React.FC<PlayerProps> = ({
  users,
  queue,
  currentSong,
  isPlaying,
  volume,
  nickname,
  yourId,
  hasReacted,
  floatingReactions,
  onAddSong,
  onRemoveSong,
  onPlayNext,
  onPlayPause,
  onSetVolume,
  onSendReaction,
  onSongEnded,
  onLeave
}) => {
  const [songUrl, setSongUrl] = useState('');
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleAddSong = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseVideoUrl(songUrl.trim());
    if (!parsed) {
      alert('请输入有效的 YouTube 或 B站 视频链接');
      return;
    }

    const title = parsed.platform === 'youtube'
      ? `YouTube 视频 (${parsed.videoId})`
      : `B站 视频 (${parsed.videoId})`;

    onAddSong({
      videoId: parsed.videoId,
      platform: parsed.platform,
      title,
      thumbnail: getThumbnailUrl(parsed.videoId, parsed.platform),
      addedBy: nickname,
      addedById: yourId
    });
    setSongUrl('');
  };

  const handleRemoveSong = (songId: string) => {
    setRemovingIds(prev => new Set(prev).add(songId));
    setTimeout(() => {
      onRemoveSong(songId);
      setRemovingIds(prev => {
        const next = new Set(prev);
        next.delete(songId);
        return next;
      });
    }, 300);
  };

  const getIframeSrc = (song: Song) => {
    if (song.platform === 'youtube') {
      return `https://www.youtube.com/embed/${song.videoId}?autoplay=${isPlaying ? 1 : 0}&controls=1&modestbranding=1&rel=0`;
    }
    return `https://player.bilibili.com/player.html?bvid=${song.videoId}&page=1&autoplay=${isPlaying ? 1 : 0}`;
  };

  useEffect(() => {
    if (currentSong && isPlaying && iframeRef.current) {
      const iframe = iframeRef.current;
      const currentSrc = iframe.src;
      const newSrc = getIframeSrc(currentSong);
      if (currentSrc !== newSrc) {
        iframe.src = newSrc;
      }
    }
  }, [currentSong, isPlaying]);

  return (
    <>
      <div className="users-panel">
        <div className="panel-title">👥 在线用户</div>
        <div className="user-list">
          {users.map(user => (
            <div key={user.id} className="user-item">
              <div
                className="user-avatar"
                style={{ backgroundColor: user.avatar }}
              >
                {user.nickname.charAt(0).toUpperCase()}
              </div>
              <span className="user-nickname">
                {user.nickname}
                {user.id === yourId && ' (我)'}
              </span>
            </div>
          ))}
        </div>
        <button className="btn-secondary leave-btn" onClick={onLeave}>
          离开房间
        </button>
      </div>

      <div className="player-section">
        <div className="player-container">
          <div className="video-wrapper">
            {currentSong ? (
              <iframe
                ref={iframeRef}
                src={getIframeSrc(currentSong)}
                title={currentSong.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="no-song">
                <div className="no-song-icon">🎵</div>
                <div>暂无播放歌曲</div>
                <div style={{ fontSize: '12px' }}>添加歌曲到队列开始播放</div>
              </div>
            )}
            <div className="reactions-overlay">
              {floatingReactions.map(fr => (
                <div
                  key={fr.id}
                  className="floating-reaction"
                  style={{ left: `${fr.left}%`, top: `${fr.top}%` }}
                >
                  {fr.reaction}
                </div>
              ))}
            </div>
          </div>
          {currentSong && (
            <div className="current-song-info">
              <div className="current-song-title">{currentSong.title}</div>
              <div className="current-song-added">由 {currentSong.addedBy} 添加</div>
            </div>
          )}
        </div>

        <div className="add-song">
          <form className="add-song-form" onSubmit={handleAddSong}>
            <input
              type="text"
              className="add-song-input"
              placeholder="粘贴 YouTube 或 B站 视频链接..."
              value={songUrl}
              onChange={(e) => setSongUrl(e.target.value)}
            />
            <button type="submit" className="btn-add">添加</button>
          </form>
        </div>

        <div className="player-controls">
          <div className="control-buttons">
            <button
              className="btn-control"
              onClick={() => onPlayPause(!isPlaying)}
              disabled={!currentSong}
              title={isPlaying ? '暂停' : '播放'}
            >
              {isPlaying ? '⏸️' : '▶️'}
            </button>
            <button
              className="btn-control primary"
              onClick={onPlayNext}
              disabled={queue.length === 0 && !currentSong}
              title="下一首"
            >
              ⏭️
            </button>
          </div>
          <div className="volume-control">
            <span className="volume-icon">🔊</span>
            <input
              type="range"
              className="volume-slider"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => onSetVolume(parseFloat(e.target.value))}
            />
            <span style={{ color: '#a0a0b0', fontSize: '12px', minWidth: '30px' }}>
              {Math.round(volume * 100)}%
            </span>
          </div>
        </div>

        <div className="reactions-panel">
          <div className="panel-title" style={{ borderBottom: 'none', marginBottom: '12px', textAlign: 'center' }}>
            {hasReacted ? '你已发送反应' : '发送表情反应'}
          </div>
          <div className="reactions-buttons">
            {REACTIONS.map(reaction => (
              <button
                key={reaction}
                className={`btn-reaction ${hasReacted ? 'used' : ''}`}
                onClick={() => !hasReacted && onSendReaction(reaction)}
                disabled={hasReacted || !currentSong}
              >
                {reaction}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="queue-panel">
        <div className="panel-title">🎶 播放队列 ({queue.length})</div>
        {queue.length === 0 ? (
          <div className="empty-queue">
            队列为空
            <div style={{ fontSize: '12px', marginTop: '8px' }}>添加歌曲开始一起听歌吧！</div>
          </div>
        ) : (
          <div className="queue-list">
            {queue.map(song => (
              <div
                key={song.id}
                className={`queue-item ${removingIds.has(song.id) ? 'removing' : ''}`}
              >
                <img
                  src={song.thumbnail}
                  alt={song.title}
                  className="queue-thumbnail"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${song.videoId}/60/45`;
                  }}
                />
                <div className="queue-info">
                  <div className="queue-title">{song.title}</div>
                  <div className="queue-added">{song.addedBy}</div>
                </div>
                <button
                  className="btn-remove"
                  onClick={() => handleRemoveSong(song.id)}
                  title="移除歌曲"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default Player;
