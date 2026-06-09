import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  useSynth,
  InstrumentType,
  NoteEvent,
  PIANO_KEY_MAP,
  DRUM_KEYS,
  getGuitarNote
} from './Hooks/useSynth';

interface User {
  id: string;
  nickname: string;
  instrument: InstrumentType;
}

interface RoomInfo {
  name: string;
  userCount: number;
}

interface NoteOnStaff extends NoteEvent {
  x: number;
  y: number;
  id: string;
  createdAt: number;
  isRemote?: boolean;
}

interface Glow {
  id: string;
  x: number;
  y: number;
  color: string;
}

interface EnergyBar {
  userId: string;
  id: string;
}

const INSTRUMENT_COLORS: Record<InstrumentType, string> = {
  piano: '#4FC3F7',
  guitar: '#81C784',
  drum: '#E57373'
};

const INSTRUMENT_ICONS: Record<InstrumentType, string> = {
  piano: '🎹',
  guitar: '🎸',
  drum: '🥁'
};

const INSTRUMENT_NAMES: Record<InstrumentType, string> = {
  piano: '钢琴',
  guitar: '吉他',
  drum: '鼓'
};

const NOTES_ORDER = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function noteToY(note: string, staffHeight: number): number {
  const pitch = note.replace(/[0-9]/g, '');
  const octave = parseInt(note.match(/[0-9]/)?.[0] || '4');
  const noteIndex = NOTES_ORDER.indexOf(pitch);
  const totalIndex = (octave - 4) * 12 + noteIndex;
  const centerLine = staffHeight / 2;
  const lineSpacing = staffHeight / 6;
  return centerLine - (totalIndex / 2) * (lineSpacing / 2);
}

