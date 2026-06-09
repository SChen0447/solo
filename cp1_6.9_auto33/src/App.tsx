import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as Tone from 'tone';
import { Save, FolderOpen } from 'lucide-react';
import TrackGrid, { TRACK_NAMES, TRACK_COLORS } from './TrackGrid';
import PlaybackBar from './PlaybackBar';

const DESKTOP_COLS = 16;
const MOBILE_COLS = 12;
const MOBILE_BREAKPOINT = 768;

function createEmptyGrid(rows: number, cols: number): boolean[][] {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => false)
  );
}

function getGridSize(): { cols: number; rows: number } {
  const isMobile = typeof window !== 'undefined' &&
    window.innerWidth <= MOBILE_BREAKPOINT;
  return {
    cols: isMobile ? MOBILE_COLS : DESKTOP_COLS,
    rows: TRACK_NAMES.length,
  };
}

const App: React.FC = () => {
  const [gridSize, setGridSize] = useState(getGridSize);
  const [grid, setGrid] = useState<boolean[][]>(() =>
    createEmptyGrid(TRACK_NAMES.length, DESKTOP_COLS)
  );
  const [bpm, setBpm] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [savedId, setSavedId] = useState('');
  const [loadInput, setLoadInput] = useState('');
  const [toast, setToast] = useState('');

  const synthsRef = useRef<(Tone.Synth | Tone.NoiseSynth | Tone.MembraneSynth | Tone.MetalSynth)[]>([]);
  const transportEventRef = useRef<number | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    const handleResize = () => {
      setGridSize(getGridSize());
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const start = Tone.now();

    const kick = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 10,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4, attackCurve: 'exponential' },
    }).toDestination();

    const snare = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.1 },
    }).toDestination();

    const hihat = new Tone.MetalSynth({
      frequency: 400,
      envelope: { attack: 0.001, decay: 0.08, release: 0.01 },
      harmonicity: 5.1,
      modulationIndex: 32,
      resonance: 4000,
      octaves: 1.5,
    }).toDestination();

    const clap = new Tone.NoiseSynth({
      noise: { type: 'pink' },
      envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.08 },
      filterEnvelope: { attack: 0.001, decay: 0.1, sustain: 0 },
    }).toDestination();

    const tom = new Tone.MembraneSynth({
      pitchDecay: 0.08,
      octaves: 6,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.5, sustain: 0.01, release: 0.8 },
    }).toDestination();

    const cymbal = new Tone.MetalSynth({
      frequency: 200,
      envelope: { attack: 0.001, decay: 0.8, release: 0.1 },
      harmonicity: 8,
      modulationIndex: 20,
      resonance: 3000,
      octaves: 1,
    }).toDestination();

    const bass = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.01, decay: 0.3, sustain: 0.4, release: 0.5 },
    }).toDestination();

    const fx = new Tone.Synth({
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.005, decay: 0.2, sustain: 0.1, release: 0.3 },
    }).toDestination();

    synthsRef.current = [kick, snare, hihat, clap, tom, cymbal, bass, fx];

    const cols = grid[0]?.length || DESKTOP_COLS;
    const stepDuration = (60 / bpm / 4).toFixed(3);

    Tone.Transport.bpm.value = bpm;
    Tone.Transport.loop = true;
    Tone.Transport.loopEnd = `${cols} * ${stepDuration}n`;

    return () => {
      synthsRef.current.forEach((s) => s.dispose());
    };
  }, []);

  const playSound = useCallback((row: number) => {
    const synth = synthsRef.current[row];
    if (!synth) return;

    const now = Tone.now();
    switch (row) {
      case 0:
        (synth as Tone.MembraneSynth).triggerAttackRelease('C2', '8n', now);
        break;
      case 1:
        (synth as Tone.NoiseSynth).triggerAttackRelease('8n', now);
        break;
      case 2:
        (synth as Tone.MetalSynth).triggerAttackRelease('32n', now);
        break;
      case 3:
        (synth as Tone.NoiseSynth).triggerAttackRelease('16n', now);
        break;
      case 4:
        (synth as Tone.MembraneSynth).triggerAttackRelease('G2', '8n', now);
        break;
      case 5:
        (synth as Tone.MetalSynth).triggerAttackRelease('4n', now);
        break;
      case 6:
        (synth as Tone.Synth).triggerAttackRelease('C2', '8n', now);
        break;
      case 7:
        (synth as Tone.Synth).triggerAttackRelease('C5', '16n', now);
        break;
    }
  }, []);

  const handlePadClick = useCallback((row: number, col: number) => {
    playSound(row);
    setGrid((prev) => {
      const newGrid = prev.map((r) => [...r]);
      newGrid[row][col] = !newGrid[row][col];
      return newGrid;
    });
  }, [playSound]);

  const scheduleTransport = useCallback(() => {
    if (transportEventRef.current !== null) {
      Tone.Transport.clear(transportEventRef.current);
      transportEventRef.current = null;
    }

    const cols = grid[0]?.length || DESKTOP_COLS;

    transportEventRef.current = Tone.Transport.scheduleRepeat((time) => {
      const step = Math.floor((Tone.Transport.seconds - time) * (bpm / 60) * 4) % cols;
      const actualStep = Math.floor(Tone.Transport.ticks / (Tone.Transport.PPQ / 4)) % cols;

      Tone.Draw.schedule(() => {
        setCurrentStep(actualStep);
      }, time);

      for (let row = 0; row < grid.length; row++) {
        if (grid[row]?.[actualStep]) {
          const synth = synthsRef.current[row];
          if (!synth) continue;
          switch (row) {
            case 0:
              (synth as Tone.MembraneSynth).triggerAttackRelease('C2', '8n', time);
              break;
            case 1:
              (synth as Tone.NoiseSynth).triggerAttackRelease('8n', time);
              break;
            case 2:
              (synth as Tone.MetalSynth).triggerAttackRelease('32n', time);
              break;
            case 3:
              (synth as Tone.NoiseSynth).triggerAttackRelease('16n', time);
              break;
            case 4:
              (synth as Tone.MembraneSynth).triggerAttackRelease('G2', '8n', time);
              break;
            case 5:
              (synth as Tone.MetalSynth).triggerAttackRelease('4n', time);
              break;
            case 6:
              (synth as Tone.Synth).triggerAttackRelease('C2', '8n', time);
              break;
            case 7:
              (synth as Tone.Synth).triggerAttackRelease('C5', '16n', time);
              break;
          }
        }
      }
    }, '16n');
  }, [grid, bpm]);

  const handlePlayToggle = useCallback(async () => {
    await Tone.start();

    if (isPlaying) {
      Tone.Transport.stop();
      if (transportEventRef.current !== null) {
        Tone.Transport.clear(transportEventRef.current);
        transportEventRef.current = null;
      }
      setIsPlaying(false);
      setCurrentStep(0);
    } else {
      scheduleTransport();
      setCurrentStep(0);
      Tone.Transport.start();
      setIsPlaying(true);
    }
  }, [isPlaying, scheduleTransport]);

  useEffect(() => {
    Tone.Transport.bpm.value = bpm;
  }, [bpm]);

  const handleBpmChange = useCallback((value: number) => {
    setBpm(value);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }, []);

  const handleSave = useCallback(async () => {
    try {
      const res = await fetch('/api/tracks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grid, bpm }),
      });
      const data = await res.json();
      if (data.success) {
        setSavedId(data.id);
        setShowSaveModal(true);
      } else {
        showToast('保存失败');
      }
    } catch (e) {
      showToast('网络错误，保存失败');
    }
  }, [grid, bpm, showToast]);

  const handleLoad = useCallback(async () => {
    if (!loadInput.trim()) {
      showToast('请输入ID');
      return;
    }
    try {
      const res = await fetch(`/api/tracks?id=${encodeURIComponent(loadInput.trim())}`);
      const data = await res.json();
      if (data.success && data.data) {
        const loadedGrid = data.data.grid as boolean[][];
        const targetCols = grid[0]?.length || DESKTOP_COLS;
        const normalizedGrid = loadedGrid.map((row) => {
          const padded = [...row];
          while (padded.length < targetCols) padded.push(false);
          return padded.slice(0, targetCols);
        });
        while (normalizedGrid.length < TRACK_NAMES.length) {
          normalizedGrid.push(Array(targetCols).fill(false));
        }
        setGrid(normalizedGrid.slice(0, TRACK_NAMES.length));
        setBpm(data.data.bpm as number);
        setShowLoadModal(false);
        setLoadInput('');
        showToast('加载成功');
      } else {
        showToast(data.error || '节拍不存在');
      }
    } catch (e) {
      showToast('网络错误，加载失败');
    }
  }, [loadInput, grid, showToast]);

  const totalSteps = grid[0]?.length || DESKTOP_COLS;

  return (
    <div className="app">
      {toast && <div className="toast">{toast}</div>}

      <header className="app-header">
        <button className="btn-icon" onClick={handleSave}>
          <Save size={18} />
          <span>保存</span>
        </button>

        <h1 className="app-title">BEAT LAB</h1>

        <button className="btn-icon" onClick={() => setShowLoadModal(true)}>
          <FolderOpen size={18} />
          <span>加载</span>
        </button>
      </header>

      <TrackGrid
        grid={grid}
        currentStep={currentStep}
        isPlaying={isPlaying}
        onPadClick={handlePadClick}
      />

      <PlaybackBar
        isPlaying={isPlaying}
        bpm={bpm}
        currentStep={currentStep}
        totalSteps={totalSteps}
        onPlayToggle={handlePlayToggle}
        onBpmChange={handleBpmChange}
      />

      {showSaveModal && (
        <div className="modal-overlay" onClick={() => setShowSaveModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">保存成功</div>
            <div className="track-id-display">{savedId}</div>
            <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 16 }}>
              复制此ID分享给朋友，他们可以通过「加载」功能复现你的节拍。
            </p>
            <div className="modal-actions">
              <button
                className="btn-icon"
                onClick={() => {
                  navigator.clipboard?.writeText(savedId);
                  showToast('已复制到剪贴板');
                  setShowSaveModal(false);
                }}
              >
                复制ID
              </button>
              <button className="btn-secondary" onClick={() => setShowSaveModal(false)}>
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {showLoadModal && (
        <div className="modal-overlay" onClick={() => setShowLoadModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">加载节拍</div>
            <input
              className="modal-input"
              placeholder="输入6位ID"
              value={loadInput}
              onChange={(e) => setLoadInput(e.target.value.toLowerCase())}
              maxLength={6}
              onKeyDown={(e) => e.key === 'Enter' && handleLoad()}
            />
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowLoadModal(false)}>
                取消
              </button>
              <button className="btn-icon" onClick={handleLoad}>
                加载
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
