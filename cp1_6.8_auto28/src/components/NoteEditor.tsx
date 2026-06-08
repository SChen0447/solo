import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { NoteSequence } from '../types/card';
import { playNoteSequence, resumeAudioContext, NOTE_FREQUENCIES } from '../utils/audio';

interface NoteEditorProps {
  noteSequence: NoteSequence;
  onChange: (sequence: NoteSequence) => void;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({ noteSequence, onChange }) => {
  const [playing, setPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(-1);
  const [beats, setBeats] = useState<4 | 8 | 16>(noteSequence.beats);

  const rows = 6;

  useEffect(() => {
    setBeats(noteSequence.beats);
  }, [noteSequence.beats]);

  const handleNoteClick = useCallback(
    (row: number, col: number) => {
      const newNotes = noteSequence.notes.map((r, ri) =>
        r.map((c, ci) => {
          if (ri === row && ci === col) {
            return !c;
          }
          return c;
        }
      );
      onChange({ ...noteSequence, notes: newNotes });
    },
    [noteSequence, onChange]
  );

  const handleBeatsChange = useCallback(
    (newBeats: 4 | 8 | 16) => {
      const newNotes: boolean[][] = [];
      for (let i = 0; i < rows; i++) {
        const row: boolean[] = [];
        for (let j = 0; j < newBeats; j++) {
          row.push(noteSequence.notes[i]?.[j] || false);
        }
        newNotes.push(row);
      }
      setBeats(newBeats);
      onChange({ ...noteSequence, notes: newNotes, beats: newBeats });
    },
    [noteSequence, onChange]
  );

  const handlePlay = useCallback(async () => {
    if (playing) return;
    resumeAudioContext();
    setPlaying(true);
    setCurrentBeat(-1);

    await playNoteSequence(noteSequence.notes, noteSequence.tempo, (beatIndex) => {
      setCurrentBeat(beatIndex);
    });

    setPlaying(false);
    setCurrentBeat(-1);
  }, [playing, noteSequence]);

  const handleClear = useCallback(() => {
    const newNotes: boolean[][] = [];
    for (let i = 0; i < rows; i++) {
      newNotes.push(new Array(beats).fill(false));
    }
    onChange({ ...noteSequence, notes: newNotes });
  }, [beats, noteSequence, onChange]);

  const noteLabels = ['E', 'D', 'C', 'B', 'A', 'G'];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h4 style={styles.title}>🎵 音符编辑器</h4>
        <div style={styles.controls}>
          <div style={styles.beatSelector}>
            <span style={styles.label}>节拍：</span>
            {[4, 8, 16].map((b) => (
              <button
                key={b}
                onClick={() => handleBeatsChange(b as 4 | 8 | 16)}
                style={{
                  ...styles.beatBtn,
                  ...(beats === b ? styles.beatBtnActive : {}),
                }}
              >
                {b}拍
              </button>
            ))}
          </div>
          <button onClick={handlePlay} disabled={playing} style={styles.playBtn}>
            {playing ? '播放中...' : '▶ 试听'}
          </button>
          <button onClick={handleClear} style={styles.clearBtn}>
            清空
          </button>
        </div>
      </div>

      <div style={styles.gridContainer}>
        <div style={styles.noteLabels}>
          {noteLabels.map((label, i) => (
            <div key={i} style={styles.noteLabel}>
              {label}
            </div>
          ))}
        </div>

        <div
          style={{
            ...styles.grid,
            gridTemplateColumns: `repeat(${beats}, 1fr)`,
          }}
        >
          {noteSequence.notes.map((row, rowIndex) =>
            row.map((active, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                onClick={() => handleNoteClick(rowIndex, colIndex)}
                style={{
                  ...styles.cell,
                  ...(active ? styles.cellActive : {}),
                  ...(currentBeat === colIndex ? styles.cellCurrent : {}),
                  backgroundColor: active
                    ? `hsl(${240 + rowIndex * 20}, 70%, 60%)`
                    : undefined,
                }}
              />
            )
          )}
        </div>
      </div>

      <div style={styles.hint}>
        点击格子添加/取消音符，6行代表不同音高
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '16px',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: '12px',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255, 255, 255, 0.5)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  title: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 600,
    color: '#333',
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  beatSelector: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  label: {
    fontSize: '12px',
    color: '#666',
    marginRight: '4px',
  },
  beatBtn: {
    padding: '4px 10px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    backgroundColor: 'white',
    cursor: 'pointer',
    fontSize: '12px',
    transition: 'all 0.2s ease',
  },
  beatBtnActive: {
    backgroundColor: '#FF6B9D',
    color: 'white',
    borderColor: '#FF6B9D',
  },
  playBtn: {
    padding: '6px 16px',
    border: 'none',
    borderRadius: '8px',
    backgroundColor: '#4ECDC4',
    color: 'white',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
    transition: 'all 0.2s ease',
  },
  clearBtn: {
    padding: '6px 12px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    backgroundColor: 'white',
    cursor: 'pointer',
    fontSize: '12px',
    transition: 'all 0.2s ease',
  },
  gridContainer: {
    display: 'flex',
    gap: '8px',
    marginBottom: '12px',
  },
  noteLabels: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    width: '24px',
  },
  noteLabel: {
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
    color: '#888',
    fontWeight: 500,
  },
  grid: {
    flex: 1,
    display: 'grid',
    gridTemplateRows: 'repeat(6, 1fr)',
    gap: '2px',
    backgroundColor: '#f0f0f0',
    padding: '2px',
    borderRadius: '6px',
  },
  cell: {
    aspectRatio: '1',
    backgroundColor: 'white',
    borderRadius: '3px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    minWidth: '20px',
    minHeight: '20px',
  },
  cellActive: {
    transform: 'scale(0.95)',
  },
  cellCurrent: {
    boxShadow: '0 0 0 2px #FFD93D',
  },
  hint: {
    fontSize: '11px',
    color: '#999',
    textAlign: 'center',
  },
};