function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [nickname, setNickname] = useState('');
  const [nicknameSubmitted, setNicknameSubmitted] = useState(false);
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [newRoomName, setNewRoomName] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [myInstrument, setMyInstrument] = useState<InstrumentType>('piano');
  const [mutedUsers, setMutedUsers] = useState<Set<string>>(new Set());
  const [bpm, setBpm] = useState(120);
  const [volume, setVolume] = useState(80);
  const [notes, setNotes] = useState<NoteOnStaff[]>([]);
  const [glows, setGlows] = useState<Glow[]>([]);
  const [energyBars, setEnergyBars] = useState<EnergyBar[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [guitarFret, setGuitarFret] = useState(3);

  const staffRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const { initAudio, playNote, setVolume: setSynthVolume } = useSynth();

  useEffect(() => {
    const s = io('/', {
      transports: ['websocket', 'polling']
    });

    s.on('connect', () => {
      setIsConnected(true);
      s.emit('getRooms', (roomList: RoomInfo[]) => {
        setRooms(roomList);
      });
    });

    s.on('disconnect', () => {
      setIsConnected(false);
    });

    s.on('roomListUpdated', (roomList: RoomInfo[]) => {
      setRooms(roomList);
    });

    s.on('roomUsers', (userList: User[]) => {
      setUsers(userList);
    });

    s.on('note', (noteData: NoteEvent) => {
      if (!mutedUsers.has(noteData.userId)) {
        playNote(noteData);
      }
      addRemoteNote(noteData);
      triggerEnergyBar(noteData.userId);
    });

    s.on('reset', () => {
      setNotes([]);
    });

    setSocket(s);

    return () => {
      s.close();
    };
  }, [mutedUsers, playNote]);

  useEffect(() => {
    setSynthVolume(volume);
  }, [volume, setSynthVolume]);

  const triggerGlow = useCallback((x: number, y: number, color: string) => {
    const id = `glow-${Date.now()}-${Math.random()}`;
    setGlows(prev => [...prev, { id, x, y, color }]);
    setTimeout(() => {
      setGlows(prev => prev.filter(g => g.id !== id));
    }, 100);
  }, []);

  const triggerEnergyBar = useCallback((userId: string) => {
    const id = `energy-${Date.now()}-${Math.random()}`;
    setEnergyBars(prev => [...prev, { userId, id }]);
    setTimeout(() => {
      setEnergyBars(prev => prev.filter(e => e.id !== id));
    }, 500);
  }, []);

  const addRemoteNote = useCallback((noteData: NoteEvent) => {
    if (!staffRef.current) return;
    const staffRect = staffRef.current.getBoundingClientRect();
    const y = noteToY(noteData.note, staffRect.height);
    const id = `note-${Date.now()}-${Math.random()}`;
    
    setNotes(prev => [...prev, {
      ...noteData,
      x: staffRect.width - 50,
      y,
      id,
      createdAt: Date.now(),
      isRemote: true
    }]);

    triggerGlow(staffRect.width - 50, y, INSTRUMENT_COLORS[noteData.instrument]);
  }, [triggerGlow]);

  const addLocalNote = useCallback((note: string, instrument: InstrumentType) => {
    if (!staffRef.current || !socket) return;
    const staffRect = staffRef.current.getBoundingClientRect();
    const y = noteToY(note, staffRect.height);
    const x = staffRect.width - 50;
    const id = `note-${Date.now()}-${Math.random()}`;
    const noteData: NoteOnStaff = {
      note,
      instrument,
      userId: socket.id,
      x,
      y,
      id,
      createdAt: Date.now(),
      isRemote: false
    };

    setNotes(prev => [...prev, noteData]);
    triggerGlow(x, y, INSTRUMENT_COLORS[instrument]);
    triggerEnergyBar(socket.id);

    const event: NoteEvent = { note, instrument, userId: socket.id };
    socket.emit('note', event);
  }, [socket, triggerGlow, triggerEnergyBar]);

  useEffect(() => {
    const animate = () => {
      const speed = (bpm / 120) * 2;
      setNotes(prev => {
        const updated = prev
          .map(n => ({ ...n, x: n.x - speed }))
          .filter(n => n.x > -50);
        return updated;
      });
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [bpm]);

  const handleStaffClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!staffRef.current || !currentRoom) return;
    initAudio();

    const rect = staffRef.current.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const relativeY = clickY / rect.height;

    if (myInstrument === 'drum') {
      const drumIndex = Math.min(2, Math.floor(relativeY * 3));
      addLocalNote(DRUM_KEYS[drumIndex], myInstrument);
      return;
    }

    const staffLines = 6;
    const lineSpacing = rect.height / staffLines;
    const centerLine = rect.height / 2;
    const semitoneFromCenter = Math.round((centerLine - clickY) / (lineSpacing / 4));
    const baseNoteIndex = NOTES_ORDER.indexOf('C');
    const totalIndex = baseNoteIndex + semitoneFromCenter;
    const octave = 4 + Math.floor(totalIndex / 12);
    const pitchIndex = ((totalIndex % 12) + 12) % 12;
    const note = NOTES_ORDER[pitchIndex] + octave;

    addLocalNote(note, myInstrument);
  }, [myInstrument, currentRoom, initAudio, addLocalNote]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!currentRoom) return;
      if (e.repeat) return;
      initAudio();

      const key = e.key.toLowerCase();

      if (myInstrument === 'piano') {
        const note = PIANO_KEY_MAP[key];
        if (note) {
          e.preventDefault();
          addLocalNote(note, 'piano');
        }
      } else if (myInstrument === 'guitar') {
        const stringNum = parseInt(key);
        if (stringNum >= 1 && stringNum <= 6) {
          e.preventDefault();
          const note = getGuitarNote(stringNum - 1, guitarFret);
          addLocalNote(note, 'guitar');
        }
      } else if (myInstrument === 'drum') {
        if (key === ' ' || key === 'f' || key === 'j') {
          e.preventDefault();
          addLocalNote(key, 'drum');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [myInstrument, currentRoom, initAudio, addLocalNote, guitarFret]);

  const handleSubmitNickname = () => {
    const trimmed = nickname.trim();
    if (!trimmed || trimmed.length === 0 || trimmed.length > 8) {
      setErrorMessage('昵称不能为空且最多8个字符');
      return;
    }
    setErrorMessage('');
    setNickname(trimmed);
    setNicknameSubmitted(true);
  };

  const handleJoinRoom = (roomName: string) => {
    if (!socket) return;
    initAudio();
    socket.emit('joinRoom', { roomName, nickname }, (response: any) => {
      if (response.success) {
        setCurrentRoom(roomName);
        setUsers(response.users);
        setNotes([]);
        setErrorMessage('');
      } else {
        setErrorMessage(response.error || '加入房间失败');
      }
    });
  };

  const handleCreateRoom = () => {
    const trimmed = newRoomName.trim();
    if (!trimmed || trimmed.length === 0 || trimmed.length > 12) {
      setErrorMessage('房间名不能为空且最多12个字符');
      return;
    }
    handleJoinRoom(trimmed);
    setNewRoomName('');
  };

  const handleLeaveRoom = () => {
    if (socket) {
      socket.emit('leaveRoom');
    }
    setCurrentRoom(null);
    setNotes([]);
    setUsers([]);
  };

  const handleChangeInstrument = (inst: InstrumentType) => {
    setMyInstrument(inst);
    if (socket) {
      socket.emit('setInstrument', inst);
    }
  };

  const handleReset = () => {
    if (socket) {
      socket.emit('reset');
      setNotes([]);
    }
  };

  const toggleMute = (userId: string) => {
    setMutedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const renderStaffLines = () => {
    const lines = [];
    for (let i = 0; i < 5; i++) {
      lines.push(
        <div
          key={i}
          style={{
            position: 'absolute',
            top: `${(i + 0.5) * (100 / 6)}%`,
            left: 0,
            right: 0,
            height: 1,
            backgroundColor: '#888'
          }}
        />
      );
    }
    return lines;
  };

  if (!nicknameSubmitted) {
    return (
      <div style={styles.loginContainer}>
        <div style={styles.loginCard}>
          <h1 style={styles.loginTitle}>🎵 虚拟乐器合奏平台</h1>
          <p style={styles.loginSubtitle}>多人实时在线合奏，随时随地享受音乐</p>
          <div style={styles.statusBar}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor: isConnected ? '#4CAF50' : '#f44336',
                marginRight: 8
              }}
            />
            <span style={{ fontSize: 14, color: '#aaa' }}>
              {isConnected ? '已连接服务器' : '正在连接...'}
            </span>
          </div>
          <input
            style={styles.input}
            placeholder="请输入昵称（最多8字符）"
            value={nickname}
            onChange={e => setNickname(e.target.value.slice(0, 8))}
            onKeyDown={e => e.key === 'Enter' && handleSubmitNickname()}
            maxLength={8}
          />
          {errorMessage && <div style={styles.errorText}>{errorMessage}</div>}
          <button style={styles.primaryButton} onClick={handleSubmitNickname}>
            进入平台
          </button>
        </div>
      </div>
    );
  }

  if (!currentRoom) {
    return (
      <div style={styles.loginContainer}>
        <div style={styles.roomCard}>
          <div style={styles.roomHeader}>
            <h2 style={{ margin: 0 }}>选择排练房</h2>
            <div style={styles.statusBar}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  backgroundColor: isConnected ? '#4CAF50' : '#f44336',
                  marginRight: 8
                }}
              />
              <span style={{ fontSize: 12, color: '#aaa' }}>
                {isConnected ? '已连接' : '离线'}
              </span>
            </div>
          </div>

          <div style={styles.createRoomSection}>
            <input
              style={styles.input}
              placeholder="创建新房间（最多12字符）"
              value={newRoomName}
              onChange={e => setNewRoomName(e.target.value.slice(0, 12))}
              maxLength={12}
            />
            <button style={styles.primaryButton} onClick={handleCreateRoom}>
              创建房间
            </button>
          </div>

          {errorMessage && <div style={styles.errorText}>{errorMessage}</div>}

          <div style={styles.roomList}>
            <h3 style={{ color: '#ccc', margin: '16px 0 8px' }}>在线房间</h3>
            {rooms.length === 0 ? (
              <p style={{ color: '#888', textAlign: 'center', padding: 20 }}>
                暂无房间，创建一个开始吧！
              </p>
            ) : (
              rooms.map(room => (
                <div
                  key={room.name}
                  style={styles.roomItem}
                  onClick={() => handleJoinRoom(room.name)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 24 }}>🎶</span>
                    <span style={{ fontWeight: 600 }}>{room.name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#888' }}>{room.userCount}/6</span>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      backgroundColor: room.userCount >= 6 ? '#f44336' : '#4CAF50'
                    }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  const myUserId = socket?.id || '';

  return (
    <div style={styles.app}>
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            className="mobile-toggle-btn"
            style={styles.mobileToggleButton}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            ☰
          </button>
          <span style={{ fontSize: 24 }}>🎵</span>
          <h1 style={{ margin: 0, fontSize: 20 }}>虚拟合奏 - {currentRoom}</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: '#ccc' }}>{nickname}</span>
          <div style={styles.statusBar}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor: isConnected ? '#4CAF50' : '#f44336',
                marginRight: 6
              }}
            />
            <span style={{ fontSize: 12, color: '#aaa' }}>
              {isConnected ? '在线' : '离线'}
            </span>
          </div>
        </div>
      </div>

      <div style={styles.mainContent}>
        <div style={styles.sidebar}>
          <div style={styles.sidebarHeader}>
            <h3 style={{ margin: 0, fontSize: 16 }}>乐队成员 ({users.length}/6)</h3>
          </div>
          {users.map(user => (
            <div key={user.id} style={styles.userItem}>
              <div style={styles.userAvatar}>
                <span style={{ fontSize: 18 }}>
                  {user.nickname.charAt(0).toUpperCase()}
                </span>
                {energyBars.filter(e => e.userId === user.id).length > 0 && (
                  <div style={styles.energyBarContainer}>
                    <div style={styles.energyBar} />
                  </div>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>
                  {user.nickname}
                  {user.id === myUserId && <span style={{ color: '#888', fontSize: 12, marginLeft: 4 }}>（我）</span>}
                </div>
                <div style={{ fontSize: 12, color: INSTRUMENT_COLORS[user.instrument] }}>
                  {INSTRUMENT_ICONS[user.instrument]} {INSTRUMENT_NAMES[user.instrument]}
                </div>
              </div>
              {user.id !== myUserId && (
                <button
                  style={{
                    ...styles.iconButton,
                    opacity: mutedUsers.has(user.id) ? 0.5 : 1
                  }}
                  onClick={() => toggleMute(user.id)}
                  title={mutedUsers.has(user.id) ? '取消静音' : '静音'}
                >
                  {mutedUsers.has(user.id) ? '🔇' : '🔊'}
                </button>
              )}
            </div>
          ))}
        </div>

        <div style={styles.centerArea}>
          <div style={styles.instrumentSelector}>
            {(['piano', 'guitar', 'drum'] as InstrumentType[]).map(inst => (
              <button
                key={inst}
                style={{
                  ...styles.instrumentButton,
                  ...(myInstrument === inst ? styles.instrumentButtonActive : {})
                }}
                onClick={() => handleChangeInstrument(inst)}
              >
                <span style={{ fontSize: 24 }}>{INSTRUMENT_ICONS[inst]}</span>
                <span style={{ marginTop: 4 }}>{INSTRUMENT_NAMES[inst]}</span>
              </button>
            ))}
            {myInstrument === 'guitar' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 16 }}>
                <span style={{ fontSize: 13, color: '#ccc' }}>品柱:</span>
                <input
                  type="range"
                  min={0}
                  max={12}
                  value={guitarFret}
                  onChange={e => setGuitarFret(parseInt(e.target.value))}
                  style={{ width: 100 }}
                />
                <span style={{ fontSize: 13, color: INSTRUMENT_COLORS.guitar, minWidth: 20 }}>{guitarFret}</span>
              </div>
            )}
          </div>

          <div
            ref={staffRef}
            style={styles.staff}
            onClick={handleStaffClick}
          >
            {renderStaffLines()}
            {notes.map(note => (
              <div
                key={note.id}
                style={{
                  position: 'absolute',
                  left: note.x,
                  top: note.y,
                  transform: 'translate(-50%, -50%)',
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  backgroundColor: INSTRUMENT_COLORS[note.instrument],
                  filter: `drop-shadow(0 0 4px ${INSTRUMENT_COLORS[note.instrument]})`,
                  transition: 'none'
                }}
              />
            ))}
            {glows.map(glow => (
              <div
                key={glow.id}
                style={{
                  position: 'absolute',
                  left: glow.x,
                  top: glow.y,
                  transform: 'translate(-50%, -50%)',
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  backgroundColor: glow.color,
                  opacity: 0.3,
                  pointerEvents: 'none'
                }}
              />
            ))}
            <div style={styles.staffInstruction}>
              {myInstrument === 'piano' && '点击五线谱或按键盘 A-K / Z-M 演奏'}
              {myInstrument === 'guitar' && '点击五线谱或按数字键 1-6 演奏（调节品柱选择音高）'}
              {myInstrument === 'drum' && '点击五线谱或按 Space/F/J 演奏'}
            </div>
          </div>
        </div>
      </div>

      <div style={styles.controlPanel}>
        <div style={styles.controlGroup}>
          <span style={styles.controlLabel}>速度 {bpm} BPM</span>
          <input
            type="range"
            min={50}
            max={200}
            value={bpm}
            onChange={e => setBpm(parseInt(e.target.value))}
            style={styles.slider}
          />
        </div>
        <div style={styles.controlGroup}>
          <span style={styles.controlLabel}>音量 {volume}</span>
          <input
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={e => setVolume(parseInt(e.target.value))}
            style={styles.slider}
          />
        </div>
        <button style={styles.secondaryButton} onClick={handleReset}>
          🗑️ 清空乐谱
        </button>
        <button style={styles.dangerButton} onClick={handleLeaveRoom}>
          🚪 退出房间
        </button>
      </div>

      {mobileMenuOpen && (
        <div style={styles.mobileMenu}>
          <div style={styles.sidebarHeader}>
            <h3 style={{ margin: 0, fontSize: 16 }}>乐队成员 ({users.length}/6)</h3>
            <button
              style={styles.iconButton}
              onClick={() => setMobileMenuOpen(false)}
            >
              ✕
            </button>
          </div>
          {users.map(user => (
            <div key={user.id} style={styles.userItem}>
              <div style={styles.userAvatar}>
                <span style={{ fontSize: 18 }}>
                  {user.nickname.charAt(0).toUpperCase()}
                </span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{user.nickname}</div>
                <div style={{ fontSize: 12, color: INSTRUMENT_COLORS[user.instrument] }}>
                  {INSTRUMENT_ICONS[user.instrument]} {INSTRUMENT_NAMES[user.instrument]}
                </div>
              </div>
              {user.id !== myUserId && (
                <button
                  style={styles.iconButton}
                  onClick={() => toggleMute(user.id)}
                >
                  {mutedUsers.has(user.id) ? '🔇' : '🔊'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    width: '100vw',
    overflow: 'hidden'
  },
  loginContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: 20
  },
  loginCard: {
    background: 'rgba(22, 33, 62, 0.85)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderRadius: 16,
    padding: 40,
    maxWidth: 400,
    width: '100%',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.1)'
  },
  loginTitle: {
    fontSize: 28,
    textAlign: 'center',
    marginBottom: 8,
    background: 'linear-gradient(135deg, #e94560, #533483)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text'
  },
  loginSubtitle: {
    textAlign: 'center',
    color: '#aaa',
    marginBottom: 24,
    fontSize: 14
  },
  roomCard: {
    background: 'rgba(22, 33, 62, 0.85)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderRadius: 16,
    padding: 24,
    maxWidth: 500,
    width: '100%',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.1)'
  },
  roomHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  statusBar: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: 16,
    justifyContent: 'center'
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(15, 52, 96, 0.6)',
    color: '#fff',
    fontSize: 14,
    outline: 'none',
    marginBottom: 12,
    boxSizing: 'border-box'
  },
  primaryButton: {
    width: '100%',
    padding: '12px 24px',
    borderRadius: 8,
    border: 'none',
    background: 'linear-gradient(135deg, #e94560, #533483)',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'transform 0.2s'
  },
  secondaryButton: {
    padding: '10px 16px',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(15, 52, 96, 0.8)',
    color: '#fff',
    fontSize: 13,
    cursor: 'pointer',
    transition: 'transform 0.2s'
  },
  dangerButton: {
    padding: '10px 16px',
    borderRadius: 8,
    border: 'none',
    background: 'linear-gradient(135deg, #e94560, #c92a4a)',
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'transform 0.2s'
  },
  errorText: {
    color: '#e94560',
    fontSize: 13,
    marginBottom: 12,
    textAlign: 'center'
  },
  createRoomSection: {
    display: 'flex',
    gap: 8,
    marginBottom: 8
  },
  roomList: {
    maxHeight: 300,
    overflowY: 'auto'
  },
  roomItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderRadius: 8,
    backgroundColor: 'rgba(15, 52, 96, 0.6)',
    marginBottom: 8,
    cursor: 'pointer',
    transition: 'transform 0.2s, background-color 0.2s',
    border: '1px solid rgba(255,255,255,0.05)'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 24px',
    backgroundColor: '#16213e',
    borderBottom: '1px solid rgba(255,255,255,0.1)'
  },
  mobileToggleButton: {
    display: 'none',
    background: 'none',
    border: 'none',
    color: '#fff',
    fontSize: 24,
    cursor: 'pointer',
    padding: '4px 8px'
  },
  mainContent: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden'
  },
  sidebar: {
    width: 260,
    backgroundColor: 'rgba(15, 52, 96, 0.5)',
    borderRight: '1px solid rgba(255,255,255,0.1)',
    padding: 16,
    overflowY: 'auto'
  },
  sidebarHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  userItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 12px',
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: 'rgba(22, 33, 62, 0.8)',
    gap: 12
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #e94560, #533483)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    flexShrink: 0
  },
  energyBarContainer: {
    position: 'absolute',
    bottom: -4,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    overflow: 'hidden'
  },
  energyBar: {
    height: '100%',
    background: 'linear-gradient(90deg, #e94560, #533483)',
    animation: 'energyPulse 0.5s ease-out'
  },
  iconButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 16,
    padding: 4,
    borderRadius: 4
  },
  centerArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: 16,
    overflow: 'hidden'
  },
  instrumentSelector: {
    display: 'flex',
    gap: 12,
    marginBottom: 16,
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  instrumentButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '10px 20px',
    borderRadius: 12,
    border: '2px solid rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(15, 52, 96, 0.6)',
    color: '#ccc',
    cursor: 'pointer',
    fontSize: 13,
    minWidth: 80,
    transition: 'transform 0.15s, border-color 0.2s, background-color 0.2s'
  },
  instrumentButtonActive: {
    borderColor: '#e94560',
    backgroundColor: 'rgba(233, 69, 96, 0.2)',
    color: '#fff'
  },
  staff: {
    flex: 1,
    minHeight: 300,
    backgroundColor: '#0f3460',
    borderRadius: 12,
    position: 'relative',
    overflow: 'hidden',
    cursor: 'crosshair',
    backgroundImage: `
      repeating-linear-gradient(
        90deg,
        transparent,
        transparent 40px,
        rgba(255,255,255,0.02) 40px,
        rgba(255,255,255,0.02) 41px
      )
    `
  },
  staffInstruction: {
    position: 'absolute',
    bottom: 16,
    left: '50%',
    transform: 'translateX(-50%)',
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    pointerEvents: 'none'
  },
  controlPanel: {
    display: 'flex',
    alignItems: 'center',
    gap: 24,
    padding: '12px 24px',
    backgroundColor: '#16213e',
    borderTop: '1px solid rgba(255,255,255,0.1)',
    flexWrap: 'wrap'
  },
  controlGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 12
  },
  controlLabel: {
    fontSize: 13,
    color: '#ccc',
    minWidth: 100
  },
  slider: {
    width: 120,
    cursor: 'pointer'
  },
  mobileMenu: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15, 52, 96, 0.98)',
    backdropFilter: 'blur(10px)',
    padding: 16,
    zIndex: 100,
    maxHeight: '70vh',
    overflowY: 'auto',
    borderBottom: '1px solid rgba(255,255,255,0.1)'
  }
};

if (typeof document !== 'undefined') {
  const styleTag = document.createElement('style');
  styleTag.textContent = `
    @keyframes energyPulse {
      0% { width: 0%; }
      50% { width: 100%; }
      100% { width: 0%; }
    }
    @media (max-width: 768px) {
      .mobile-toggle-btn { display: block !important; }
    }
    input[type="range"] {
      -webkit-appearance: none;
      appearance: none;
      background: rgba(255,255,255,0.1);
      height: 6px;
      border-radius: 3px;
      outline: none;
    }
    input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: linear-gradient(135deg, #e94560, #533483);
      cursor: pointer;
    }
    input[type="range"]::-moz-range-thumb {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: linear-gradient(135deg, #e94560, #533483);
      cursor: pointer;
      border: none;
    }
    button:hover {
      transform: translateY(-2px);
    }
    button:active {
      transform: translateY(0);
    }
  `;
  document.head.appendChild(styleTag);
}

export default App;
