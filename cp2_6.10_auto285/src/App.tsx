import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Fretboard } from './Fretboard';
import {
  NOTE_NAMES,
  SCALE_INTERVALS,
  STANDARD_TUNING,
  FretPosition,
  getScaleNotes,
  getChordNotes,
  parseChordName,
  calculateFretboardPositions
} from './HarmonyEngine';
import './App.css';

const NUM_FRETS = 22;
const SCALE_NAMES = Object.keys(SCALE_INTERVALS);

export const App: React.FC = () => {
  const [rootNote, setRootNote] = useState<string>('C');
  const [scaleName, setScaleName] = useState<string>('大调');
  const [highlightMode, setHighlightMode] = useState<'scale' | 'chord'>('scale');
  const [chordInput, setChordInput] = useState<string>('Cmaj7');
  const [selectedNote, setSelectedNote] = useState<FretPosition | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const playNote = useCallback((frequency: number) => {
    if (!audioContextRef.current) return;

    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.3);
  }, []);

  const highlightedPositions = useMemo(() => {
    const startTime = performance.now();
    let positions: FretPosition[] = [];
    let targetNotes: string[] = [];
    let root: string = rootNote;

    if (highlightMode === 'scale') {
      targetNotes = getScaleNotes(rootNote, scaleName);
      root = rootNote;
    } else {
      const parsed = parseChordName(chordInput);
      if (parsed) {
        targetNotes = getChordNotes(parsed.root, parsed.type);
        root = parsed.root;
      }
    }

    if (targetNotes.length > 0) {
      positions = calculateFretboardPositions(
        STANDARD_TUNING,
        NUM_FRETS,
        targetNotes,
        root
      );
    }

    const elapsed = performance.now() - startTime;
    if (elapsed > 50) {
      console.warn(`和弦计算耗时 ${elapsed.toFixed(2)}ms，超过50ms阈值`);
    }

    return positions;
  }, [highlightMode, rootNote, scaleName, chordInput]);

  const displayChordName = useMemo(() => {
    if (highlightMode !== 'chord') return undefined;
    const parsed = parseChordName(chordInput);
    if (!parsed) return undefined;
    return `${parsed.root}${parsed.type === 'maj' ? '' : parsed.type}`;
  }, [highlightMode, chordInput]);

  const handleNoteClick = useCallback((note: FretPosition) => {
    setSelectedNote(note);
    playNote(note.frequency);
  }, [playNote]);

  const handleModeToggle = () => {
    setHighlightMode(prev => prev === 'scale' ? 'chord' : 'scale');
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">指板视界</h1>
      </header>

      <div className="app-main">
        <aside className="control-panel">
          <div className="control-group">
            <label className="control-label">根音</label>
            <select
              className="control-select"
              value={rootNote}
              onChange={(e) => setRootNote(e.target.value)}
              disabled={highlightMode === 'chord'}
            >
              {NOTE_NAMES.map(note => (
                <option key={note} value={note}>{note}</option>
              ))}
            </select>
          </div>

          <div className="control-group">
            <label className="control-label">调式</label>
            <select
              className="control-select"
              value={scaleName}
              onChange={(e) => setScaleName(e.target.value)}
              disabled={highlightMode === 'chord'}
            >
              {SCALE_NAMES.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          <div className="control-group">
            <button
              className={`mode-toggle ${highlightMode === 'chord' ? 'active' : ''}`}
              onClick={handleModeToggle}
            >
              {highlightMode === 'scale' ? '和弦模式' : '音阶模式'}
            </button>
          </div>

          {highlightMode === 'chord' && (
            <div className="control-group">
              <label className="control-label">和弦名称</label>
              <input
                type="text"
                className="control-input"
                value={chordInput}
                onChange={(e) => setChordInput(e.target.value)}
                placeholder="如 Cmaj7, Dm7, G7"
              />
            </div>
          )}

          <div className="legend">
            <h4 className="legend-title">图例</h4>
            {highlightMode === 'scale' ? (
              <>
                <div className="legend-item">
                  <span className="legend-dot scale-root"></span>
                  <span>主音</span>
                </div>
                <div className="legend-item">
                  <span className="legend-dot scale-note"></span>
                  <span>音阶音</span>
                </div>
              </>
            ) : (
              <>
                <div className="legend-item">
                  <span className="legend-dot chord-root"></span>
                  <span>根音</span>
                </div>
                <div className="legend-item">
                  <span className="legend-dot chord-note"></span>
                  <span>和弦音</span>
                </div>
              </>
            )}
          </div>
        </aside>

        <main className="content-area">
          <div className="fretboard-wrapper">
            <Fretboard
              tuning={STANDARD_TUNING}
              numFrets={NUM_FRETS}
              highlightedPositions={highlightedPositions}
              highlightMode={highlightMode}
              onNoteClick={handleNoteClick}
              chordName={displayChordName}
            />
          </div>
        </main>
      </div>

      <footer className="info-bar">
        <div className="info-item">
          <span className="info-label">高亮音符：</span>
          <span className="info-value">{highlightedPositions.length}</span>
        </div>
        {highlightMode === 'scale' && (
          <div className="info-item">
            <span className="info-label">当前调式：</span>
            <span className="info-value">{rootNote} {scaleName}</span>
          </div>
        )}
        {highlightMode === 'chord' && displayChordName && (
          <div className="info-item">
            <span className="info-label">当前和弦：</span>
            <span className="info-value">{displayChordName}</span>
          </div>
        )}
        {selectedNote && (
          <div className="info-item selected-note">
            <span className="info-label">选中音符：</span>
            <span className="info-value">
              {selectedNote.noteName}{selectedNote.octave}
              <span className="frequency">
                ({selectedNote.frequency.toFixed(1)} Hz)
              </span>
            </span>
          </div>
        )}
      </footer>
    </div>
  );
};

export default App;
