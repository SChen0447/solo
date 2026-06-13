import React, { useRef, useState, useEffect } from 'react';
import type { ChordProgression, Chord } from '../services/apiService';

interface ChordsPanelProps {
  progressions: ChordProgression[];
  selectedId: number | null;
  onSelect: (progression: ChordProgression) => void;
  isGenerating: boolean;
  onGenerateAccompaniment: () => void;
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const noteToFreq = (note: string, octave: number): number => {
  const idx = NOTE_NAMES.indexOf(note);
  if (idx < 0) return 440;
  const semitones = (octave - 4) * 12 + idx - 9;
  return 440 * Math.pow(2, semitones / 12);
};

const getChordNotes = (chordName: string): { note: string; octave: number }[] => {
  const isMinor = chordName.endsWith('m');
  const root = chordName.replace(/m$/, '');
  const rootIdx = NOTE_NAMES.indexOf(root);
  if (rootIdx < 0) return [{ note: 'C', octave: 4 }];
  const thirdIdx = isMinor ? (rootIdx + 3) % 12 : (rootIdx + 4) % 12;
  const fifthIdx = (rootIdx + 7) % 12;
  return [
    { note: NOTE_NAMES[rootIdx], octave: 4 },
    { note: NOTE_NAMES[thirdIdx], octave: 4 },
    { note: NOTE_NAMES[fifthIdx], octave: 4 },
    { note: NOTE_NAMES[rootIdx], octave: 5 },
  ];
};

const playChord = (chord: Chord, audioContext: AudioContext | null, masterGain: GainNode | null, duration = 2) => {
  if (!audioContext || !masterGain) return;
  const ctx = audioContext;
  const chordNotes = getChordNotes(chord.name);
  const now = ctx.currentTime;

  chordNotes.forEach((n, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = i === 0 ? 'triangle' : 'sine';
    osc.frequency.value = noteToFreq(n.note, n.octave) * (i >= 3 ? 1 : 0.5);

    const attack = 0.02;
    const decay = 0.1;
    const sustain = 0.3;
    const release = duration * 0.8;

    const chordGain = ctx.createGain();
    chordGain.gain.value = i === 0 ? 0.25 : 0.15;

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(1, now + attack);
    gain.gain.linearRampToValueAtTime(sustain, now + attack + decay);
    gain.gain.linearRampToValueAtTime(0, now + duration + release);

    osc.connect(gain);
    gain.connect(chordGain);
    chordGain.connect(masterGain);

    osc.start(now);
    osc.stop(now + duration + release + 0.1);
  });
};

const ChordFretboard: React.FC<{ chord: Chord; small?: boolean }> = ({ chord, small }) => {
  const frets = chord.frets;
  const fingers = chord.fingers;
  const scale = small ? 0.7 : 1;
  const w = 120 * scale;
  const h = 90 * scale;
  const stringSpacing = h / 5;
  const fretSpacing = (w - 20 * scale) / 5;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      {[0, 1, 2, 3, 4, 5].map((s) => (
        <line
          key={`s-${s}`}
          x1={10 * scale}
          y1={8 * scale + s * stringSpacing}
          x2={w - 10 * scale}
          y2={8 * scale + s * stringSpacing}
          stroke="#a8dadc"
          strokeWidth={1 * scale}
        />
      ))}
      {[0, 1, 2, 3, 4, 5].map((f) => (
        <line
          key={`f-${f}`}
          x1={10 * scale + f * fretSpacing}
          y1={8 * scale}
          x2={10 * scale + f * fretSpacing}
          y2={h - 8 * scale}
          stroke="#a8dadc"
          strokeWidth={f === 0 ? 3 * scale : 1 * scale}
        />
      ))}
      {frets.map((fret, idx) => {
        if (fret === -1) {
          return (
            <text
              key={`n-${idx}`}
              x={5 * scale}
              y={12 * scale + idx * stringSpacing}
              fill="#e63946"
              fontSize={10 * scale}
              fontWeight="bold"
            >
              ×
            </text>
          );
        }
        if (fret === 0) return null;
        const cx = 10 * scale + (fret - 0.5) * fretSpacing;
        const cy = 8 * scale + idx * stringSpacing;
        return (
          <g key={`n-${idx}`}>
            <circle cx={cx} cy={cy} r={6 * scale} fill="#00b4d8" />
            <text
              x={cx}
              y={cy + 4 * scale}
              textAnchor="middle"
              fill="white"
              fontSize={9 * scale}
              fontWeight="bold"
            >
              {fingers[idx] || ''}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

const ChordsPanel: React.FC<ChordsPanelProps> = ({
  progressions,
  selectedId,
  onSelect,
  isGenerating,
  onGenerateAccompaniment,
}) => {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const [glowingId, setGlowingId] = useState<number | null>(null);

  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, []);

  const ensureAudio = () => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new AudioCtx();
      masterGainRef.current = audioCtxRef.current.createGain();
      masterGainRef.current.gain.value = 0.6;
      masterGainRef.current.connect(audioCtxRef.current.destination);
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  const handlePreview = (e: React.MouseEvent, progression: ChordProgression) => {
    e.stopPropagation();
    ensureAudio();
    const ctx = audioCtxRef.current;
    const previewChords = progression.chords.slice(0, 4);
    previewChords.forEach((chord, i) => {
      setTimeout(() => {
        playChord(chord, ctx, masterGainRef.current, 1.5);
      }, i * 800);
    });
  };

  const handleApply = (progression: ChordProgression) => {
    setGlowingId(progression.id);
    setTimeout(() => setGlowingId(null), 800);
    onSelect(progression);
  };

  const hasSelected = selectedId !== null;

  return (
    <div className="panel fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16, minHeight: 0 }}>
      <div className="section-title">和弦编配方案</div>

      {progressions.length === 0 ? (
        <div style={{ padding: 30, textAlign: 'center', color: '#778da9', fontSize: 14 }}>
          先解析旋律，系统将生成多组和弦编配方案
        </div>
      ) : (
        <div className="scroll-container" style={{ display: 'flex', gap: 12 }}>
          {progressions.map((prog) => {
            const isSelected = selectedId === prog.id;
            const isGlowing = glowingId === prog.id;
            return (
              <div
                key={prog.id}
                className={isGlowing ? 'card-glow' : ''}
                onClick={() => handleApply(prog)}
                style={{
                  flexShrink: 0,
                  width: 260,
                  padding: 16,
                  borderRadius: 8,
                  background: isSelected
                    ? 'linear-gradient(135deg, rgba(0, 180, 216, 0.25), rgba(114, 9, 183, 0.25))'
                    : 'rgba(65, 90, 119, 0.3)',
                  border: `2px solid ${isSelected ? 'rgba(0, 180, 216, 0.7)' : 'rgba(65, 90, 119, 0.5)'}`,
                  cursor: 'pointer',
                  transform: isSelected ? 'scale(1.03)' : 'scale(1)',
                  transition: 'all 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{prog.name}</div>
                    <div style={{ fontSize: 11, color: '#a8dadc', lineHeight: 1.4 }}>{prog.description}</div>
                  </div>
                  <button
                    onClick={(e) => handlePreview(e, prog)}
                    className="icon-btn"
                    style={{ width: 32, height: 32, flexShrink: 0 }}
                    title="试听"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  </button>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {prog.chords.slice(0, 4).map((c, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '4px 8px',
                        borderRadius: 4,
                        background: 'rgba(0, 0, 0, 0.25)',
                        fontSize: 12,
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <span style={{ color: '#00b4d8' }}>{c.degree}</span>
                      <span style={{ color: '#a8dadc', opacity: 0.5 }}>·</span>
                      <span>{c.name}</span>
                    </div>
                  ))}
                  {prog.chords.length > 4 && (
                    <div style={{ padding: '4px 8px', fontSize: 12, color: '#778da9' }}>
                      +{prog.chords.length - 4} 和弦
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>
                  <ChordFretboard chord={prog.chords[0]} small />
                </div>

                <button
                  className="gradient-btn"
                  style={{
                    padding: '8px 16px',
                    fontSize: 13,
                    opacity: isSelected ? 1 : 0.9,
                  }}
                >
                  {isSelected ? '✓ 已应用' : '应用方案'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {hasSelected && (
        <button
          className="gradient-btn"
          onClick={onGenerateAccompaniment}
          disabled={isGenerating}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
        >
          {isGenerating ? (
            <>
              <div
                style={{
                  width: 18,
                  height: 18,
                  border: '3px solid rgba(255,255,255,0.3)',
                  borderTopColor: 'white',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
              生成伴奏中...
            </>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
              生成虚拟乐队伴奏
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default ChordsPanel;
