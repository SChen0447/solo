import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import BulletScreen from './components/BulletScreen';
import SongQueue from './components/SongQueue';
import { Bullet, PlayerState, QueueState } from './types';

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [nickname, setNickname] = useState('');
  const [joined, setJoined] = useState(false);
  const [nicknameInput, setNicknameInput] = useState('');
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [playerState, setPlayerState] = useState<PlayerState>({
    currentSong: null,
    currentProgress: 0,
    isPlaying: false,
  });
  const [queueState, setQueueState] = useState<QueueState>({
    queue: [],
    history: [],
  });
  const [inputText, setInputText] = useState('');
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    const newSocket = io('/', { transports: ['websocket', 'polling'] });
    setSocket(newSocket);

    newSocket.on('bullet', (data: Bullet) => {
      setBullets((prev) => [...prev, data]);
    });

    newSocket.on('system-message', (data: Bullet) => {
      setAnnouncement(data.content);
      setTimeout(() => setAnnouncement(null), 2000);
    });

    newSocket.on('player-update', (data: PlayerState) => {
      setPlayerState(data);
    });

    newSocket.on('queue-update', (data: QueueState) => {
      setQueueState(data);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setBullets((prev) => prev.filter((b) => now - b.timestamp < 3000));
    }, 500);
    return () => clearInterval(timer);
  }, []);

  const handleJoin = () => {
    if (nicknameInput.length < 2 || nicknameInput.length > 10) return;
    if (socket) {
      socket.emit('join', { nickname: nicknameInput });
      setNickname(nicknameInput);
      setJoined(true);
    }
  };

  const handleSendBullet = useCallback(() => {
    if (!inputText.trim() || !socket || !nickname) return;
    socket.emit('send-bullet', { content: inputText.trim(), nickname });
    setInputText('');
  }, [inputText, socket, nickname]);

  const handleVote = useCallback(
    (songId: string) => {
      if (!socket || !nickname) return;
      socket.emit('vote-song', { songId, nickname });
    },
    [socket, nickname]
  );

  const handleSeek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!progressRef.current || !playerState.currentSong || !socket) return;
      const rect = progressRef.current.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / rect.width;
      const newProgress = Math.floor(ratio * playerState.currentSong.duration);
      socket.emit('seek-progress', { progress: newProgress });
    },
    [playerState.currentSong, socket]
  );

  const handleProgressMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    handleSeek(e);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !progressRef.current || !playerState.currentSong || !socket) return;
      const rect = progressRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const newProgress = Math.floor(ratio * playerState.currentSong.duration);
      socket.emit('seek-progress', { progress: newProgress });
    };
    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [playerState.currentSong, socket]);

  if (!joined) {
    return (
      <div className="login-container">
        <div className="login-box">
          <h1 className="login-title">🎵 弹幕点歌台</h1>
          <p className="login-subtitle">输入昵称进入直播间</p>
          <input
            type="text"
            className="login-input"
            placeholder="请输入昵称 (2-10个字符)"
            value={nicknameInput}
            maxLength={10}
            onChange={(e) => setNicknameInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
          />
          <button
            className="login-button"
            disabled={nicknameInput.length < 2 || nicknameInput.length > 10}
            onClick={handleJoin}
          >
            进入直播间
          </button>
        </div>
      </div>
    );
  }

  const progressPercent = playerState.currentSong
    ? (playerState.currentProgress / playerState.currentSong.duration) * 100
    : 0;

  return (
    <div className="app-container">
      {announcement && (
        <div className="announcement-banner">{announcement}</div>
      )}

      <div className="player-bar">
        {playerState.currentSong ? (
          <>
            <div
              className="song-cover"
              style={{ backgroundColor: playerState.currentSong.coverColor }}
            >
              <span className="play-icon">▶</span>
            </div>
            <div className="song-info">
              <div className="song-title">{playerState.currentSong.title}</div>
              <div className="song-artist">{playerState.currentSong.artist}</div>
            </div>
            <div className="progress-section">
              <span className="time-text">
                {formatTime(playerState.currentProgress)}
              </span>
              <div
                className="progress-bar"
                ref={progressRef}
                onMouseDown={handleProgressMouseDown}
                style={{ cursor: 'pointer' }}
              >
                <div
                  className="progress-fill"
                  style={{ width: `${progressPercent}%` }}
                />
                <div
                  className="progress-thumb"
                  style={{ left: `${progressPercent}%` }}
                />
              </div>
              <span className="time-text">
                {formatTime(playerState.currentSong.duration)}
              </span>
            </div>
          </>
        ) : (
          <div className="player-bar">加载中...</div>
        )}
      </div>

      <div className="main-content">
        <BulletScreen bullets={bullets} />
        <SongQueue
          queue={queueState.queue}
          history={queueState.history}
          onVote={handleVote}
          nickname={nickname}
        />
      </div>

      <div className="input-bar">
        <div className="user-tag">{nickname}</div>
        <input
          ref={inputRef}
          type="text"
          className="bullet-input"
          placeholder="输入 '歌名-歌手' 点歌，或发送弹幕..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendBullet()}
        />
        <button className="send-button" onClick={handleSendBullet}>
          发送
        </button>
      </div>
    </div>
  );
}

export default App;
