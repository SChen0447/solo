import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as Tone from 'tone';

interface Point {
  x: number;
  y: number;
  time: number;
}

interface Note {
  note: string;
  startTime: number;
  duration: number;
  pitch: number;
}

interface Stroke {
  points: Point[];
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 300;
const MIN_PITCH = 60;
const MAX_PITCH = 83;
const TOTAL_PITCHES = MAX_PITCH - MIN_PITCH + 1;
const NOTE_HEIGHT = 18;
const ROLL_LABEL_WIDTH = 60;

const NOTE_NAMES_ORDER = [
  'C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4', 'G#4', 'A4', 'A#4', 'B4',
  'C5', 'C#5', 'D5', 'D#5', 'E5', 'F5', 'F#5', 'G5', 'G#5', 'A5', 'A#5', 'B5',
];

function getNoteColor(pitch: number): string {
  const t = (pitch - MIN_PITCH) / (MAX_PITCH - MIN_PITCH);
  const r = Math.round(33 + (244 - 33) * t);
  const g = Math.round(150 + (67 - 150) * t);
  const b = Math.round(243 + (54 - 243) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rollCanvasRef = useRef<HTMLCanvasElement>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [activeNoteIndex, setActiveNoteIndex] = useState<number>(-1);
  const startTimeRef = useRef<number>(0);
  const synthRef = useRef<Tone.PolySynth | null>(null);
  const playbackRafRef = useRef<number | null>(null);
  const scheduledEventsRef = useRef<number[]>([]);

  useEffect(() => {
    synthRef.current = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 0.8 },
    }).toDestination();
    synthRef.current.volume.value = -6;

    return () => {
      if (synthRef.current) {
        synthRef.current.dispose();
      }
    };
  }, []);

  const drawStaff = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.strokeStyle = '#C0C0C0';
    ctx.lineWidth = 1.5;
    const startY = 60;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(0, startY + i * 30);
      ctx.lineTo(CANVAS_WIDTH, startY + i * 30);
      ctx.stroke();
    }
  }, []);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    drawStaff(ctx);

    ctx.globalAlpha = 0.7;
    ctx.strokeStyle = '#FF6B6B';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const allStrokes = [...strokes];
    if (currentStroke.length > 0) {
      allStrokes.push({ points: currentStroke });
    }

    for (const stroke of allStrokes) {
      if (stroke.points.length < 2) {
        if (stroke.points.length === 1) {
          ctx.beginPath();
          ctx.arc(stroke.points[0].x, stroke.points[0].y, 2, 0, Math.PI * 2);
          ctx.fillStyle = '#FF6B6B';
          ctx.fill();
        }
        continue;
      }
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1.0;

    if (notes.length > 0) {
      const totalDuration = getTotalDuration();
      for (const note of notes) {
        const x = (note.startTime / totalDuration) * CANVAS_WIDTH;
        const y = CANVAS_HEIGHT - ((note.pitch - MIN_PITCH) / (MAX_PITCH - MIN_PITCH)) * CANVAS_HEIGHT;
        const clampedX = Math.max(10, Math.min(CANVAS_WIDTH - 10, x));

        ctx.beginPath();
        ctx.arc(clampedX, y, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#4ECDC4';
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 14px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(note.note, clampedX, y - 18);
      }
    }
  }, [strokes, currentStroke, notes, drawStaff]);

  const getTotalDuration = useCallback(() => {
    if (notes.length === 0) return 1;
    const lastNote = notes.reduce((max, n) => Math.max(max, n.startTime + n.duration), 0);
    return Math.max(1, lastNote + 0.5);
  }, [notes]);

  const drawPianoRoll = useCallback(() => {
    const canvas = rollCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rollWidth = canvas.width;
    const rollHeight = TOTAL_PITCHES * NOTE_HEIGHT + 40;
    canvas.height = rollHeight;

    ctx.fillStyle = '#0D1B2A';
    ctx.fillRect(0, 0, rollWidth, rollHeight);

    ctx.fillStyle = '#888888';
    ctx.font = '12px -apple-system, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < TOTAL_PITCHES; i++) {
      const pitch = MAX_PITCH - i;
      const noteName = NOTE_NAMES_ORDER[pitch - MIN_PITCH];
      const y = i * NOTE_HEIGHT + NOTE_HEIGHT / 2;
      ctx.fillText(noteName, ROLL_LABEL_WIDTH - 8, y);

      if (i % 2 === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.03)';
        ctx.fillRect(ROLL_LABEL_WIDTH, i * NOTE_HEIGHT, rollWidth - ROLL_LABEL_WIDTH, NOTE_HEIGHT);
        ctx.fillStyle = '#888888';
      }
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= TOTAL_PITCHES; i++) {
      ctx.beginPath();
      ctx.moveTo(ROLL_LABEL_WIDTH, i * NOTE_HEIGHT);
      ctx.lineTo(rollWidth, i * NOTE_HEIGHT);
      ctx.stroke();
    }

    const totalDuration = getTotalDuration();
    const contentWidth = rollWidth - ROLL_LABEL_WIDTH;

    for (let idx = 0; idx < notes.length; idx++) {
      const note = notes[idx];
      const x = ROLL_LABEL_WIDTH + (note.startTime / totalDuration) * contentWidth;
      const width = Math.max(4, (note.duration / totalDuration) * contentWidth);
      const pitchIdx = MAX_PITCH - note.pitch;
      const y = pitchIdx * NOTE_HEIGHT + 1;

      const isActive = idx === activeNoteIndex;
      ctx.fillStyle = isActive ? '#FFEB3B' : getNoteColor(note.pitch);
      ctx.globalAlpha = isActive ? 1 : 0.85;
      ctx.beginPath();
      ctx.roundRect(x, y, width, NOTE_HEIGHT - 2, 3);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    if (isPlaying || playbackTime > 0) {
      const progressX = ROLL_LABEL_WIDTH + (playbackTime / totalDuration) * contentWidth;
      ctx.strokeStyle = '#FF9800';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(progressX, 0);
      ctx.lineTo(progressX, rollHeight);
      ctx.stroke();
    }
  }, [notes, isPlaying, playbackTime, activeNoteIndex, getTotalDuration]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  useEffect(() => {
    drawPianoRoll();
  }, [drawPianoRoll]);

  const getCanvasPoint = (e: React.MouseEvent | React.TouchEvent): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;
    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    const clampedX = Math.max(0, Math.min(CANVAS_WIDTH, x));
    const clampedY = Math.max(0, Math.min(CANVAS_HEIGHT, y));
    return {
      x: clampedX,
      y: clampedY,
      time: (Date.now() - startTimeRef.current) / 1000,
    };
  };

  const handleDrawStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (isPlaying) return;
    if (strokes.length === 0 && currentStroke.length === 0) {
      startTimeRef.current = Date.now();
    }
    const point = getCanvasPoint(e);
    if (!point) return;
    setIsDrawing(true);
    setCurrentStroke([point]);
  };

  const handleDrawMove = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const point = getCanvasPoint(e);
    if (!point) return;
    setCurrentStroke((prev) => {
      const last = prev[prev.length - 1];
      if (last && Math.hypot(point.x - last.x, point.y - last.y) < 1) {
        return prev;
      }
      return [...prev, point];
    });
  };

  const handleDrawEnd = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentStroke.length > 0) {
      setStrokes((prev) => [...prev, { points: currentStroke }]);
      setCurrentStroke([]);
    }
  };

  const handleAnalyze = async () => {
    if (strokes.length === 0) return;
    const allPoints: Point[] = [];
    for (const stroke of strokes) {
      allPoints.push(...stroke.points);
    }
    allPoints.sort((a, b) => a.time - b.time);

    try {
      const response = await fetch('http://localhost:3001/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points: allPoints }),
      });
      const data = await response.json();
      if (data.notes) {
        setNotes(data.notes);
        setPlaybackTime(0);
        setActiveNoteIndex(-1);
      }
    } catch (err) {
      console.error('Analysis failed:', err);
    }
  };

  const stopPlayback = useCallback(() => {
    setIsPlaying(false);
    if (playbackRafRef.current !== null) {
      cancelAnimationFrame(playbackRafRef.current);
      playbackRafRef.current = null;
    }
    Tone.Transport.stop();
    Tone.Transport.cancel();
    scheduledEventsRef.current = [];
    setActiveNoteIndex(-1);
  }, []);

  const handlePlay = async () => {
    if (notes.length === 0) return;
    if (isPlaying) {
      stopPlayback();
      return;
    }

    await Tone.start();

    if (!synthRef.current) return;

    stopPlayback();

    const totalDuration = getTotalDuration();
    const animStartTime = performance.now();
    setIsPlaying(true);

    const animate = () => {
      const elapsed = (performance.now() - animStartTime) / 1000;
      if (elapsed >= totalDuration) {
        setPlaybackTime(totalDuration);
        setIsPlaying(false);
        setActiveNoteIndex(-1);
        setTimeout(() => setPlaybackTime(0), 500);
        return;
      }
      setPlaybackTime(elapsed);

      let currentIdx = -1;
      for (let i = 0; i < notes.length; i++) {
        const n = notes[i];
        if (elapsed >= n.startTime && elapsed < n.startTime + n.duration) {
          currentIdx = i;
          break;
        }
      }
      setActiveNoteIndex(currentIdx);

      playbackRafRef.current = requestAnimationFrame(animate);
    };
    playbackRafRef.current = requestAnimationFrame(animate);

    Tone.Transport.position = 0;
    Tone.Transport.start();

    for (let i = 0; i < notes.length; i++) {
      const note = notes[i];
      const eventId = Tone.Transport.schedule((time) => {
        synthRef.current?.triggerAttackRelease(note.note, note.duration, time, 0.5);
      }, note.startTime);
      scheduledEventsRef.current.push(eventId);
    }

    const endEventId = Tone.Transport.schedule(() => {
      Tone.Transport.stop();
    }, totalDuration);
    scheduledEventsRef.current.push(endEventId);
  };

  const handleClear = () => {
    stopPlayback();
    setStrokes([]);
    setCurrentStroke([]);
    setNotes([]);
    setPlaybackTime(0);
    setActiveNoteIndex(-1);
  };

  useEffect(() => {
    return () => {
      stopPlayback();
    };
  }, [stopPlayback]);

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <span style={styles.title}>手写旋律识别</span>
          <span style={styles.icon}>🎵</span>
        </div>
      </header>

      <div style={styles.content}>
        <div style={styles.leftPanel}>
          <div style={styles.canvasWrapper}>
            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              style={styles.canvas}
              onMouseDown={handleDrawStart}
              onMouseMove={handleDrawMove}
              onMouseUp={handleDrawEnd}
              onMouseLeave={handleDrawEnd}
              onTouchStart={handleDrawStart}
              onTouchMove={handleDrawMove}
              onTouchEnd={handleDrawEnd}
            />
          </div>
          <div style={styles.buttonRow}>
            <button style={styles.button} onClick={handleAnalyze}>
              解析旋律
            </button>
            <button style={styles.button} onClick={handleClear}>
              清除
            </button>
          </div>
        </div>

        <div style={styles.divider} />

        <div style={styles.rightPanel}>
          <div style={styles.rollHeader}>
            <span style={styles.rollTitle}>钢琴卷帘图</span>
          </div>
          <div style={styles.rollWrapper}>
            <canvas
              ref={rollCanvasRef}
              width={500}
              height={TOTAL_PITCHES * NOTE_HEIGHT + 40}
              style={styles.rollCanvas}
            />
          </div>
        </div>
      </div>

      <div style={styles.footer}>
        <button style={styles.playButton} onClick={handlePlay}>
          {isPlaying ? '停止' : '播放旋律'}
        </button>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: '#1A1A2E',
    color: '#FFFFFF',
    overflow: 'hidden',
  },
  header: {
    height: 60,
    background: 'rgba(22, 33, 62, 0.9)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    padding: '0 24px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  headerInner: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: 600,
    letterSpacing: 2,
  },
  icon: {
    fontSize: 28,
  },
  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'row',
    overflow: 'hidden',
    minHeight: 0,
  },
  leftPanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
    minWidth: 0,
  },
  divider: {
    width: 2,
    background: '#444444',
    flexShrink: 0,
  },
  rightPanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: 24,
    minWidth: 0,
    overflow: 'hidden',
  },
  canvasWrapper: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
    boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
    width: '100%',
    maxWidth: CANVAS_WIDTH,
  },
  canvas: {
    display: 'block',
    width: '100%',
    height: 'auto',
    cursor: 'crosshair',
    touchAction: 'none',
  },
  buttonRow: {
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  button: {
    height: 36,
    padding: '0 16px',
    borderRadius: 8,
    background: '#0F3460',
    color: '#FFFFFF',
    border: 'none',
    fontSize: 14,
    cursor: 'pointer',
    fontWeight: 500,
    transition: 'all 0.15s ease',
  },
  playButton: {
    height: 40,
    padding: '0 32px',
    borderRadius: 8,
    background: '#0F3460',
    color: '#FFFFFF',
    border: 'none',
    fontSize: 15,
    cursor: 'pointer',
    fontWeight: 600,
    transition: 'all 0.15s ease',
  },
  rollHeader: {
    marginBottom: 12,
    paddingLeft: 8,
  },
  rollTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: '#CCCCCC',
  },
  rollWrapper: {
    flex: 1,
    background: '#0D1B2A',
    borderRadius: 8,
    overflow: 'auto',
    boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
  },
  rollCanvas: {
    display: 'block',
    width: '100%',
    minWidth: 400,
  },
  footer: {
    padding: 16,
    display: 'flex',
    justifyContent: 'center',
    borderTop: '1px solid rgba(255,255,255,0.1)',
  },
};

export default App;
