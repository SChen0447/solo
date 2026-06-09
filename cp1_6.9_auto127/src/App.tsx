import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import type { Track, Clip, TrackControlState, UserCursor, WaveformData, Project } from './types';
import { USER_COLORS } from './types';

const GRID_SIZE = 10;
const TRACK_HEIGHT = 80;
const CLIP_HEIGHT = 60;
const PIXELS_PER_SECOND = 100;

function generateWaveform(duration: number): WaveformData {
  const samples: number[] = [];
  const sampleCount = Math.floor(duration * 100);
  for (let i = 0; i < sampleCount; i++) {
    const t = i / sampleCount;
    samples.push(
      (Math.sin(t * Math.PI * 8) * 0.3 +
        Math.sin(t * Math.PI * 16 + 0.5) * 0.2 +
        Math.sin(t * Math.PI * 4 + 1) * 0.4 +
        (Math.random() - 0.5) * 0.1) *
        (1 - Math.abs(t - 0.5) * 1.5)
    );
  }
  return { samples, sampleRate: 100 };
}

function generateRandomColor(): string {
  const hue = 120 + Math.random() * 180;
  return `hsl(${hue}, 70%, 55%)`;
}

function snapToGrid(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

export default function App() {
  const [tracks, setTracks] = useState<Track[]>(() => [
    { id: 'track-1', name: '音轨 1', controlState: 'normal', color: '#e8e8e8' },
    { id: 'track-2', name: '音轨 2', controlState: 'normal', color: '#d0d0d0' },
    { id: 'track-3', name: '音轨 3', controlState: 'normal', color: '#c0c0c0' },
    { id: 'track-4', name: '音轨 4', controlState: 'normal', color: '#b0b0b0' },
  ]);
  const [clips, setClips] = useState<Clip[]>([]);
  const [bpm, setBpm] = useState(120);
  const [globalVolume, setGlobalVolume] = useState(0.8);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playheadPosition, setPlayheadPosition] = useState(0);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [sidePanelOpen, setSidePanelOpen] = useState(true);
  const [editingClip, setEditingClip] = useState<Clip | null>(null);
  const [waveformSelection, setWaveformSelection] = useState<{ start: number; end: number } | null>(null);
  const [copiedWaveform, setCopiedWaveform] = useState<WaveformData | null>(null);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [loadId, setLoadId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [cursors, setCursors] = useState<UserCursor[]>([]);
  const [myUserId, setMyUserId] = useState<string>('');
  const [myUserColor, setMyUserColor] = useState<string>(USER_COLORS[0]);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  const socketRef = useRef<Socket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const playStartTimeRef = useRef<number>(0);
  const rafRef = useRef<number>(0);
  const timelineRef = useRef<HTMLDivElement>(null);
  const cursorTrailRef = useRef<{ x: number; y: number }[]>([]);
  const draggingClipRef = useRef<{ clipId: string; offsetX: number; startX: number } | null>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);
  const isSelectingRef = useRef(false);
  const selectionStartRef = useRef<number>(0);
  const sourcesRef = useRef<Map<string, AudioBufferSourceNode>>(new Map());

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const socket = io('http://localhost:3001', { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to server');
    });

    socket.on('user-connected', (data: { id: string; color: string; name: string }) => {
      setMyUserId(data.id);
      setMyUserColor(data.color);
    });

    socket.on('cursor-update', (data: UserCursor) => {
      setCursors((prev) => {
        const filtered = prev.filter((c) => c.id !== data.id);
        return [...filtered, data];
      });
    });

    socket.on('user-disconnected', (userId: string) => {
      setCursors((prev) => prev.filter((c) => c.id !== userId));
    });

    socket.on('clip-created', (clip: Clip) => {
      setClips((prev) => [...prev.filter((c) => c.id !== clip.id), clip]);
    });

    socket.on('clip-deleted', (clipId: string) => {
      setClips((prev) => prev.filter((c) => c.id !== clipId));
    });

    socket.on('clip-moved', (data: { clipId: string; startTime: number; trackId: string }) => {
      setClips((prev) =>
        prev.map((c) =>
          c.id === data.clipId ? { ...c, startTime: data.startTime, trackId: data.trackId } : c
        )
      );
    });

    socket.on('clip-updated', (data: { clipId: string; waveform: WaveformData }) => {
      setClips((prev) => prev.map((c) => (c.id === data.clipId ? { ...c, waveform: data.waveform } : c)));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleTimelineMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!timelineRef.current) return;
      const rect = timelineRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      cursorTrailRef.current = [{ x, y }, ...cursorTrailRef.current.slice(0, 15)];

      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('cursor-move', {
          x,
          y,
          trail: cursorTrailRef.current,
        });
      }
    },
    []
  );

  const getControlColor = (state: TrackControlState): string => {
    switch (state) {
      case 'mute':
        return '#ff4d4d';
      case 'solo':
        return '#4caf50';
      case 'record':
        return '#2196f3';
      default:
        return '#555555';
    }
  };

  const cycleControlState = (trackId: string) => {
    const states: TrackControlState[] = ['normal', 'mute', 'solo', 'record'];
    setTracks((prev) =>
      prev.map((t) => {
        if (t.id === trackId) {
          const idx = states.indexOf(t.controlState);
          return { ...t, controlState: states[(idx + 1) % states.length] };
        }
        return t;
      })
    );
  };

  const handleTrackClick = (e: React.MouseEvent, trackId: string) => {
    if ((e.target as HTMLElement).closest('.clip-element')) return;
    if ((e.target as HTMLElement).closest('.track-control-btn')) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    let startX = e.clientX - rect.left;
    const duration = 1 + Math.random() * 2;
    const clipWidth = duration * PIXELS_PER_SECOND;

    startX = snapToGrid(Math.max(0, startX - clipWidth / 2));

    const newClip: Clip = {
      id: uuidv4(),
      trackId,
      startTime: startX / PIXELS_PER_SECOND,
      duration,
      color: generateRandomColor(),
      waveform: generateWaveform(duration),
    };

    setClips((prev) => [...prev, newClip]);

    if (socketRef.current) {
      socketRef.current.emit('clip-create', newClip);
    }
  };

  const handleClipMouseDown = (e: React.MouseEvent, clip: Clip) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    draggingClipRef.current = {
      clipId: clip.id,
      offsetX,
      startX: e.clientX,
    };

    const handleMouseMove = (me: MouseEvent) => {
      if (!draggingClipRef.current || !timelineRef.current) return;
      const timelineRect = timelineRef.current.getBoundingClientRect();
      let newX = me.clientX - timelineRect.left - draggingClipRef.current.offsetX;
      newX = snapToGrid(Math.max(0, newX));

      setClips((prev) =>
        prev.map((c) => (c.id === draggingClipRef.current!.clipId ? { ...c, startTime: newX / PIXELS_PER_SECOND } : c))
      );
    };

    const handleMouseUp = (me: MouseEvent) => {
      if (!draggingClipRef.current || !timelineRef.current) return;
      const clip = clips.find((c) => c.id === draggingClipRef.current!.clipId);
      if (clip && socketRef.current) {
        socketRef.current.emit('clip-move', {
          clipId: clip.id,
          startTime: clip.startTime,
          trackId: clip.trackId,
        });
      }
      draggingClipRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleClipDoubleClick = (e: React.MouseEvent, clip: Clip) => {
    e.stopPropagation();
    setEditingClip(clip);
    setWaveformSelection(null);
  };

  const deleteClip = (clipId: string) => {
    setClips((prev) => prev.filter((c) => c.id !== clipId));
    if (socketRef.current) {
      socketRef.current.emit('clip-delete', clipId);
    }
  };

  useEffect(() => {
    if (!editingClip || !waveformCanvasRef.current) return;

    const canvas = waveformCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      const samples = editingClip.waveform.samples;
      const stepX = canvas.width / samples.length;
      const centerY = canvas.height / 2;
      for (let i = 0; i < samples.length; i++) {
        const x = i * stepX;
        const y = centerY - samples[i] * (canvas.height / 2 - 10);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      if (waveformSelection) {
        const startX = (waveformSelection.start / editingClip.waveform.samples.length) * canvas.width;
        const endX = (waveformSelection.end / editingClip.waveform.samples.length) * canvas.width;
        ctx.fillStyle = 'rgba(255, 152, 0, 0.4)';
        ctx.fillRect(Math.min(startX, endX), 0, Math.abs(endX - startX), canvas.height);
      }
    };

    render();
  }, [editingClip, waveformSelection]);

  const handleWaveformMouseDown = (e: React.MouseEvent) => {
    if (!editingClip || !waveformCanvasRef.current) return;
    const rect = waveformCanvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const sampleIdx = Math.floor((x / rect.width) * editingClip.waveform.samples.length);
    isSelectingRef.current = true;
    selectionStartRef.current = sampleIdx;
    setWaveformSelection({ start: sampleIdx, end: sampleIdx });
  };

  const handleWaveformMouseMove = (e: React.MouseEvent) => {
    if (!isSelectingRef.current || !editingClip || !waveformCanvasRef.current) return;
    const rect = waveformCanvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const sampleIdx = Math.floor((x / rect.width) * editingClip.waveform.samples.length);
    setWaveformSelection({ start: selectionStartRef.current, end: sampleIdx });
  };

  const handleWaveformMouseUp = () => {
    isSelectingRef.current = false;
  };

  useEffect(() => {
    if (!editingClip) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && waveformSelection && editingClip) {
        const start = Math.min(waveformSelection.start, waveformSelection.end);
        const end = Math.max(waveformSelection.start, waveformSelection.end);
        const newSamples = [
          ...editingClip.waveform.samples.slice(0, start),
          ...editingClip.waveform.samples.slice(end),
        ];
        const newDuration = newSamples.length / editingClip.waveform.sampleRate;
        const newWaveform: WaveformData = { ...editingClip.waveform, samples: newSamples };
        const updatedClip = { ...editingClip, waveform: newWaveform, duration: newDuration };

        setClips((prev) => prev.map((c) => (c.id === updatedClip.id ? updatedClip : c)));
        setEditingClip(updatedClip);
        setWaveformSelection(null);

        if (socketRef.current) {
          socketRef.current.emit('clip-update', { clipId: updatedClip.id, waveform: newWaveform });
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && waveformSelection && editingClip) {
        const start = Math.min(waveformSelection.start, waveformSelection.end);
        const end = Math.max(waveformSelection.start, waveformSelection.end);
        setCopiedWaveform({
          ...editingClip.waveform,
          samples: editingClip.waveform.samples.slice(start, end),
        });
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && copiedWaveform && editingClip) {
        const insertIdx = waveformSelection ? Math.min(waveformSelection.start, waveformSelection.end) : 0;
        const newSamples = [
          ...editingClip.waveform.samples.slice(0, insertIdx),
          ...copiedWaveform.samples,
          ...editingClip.waveform.samples.slice(insertIdx),
        ];
        const newDuration = newSamples.length / editingClip.waveform.sampleRate;
        const newWaveform: WaveformData = { ...editingClip.waveform, samples: newSamples };
        const updatedClip = { ...editingClip, waveform: newWaveform, duration: newDuration };

        setClips((prev) => prev.map((c) => (c.id === updatedClip.id ? updatedClip : c)));
        setEditingClip(updatedClip);

        if (socketRef.current) {
          socketRef.current.emit('clip-update', { clipId: updatedClip.id, waveform: newWaveform });
        }
      }

      if (e.key === 'Escape') {
        setEditingClip(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingClip, waveformSelection, copiedWaveform]);

  const playAudio = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const gainNode = ctx.createGain();
    gainNode.gain.value = globalVolume;
    gainNode.connect(ctx.destination);

    const now = ctx.currentTime;
    const startTime = playheadPosition;

    sourcesRef.current.forEach((src) => {
      try {
        src.stop();
      } catch (e) {}
    });
    sourcesRef.current.clear();

    const soloTracks = tracks.filter((t) => t.controlState === 'solo');
    const hasSolo = soloTracks.length > 0;

    clips.forEach((clip) => {
      const track = tracks.find((t) => t.id === clip.trackId);
      if (!track) return;
      if (track.controlState === 'mute') return;
      if (hasSolo && track.controlState !== 'solo') return;

      if (clip.startTime + clip.duration < startTime) return;

      const buffer = ctx.createBuffer(1, Math.floor(clip.waveform.samples.length * 4.41), 44100);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        const sampleIdx = Math.floor((i / data.length) * clip.waveform.samples.length);
        data[i] = clip.waveform.samples[sampleIdx] || 0;
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(gainNode);

      const clipStart = clip.startTime;
      const playStart = Math.max(0, startTime - clipStart);
      const when = now + Math.max(0, clipStart - startTime);
      const playDuration = Math.max(0, clip.duration - playStart);

      if (playDuration > 0) {
        try {
          source.start(when, playStart, playDuration);
          sourcesRef.current.set(clip.id, source);
        } catch (e) {}
      }
    });

    playStartTimeRef.current = performance.now();
  }, [clips, tracks, globalVolume, playheadPosition]);

  const stopAudio = useCallback(() => {
    sourcesRef.current.forEach((src) => {
      try {
        src.stop();
      } catch (e) {}
    });
    sourcesRef.current.clear();
  }, []);

  const togglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      stopAudio();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    } else {
      setIsPlaying(true);
      playAudio();
      const startPerf = performance.now();
      const startPos = playheadPosition;
      const animate = () => {
        const elapsed = (performance.now() - startPerf) / 1000;
        const newPos = startPos + elapsed;
        setPlayheadPosition(newPos);
        const maxTime = clips.reduce((m, c) => Math.max(m, c.startTime + c.duration), 0);
        if (newPos >= maxTime + 2) {
          setIsPlaying(false);
          setPlayheadPosition(0);
          stopAudio();
          return;
        }
        rafRef.current = requestAnimationFrame(animate);
      };
      rafRef.current = requestAnimationFrame(animate);
    }
  };

  const handleStop = () => {
    setIsPlaying(false);
    setPlayheadPosition(0);
    stopAudio();
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  };

  const handleSave = async () => {
    setIsLoading(true);
    const project: Project = {
      tracks,
      clips,
      bpm,
      globalVolume,
    };
    try {
      const response = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(project),
      });
      const data = await response.json();
      if (data.success) {
        setSaveMessage(`工程已保存，ID: ${data.projectId}`);
        setTimeout(() => setSaveMessage(null), 3000);
      }
    } catch (e) {
      setSaveMessage('保存失败');
      setTimeout(() => setSaveMessage(null), 3000);
    }
    setIsLoading(false);
    setActiveMenu(null);
  };

  const handleLoad = async () => {
    if (!loadId) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/load?projectId=${loadId}`);
      const data = await response.json();
      if (data.success) {
        setTracks(data.data.tracks);
        setClips(data.data.clips);
        setBpm(data.data.bpm);
        setGlobalVolume(data.data.globalVolume);
        setShowLoadDialog(false);
        setLoadId('');
      }
    } catch (e) {
      setSaveMessage('加载失败');
      setTimeout(() => setSaveMessage(null), 3000);
    }
    setIsLoading(false);
    setActiveMenu(null);
  };

  const maxTimelineWidth = useMemo(() => {
    const maxTime = clips.reduce((m, c) => Math.max(m, c.startTime + c.duration), 10);
    return Math.max(2000, maxTime * PIXELS_PER_SECOND + 200);
  }, [clips]);

  if (windowWidth < 1024) {
    return (
      <div style={styles.smallScreen}>
        <h1 style={{ color: '#00e5ff', marginBottom: 20 }}>请使用更大屏幕</h1>
        <p>本应用需要至少 1024px 宽度的浏览器窗口</p>
      </div>
    );
  }

  return (
    <div style={styles.app}>
      <div style={styles.menuBar}>
        <div style={{ display: 'flex', gap: 0 }}>
          {['文件', '编辑', '视图'].map((menu) => (
            <div key={menu} style={{ position: 'relative' }}>
              <button
                style={{
                  ...styles.menuButton,
                  ...(activeMenu === menu ? styles.menuButtonActive : {}),
                }}
                onClick={() => setActiveMenu(activeMenu === menu ? null : menu)}
                onMouseEnter={() => activeMenu && setActiveMenu(menu)}
              >
                {menu}
              </button>
              {activeMenu === menu && (
                <div style={styles.dropdown} onMouseLeave={() => setActiveMenu(null)}>
                  {menu === '文件' && (
                    <>
                      <button style={styles.dropdownItem} onClick={handleSave}>
                        💾 保存工程
                      </button>
                      <button style={styles.dropdownItem} onClick={() => { setShowLoadDialog(true); setActiveMenu(null); }}>
                        📂 加载工程
                      </button>
                    </>
                  )}
                  {menu === '编辑' && (
                    <>
                      <button style={styles.dropdownItem} onClick={() => { setClips([]); setActiveMenu(null); }}>
                        清空所有音频块
                      </button>
                    </>
                  )}
                  {menu === '视图' && (
                    <>
                      <button style={styles.dropdownItem} onClick={() => { setSidePanelOpen((v) => !v); setActiveMenu(null); }}>
                        {sidePanelOpen ? '隐藏' : '显示'}音轨控制面板
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginRight: 16 }}>
          {saveMessage && <span style={{ color: '#4caf50', fontSize: 13 }}>{saveMessage}</span>}
          <span style={{ color: myUserColor, fontSize: 13 }}>用户ID: {myUserId.slice(0, 6)}</span>
        </div>
      </div>

      <div style={styles.mainContent}>
        <div
          ref={timelineRef}
          style={styles.timeline}
          onMouseMove={handleTimelineMouseMove}
          onClick={() => setActiveMenu(null)}
        >
          <div style={{ ...styles.ruler, width: maxTimelineWidth }}>
            {Array.from({ length: Math.ceil(maxTimelineWidth / 100) }).map((_, i) => (
              <div key={i} style={styles.rulerMark}>
                <span style={styles.rulerText}>{i}s</span>
              </div>
            ))}
          </div>

          <div style={{ position: 'relative', width: maxTimelineWidth }}>
            {tracks.map((track, idx) => (
              <div
                key={track.id}
                style={{
                  ...styles.track,
                  height: TRACK_HEIGHT,
                  background: idx % 2 === 0 ? '#e8e8e8' : '#b0b0b0',
                }}
                onClick={(e) => handleTrackClick(e, track.id)}
              >
                {clips
                  .filter((c) => c.trackId === track.id)
                  .map((clip) => (
                    <div
                      key={clip.id}
                      className="clip-element"
                      style={{
                        ...styles.clip,
                        left: clip.startTime * PIXELS_PER_SECOND,
                        width: clip.duration * PIXELS_PER_SECOND,
                        height: CLIP_HEIGHT,
                        background: clip.color,
                      }}
                      onMouseDown={(e) => handleClipMouseDown(e, clip)}
                      onDoubleClick={(e) => handleClipDoubleClick(e, clip)}
                    >
                      <svg width="100%" height="100%" viewBox={`0 0 ${clip.duration * PIXELS_PER_SECOND} ${CLIP_HEIGHT}`}>
                        <polyline
                          fill="none"
                          stroke="rgba(255,255,255,0.8)"
                          strokeWidth="1"
                          points={clip.waveform.samples
                            .map((s, i) => {
                              const x = (i / clip.waveform.samples.length) * clip.duration * PIXELS_PER_SECOND;
                              const y = CLIP_HEIGHT / 2 - s * (CLIP_HEIGHT / 2 - 5);
                              return `${x},${y}`;
                            })
                            .join(' ')}
                        />
                      </svg>
                      <button
                        style={styles.clipDelete}
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteClip(clip.id);
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
              </div>
            ))}

            {isPlaying && (
              <div
                style={{
                  ...styles.playhead,
                  left: playheadPosition * PIXELS_PER_SECOND,
                  height: tracks.length * TRACK_HEIGHT,
                }}
              />
            )}

            {cursors.map((cursor) => (
              <div key={cursor.id} style={styles.cursorContainer}>
                {cursor.trail?.map((p, i) => (
                  <div
                    key={i}
                    style={{
                      position: 'absolute',
                      left: p.x,
                      top: p.y,
                      width: 8 - i * 0.3,
                      height: 8 - i * 0.3,
                      borderRadius: '50%',
                      background: cursor.color,
                      opacity: 0.5 - i * 0.03,
                      pointerEvents: 'none',
                    }}
                  />
                ))}
                <div
                  style={{
                    ...styles.remoteCursor,
                    left: cursor.x,
                    top: cursor.y,
                    borderColor: cursor.color,
                  }}
                >
                  <span style={{ ...styles.cursorLabel, background: cursor.color }}>{cursor.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            ...styles.sidePanel,
            width: sidePanelOpen ? 200 : 0,
            opacity: sidePanelOpen ? 1 : 0,
          }}
        >
          <div style={{ padding: 16 }}>
            <h3 style={styles.sidePanelTitle}>音轨控制</h3>
            {tracks.map((track, idx) => (
              <div key={track.id} style={styles.sideTrackItem}>
                <button
                  className="track-control-btn"
                  style={{
                    ...styles.trackControlBtn,
                    background: getControlColor(track.controlState),
                  }}
                  onClick={() => cycleControlState(track.id)}
                  title={track.controlState}
                />
                <div style={{ flex: 1, marginLeft: 8 }}>
                  <div style={styles.sideTrackName}>{track.name}</div>
                  <div style={styles.sideTrackState}>
                    {track.controlState === 'normal' && '正常'}
                    {track.controlState === 'mute' && '静音'}
                    {track.controlState === 'solo' && '独奏'}
                    {track.controlState === 'record' && '录音'}
                  </div>
                </div>
              </div>
            ))}
            <div style={styles.sideInfo}>
              <p style={styles.sideInfoText}>提示：</p>
              <ul style={styles.sideInfoList}>
                <li>点击轨道空白处添加音频块</li>
                <li>双击音频块编辑波形</li>
                <li>拖拽音频块调整位置</li>
                <li>Delete键删除选中波形</li>
                <li>Ctrl+C/V复制粘贴波形</li>
              </ul>
            </div>
          </div>
        </div>

        <button
          style={{
            ...styles.sidePanelToggle,
            right: sidePanelOpen ? 200 : 0,
          }}
          onClick={() => setSidePanelOpen((v) => !v)}
        >
          {sidePanelOpen ? '›' : '‹'}
        </button>
      </div>

      <div style={styles.playbackBar}>
        <button style={{ ...styles.playBtn, background: isPlaying ? '#4caf50' : '#757575' }} onClick={togglePlay}>
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button style={{ ...styles.playBtn, background: '#f44336' }} onClick={handleStop}>
          ⏹
        </button>

        <div style={styles.volumeContainer}>
          <span style={styles.controlLabel}>音量</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={globalVolume}
            onChange={(e) => setGlobalVolume(parseFloat(e.target.value))}
            style={styles.volumeSlider}
          />
          <span style={styles.valueText}>{Math.round(globalVolume * 100)}%</span>
        </div>

        <div style={styles.bpmContainer}>
          <span style={styles.controlLabel}>BPM</span>
          <button style={styles.bpmBtn} onClick={() => setBpm((b) => Math.max(60, b - 1))}>
            −
          </button>
          <input
            type="number"
            min={60}
            max={200}
            step={1}
            value={bpm}
            onChange={(e) => setBpm(Math.max(60, Math.min(200, parseInt(e.target.value) || 60)))}
            style={styles.bpmInput}
          />
          <button style={styles.bpmBtn} onClick={() => setBpm((b) => Math.min(200, b + 1))}>
            +
          </button>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={styles.timeText}>
            {playheadPosition.toFixed(2)}s
          </span>
        </div>
      </div>

      {editingClip && (
        <div style={styles.modalOverlay} onClick={() => setEditingClip(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={{ color: '#00e5ff' }}>波形编辑器</h3>
              <button style={styles.modalClose} onClick={() => setEditingClip(null)}>
                ×
              </button>
            </div>
            <canvas
              ref={waveformCanvasRef}
              width={800}
              height={200}
              style={styles.waveformCanvas}
              onMouseDown={handleWaveformMouseDown}
              onMouseMove={handleWaveformMouseMove}
              onMouseUp={handleWaveformMouseUp}
              onMouseLeave={handleWaveformMouseUp}
            />
            <div style={styles.modalFooter}>
              <span style={styles.helpText}>
                拖拽选择波形区域 | Delete删除 | Ctrl+C复制 | Ctrl+V粘贴 | Esc关闭
              </span>
              <button style={styles.primaryBtn} onClick={() => setEditingClip(null)}>
                完成
              </button>
            </div>
          </div>
        </div>
      )}

      {showLoadDialog && (
        <div style={styles.modalOverlay} onClick={() => setShowLoadDialog(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={{ color: '#00e5ff' }}>加载工程</h3>
              <button style={styles.modalClose} onClick={() => setShowLoadDialog(false)}>
                ×
              </button>
            </div>
            <div style={{ padding: 20 }}>
              <label style={styles.labelText}>请输入工程ID：</label>
              <input
                type="text"
                value={loadId}
                onChange={(e) => setLoadId(e.target.value)}
                placeholder="例如: a3x9k2"
                style={styles.textInput}
              />
            </div>
            <div style={styles.modalFooter}>
              <button style={styles.secondaryBtn} onClick={() => setShowLoadDialog(false)}>
                取消
              </button>
              <button style={styles.primaryBtn} onClick={handleLoad}>
                加载
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div style={styles.loadingOverlay}>
          <div style={styles.spinner} />
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    width: '100vw',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: '#121212',
    color: '#e0e0e0',
    overflow: 'hidden',
  },
  smallScreen: {
    width: '100vw',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#121212',
    color: '#e0e0e0',
  },
  menuBar: {
    height: 40,
    background: '#1e1e1e',
    borderBottom: '1px solid #333',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
  },
  menuButton: {
    background: 'transparent',
    border: 'none',
    color: '#e0e0e0',
    padding: '0 16px',
    height: 40,
    cursor: 'pointer',
    fontSize: 14,
    transition: 'background 0.2s',
  },
  menuButtonActive: {
    background: '#333333',
  },
  dropdown: {
    position: 'absolute',
    top: 40,
    left: 0,
    background: '#1e1e1e',
    border: '1px solid #333',
    minWidth: 160,
    zIndex: 100,
    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
  },
  dropdownItem: {
    display: 'block',
    width: '100%',
    padding: '10px 16px',
    background: 'transparent',
    border: 'none',
    color: '#e0e0e0',
    textAlign: 'left',
    cursor: 'pointer',
    fontSize: 14,
    transition: 'background 0.2s',
  },
  mainContent: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
    position: 'relative',
  },
  timeline: {
    flex: 1,
    overflow: 'auto',
    background: '#1a1a1a',
    position: 'relative',
  },
  ruler: {
    height: 28,
    background: '#252525',
    borderBottom: '1px solid #333',
    display: 'flex',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  rulerMark: {
    width: 100,
    borderLeft: '1px solid #444',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rulerText: {
    fontSize: 11,
    color: '#888',
  },
  track: {
    width: '100%',
    borderBottom: '1px solid rgba(0,0,0,0.1)',
    position: 'relative',
    cursor: 'crosshair',
    display: 'flex',
    alignItems: 'center',
  },
  clip: {
    position: 'absolute',
    top: (TRACK_HEIGHT - CLIP_HEIGHT) / 2,
    borderRadius: 4,
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    cursor: 'grab',
    overflow: 'hidden',
    transition: 'box-shadow 0.15s',
  },
  clipDelete: {
    position: 'absolute',
    top: 2,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: '50%',
    background: 'rgba(0,0,0,0.5)',
    border: 'none',
    color: 'white',
    cursor: 'pointer',
    fontSize: 14,
    lineHeight: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0,
    transition: 'opacity 0.15s',
  },
  trackControlBtn: {
    width: 24,
    height: 24,
    borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.3)',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'transform 0.1s',
  },
  sidePanel: {
    background: '#1e1e1e',
    borderLeft: '1px solid #333',
    overflow: 'hidden',
    transition: 'width 0.3s ease, opacity 0.3s ease',
    flexShrink: 0,
  },
  sidePanelToggle: {
    position: 'absolute',
    top: '50%',
    width: 20,
    height: 60,
    background: '#2a2a2a',
    border: '1px solid #444',
    borderRight: 'none',
    color: '#00e5ff',
    fontSize: 20,
    cursor: 'pointer',
    transform: 'translateY(-50%)',
    transition: 'right 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  sidePanelTitle: {
    color: '#00e5ff',
    fontSize: 16,
    marginBottom: 16,
    borderBottom: '1px solid #333',
    paddingBottom: 8,
  },
  sideTrackItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 0',
    borderBottom: '1px solid #2a2a2a',
  },
  sideTrackName: {
    fontSize: 13,
    color: '#e0e0e0',
  },
  sideTrackState: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  sideInfo: {
    marginTop: 20,
    padding: 12,
    background: '#252525',
    borderRadius: 6,
  },
  sideInfoText: {
    fontSize: 12,
    color: '#00e5ff',
    marginBottom: 8,
  },
  sideInfoList: {
    fontSize: 11,
    color: '#aaa',
    paddingLeft: 16,
    lineHeight: 1.8,
  },
  playbackBar: {
    height: 60,
    background: '#1e1e1e',
    borderTop: '1px solid #333',
    display: 'flex',
    alignItems: 'center',
    padding: '0 20px',
    gap: 20,
    flexShrink: 0,
  },
  playBtn: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    border: 'none',
    color: 'white',
    fontSize: 16,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.1s, box-shadow 0.1s',
    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
  },
  volumeContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  controlLabel: {
    fontSize: 13,
    color: '#aaa',
  },
  volumeSlider: {
    width: 200,
    height: 6,
    borderRadius: 3,
    appearance: 'none',
    WebkitAppearance: 'none',
    background: 'linear-gradient(to right, #2196f3, #f44336)',
    outline: 'none',
    cursor: 'pointer',
  },
  valueText: {
    fontSize: 12,
    color: '#888',
    minWidth: 36,
  },
  bpmContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  bpmBtn: {
    width: 28,
    height: 28,
    borderRadius: 4,
    background: '#333',
    border: '1px solid #444',
    color: '#e0e0e0',
    cursor: 'pointer',
    fontSize: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.15s',
  },
  bpmInput: {
    width: 60,
    height: 28,
    background: '#121212',
    border: '1px solid #444',
    borderRadius: 4,
    color: '#e0e0e0',
    textAlign: 'center',
    fontSize: 14,
    outline: 'none',
  },
  timeText: {
    fontSize: 14,
    color: '#00e5ff',
    fontFamily: 'monospace',
  },
  playhead: {
    position: 'absolute',
    top: 0,
    width: 2,
    background: '#00e5ff',
    pointerEvents: 'none',
    zIndex: 5,
    boxShadow: '0 0 8px #00e5ff',
  },
  cursorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: 20,
  },
  remoteCursor: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderLeft: '8px solid transparent',
    borderBottom: '8px solid transparent',
    pointerEvents: 'none',
  },
  cursorLabel: {
    position: 'absolute',
    top: 8,
    left: 0,
    fontSize: 10,
    color: 'white',
    padding: '2px 6px',
    borderRadius: 3,
    whiteSpace: 'nowrap',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContent: {
    background: '#1e1e1e',
    border: '1px solid #333',
    borderRadius: 8,
    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
    minWidth: 400,
  },
  modalHeader: {
    padding: '14px 20px',
    borderBottom: '1px solid #333',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalClose: {
    background: 'transparent',
    border: 'none',
    color: '#aaa',
    fontSize: 24,
    cursor: 'pointer',
    lineHeight: 1,
  },
  modalFooter: {
    padding: '14px 20px',
    borderTop: '1px solid #333',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  waveformCanvas: {
    display: 'block',
    margin: 20,
    cursor: 'crosshair',
    borderRadius: 4,
  },
  helpText: {
    fontSize: 12,
    color: '#888',
  },
  primaryBtn: {
    padding: '8px 20px',
    background: '#00e5ff',
    border: 'none',
    borderRadius: 4,
    color: '#121212',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: 14,
    transition: 'transform 0.1s',
  },
  secondaryBtn: {
    padding: '8px 20px',
    background: '#333',
    border: '1px solid #444',
    borderRadius: 4,
    color: '#e0e0e0',
    cursor: 'pointer',
    fontSize: 14,
    transition: 'background 0.15s',
  },
  labelText: {
    display: 'block',
    fontSize: 13,
    color: '#aaa',
    marginBottom: 8,
  },
  textInput: {
    width: '100%',
    padding: '10px 12px',
    background: '#121212',
    border: '1px solid #444',
    borderRadius: 4,
    color: '#e0e0e0',
    fontSize: 14,
    outline: 'none',
  },
  loadingOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
  },
  spinner: {
    width: 30,
    height: 30,
    borderRadius: '50%',
    border: '3px solid rgba(0, 229, 255, 0.2)',
    borderTopColor: '#00e5ff',
    animation: 'spin 0.8s linear infinite',
  },
};

const globalStyles = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  .clip-element:hover button { opacity: 1 !important; }
  .clip-element:active { cursor: grabbing; }
  button:hover { transform: translateY(-2px); }
  button:active { transform: scale(0.95); }
  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #e0e0e0;
    cursor: pointer;
    box-shadow: 0 1px 4px rgba(0,0,0,0.4);
  }
  input[type="range"]::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #e0e0e0;
    cursor: pointer;
    border: none;
    box-shadow: 0 1px 4px rgba(0,0,0,0.4);
  }
`;

if (typeof document !== 'undefined') {
  const styleEl = document.createElement('style');
  styleEl.textContent = globalStyles;
  document.head.appendChild(styleEl);
}
