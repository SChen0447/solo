import { useState, useEffect, useRef, useCallback } from 'react';
import * as Tone from 'tone';
import { useSocket } from './App';
import { Note, HistoryAction } from './types';
import {
  KEY_MAP,
  getAllPitches,
  isBlackKey,
  pitchToY,
  yToPitch,
  pitchToMidi,
  midiToPitch,
  PITCH_RANGE,
  formatTimestamp,
  quantizeTime
} from './utils';

const CELL_HEIGHT = 12;
const CELL_WIDTH = 30;
const WHITE_KEY_WIDTH = 30;
const BLACK_KEY_WIDTH = 20;
const WHITE_KEY_HEIGHT = 120;
const BLACK_KEY_HEIGHT = 80;
const PIANO_WIDTH = 20 * WHITE_KEY_WIDTH;
const TOTAL_PITCHES = pitchToMidi(PITCH_RANGE.max) - pitchToMidi(PITCH_RANGE.min) + 1;
const STAFF_HEIGHT = TOTAL_PITCHES * CELL_HEIGHT;

interface DragState {
  type: 'move' | 'resize' | null;
  noteId: string | null;
  startX: number;
  startY: number;
  originalNote: Note | null;
}

export default function Sequencer() {
  const {
    trackIndex,
    color,
    users,
    tracks,
    bpm,
    setBpm,
    addNote,
    updateNote,
    deleteNote,
    noteOn,
    noteOff
  } = useSocket();

  const [isPlaying, setIsPlaying] = useState(false);
  const [playheadPos, setPlayheadPos] = useState(0);
  const [metronomeEnabled, setMetronomeEnabled] = useState(true);
  const [flashingKeys, setFlashingKeys] = useState<Record<string, string>>({});
  const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set());
  const [undoStack, setUndoStack] = useState<HistoryAction[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryAction[]>([]);
  const [newNotes, setNewNotes] = useState<Set<string>>(new Set());

  const staffRef = useRef<HTMLDivElement>(null);
  const synthRef = useRef<Tone.PolySynth | null>(null);
  const metronomeSynthRef = useRef<Tone.Synth | null>(null);
  const transportRef = useRef<Tone.Transport | null>(null);
  const playStartTimeRef = useRef<number>(0);
  const playheadRef = useRef<number>(0);
  const pressedKeysRef = useRef<Set<string>>(new Set());
  const noteStartTimesRef = useRef<Record<string, number>>({});
  const dragStateRef = useRef<DragState>({ type: null, noteId: null, startX: 0, startY: 0, originalNote: null });
  const animFrameRef = useRef<number>(0);
  const metronomeEventsRef = useRef<number[]>([]);

  useEffect(() => {
    synthRef.current = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.005, decay: 0.3, sustain: 0.4, release: 0.8 }
    }).toDestination();

    metronomeSynthRef.current = new Tone.Synth({
      envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 }
    }).toDestination();

    transportRef.current = Tone.getTransport();
    transportRef.current.bpm.value = bpm;

    return () => {
      synthRef.current?.dispose();
      metronomeSynthRef.current?.dispose();
    };
  }, []);

  useEffect(() => {
    if (transportRef.current) {
      transportRef.current.bpm.rampTo(bpm, 0.1);
    }
  }, [bpm]);

  const pushUndo = useCallback((action: HistoryAction) => {
    setUndoStack(prev => {
      const newStack = [...prev, action];
      if (newStack.length > 50) newStack.shift();
      return newStack;
    });
    setRedoStack([]);
  }, []);

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const lastAction = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));

    if (lastAction.type === 'add' && lastAction.previousState) {
      deleteNote(lastAction.noteId);
    } else if (lastAction.type === 'delete' && lastAction.previousState) {
      const { id, trackId, ...noteData } = lastAction.previousState;
      addNote(noteData);
    } else if (lastAction.type === 'update' && lastAction.previousState) {
      const { id, trackId, ...changes } = lastAction.previousState;
      updateNote(lastAction.noteId, changes);
    }

    setRedoStack(prev => [...prev, lastAction]);
  }, [undoStack, addNote, updateNote, deleteNote]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const lastAction = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));

    if (lastAction.type === 'add' && lastAction.newState) {
      const { id, trackId, ...noteData } = lastAction.newState;
      addNote(noteData);
    } else if (lastAction.type === 'delete' && lastAction.newState) {
      deleteNote(lastAction.noteId);
    } else if (lastAction.type === 'update' && lastAction.newState) {
      const { id, trackId, ...changes } = lastAction.newState;
      updateNote(lastAction.noteId, changes);
    }

    setUndoStack(prev => [...prev, lastAction]);
  }, [redoStack, addNote, updateNote, deleteNote]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const key = e.key.toLowerCase();

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleRedo();
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
        return;
      }

      const pitch = KEY_MAP[key];
      if (pitch && !pressedKeysRef.current.has(pitch)) {
        pressedKeysRef.current.add(pitch);
        triggerNote(pitch);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const pitch = KEY_MAP[key];
      if (pitch) {
        pressedKeysRef.current.delete(pitch);
        releaseNote(pitch);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleUndo, handleRedo]);

  const triggerNote = useCallback((pitch: string) => {
    if (synthRef.current) {
      synthRef.current.triggerAttack(pitch);
    }
    noteStartTimesRef.current[pitch] = Date.now();
    setActiveNotes(prev => new Set(prev).add(pitch));
    setFlashingKeys(prev => ({ ...prev, [pitch]: color }));
    noteOn(pitch);
  }, [color, noteOn]);

  const releaseNote = useCallback((pitch: string) => {
    if (synthRef.current) {
      synthRef.current.triggerRelease(pitch);
    }
    const startTime = noteStartTimesRef.current[pitch];
    if (startTime) {
      const duration = Math.max(50, Date.now() - startTime);
      const note: Omit<Note, 'id' | 'trackId'> = {
        pitch,
        startTime,
        duration
      };
      const newId = `local_${Date.now()}_${Math.random()}`;
      setNewNotes(prev => {
        const s = new Set(prev);
        s.add(newId);
        return s;
      });
      setTimeout(() => {
        setNewNotes(prev => {
          const s = new Set(prev);
          s.delete(newId);
          return s;
        });
      }, 150);

      pushUndo({
        type: 'add',
        noteId: newId,
        newState: { ...note, id: newId, trackId: trackIndex } as Note
      });
      addNote(note);
      delete noteStartTimesRef.current[pitch];
    }
    setActiveNotes(prev => {
      const s = new Set(prev);
      s.delete(pitch);
      return s;
    });
    setTimeout(() => {
      setFlashingKeys(prev => {
        const next = { ...prev };
        if (next[pitch] === color) delete next[pitch];
        return next;
      });
    }, 100);
    noteOff();
  }, [addNote, color, noteOff, pushUndo, trackIndex]);

  const togglePlay = useCallback(async () => {
    await Tone.start();
    if (!transportRef.current) return;

    if (isPlaying) {
      transportRef.current.pause();
      cancelAnimationFrame(animFrameRef.current);
      setIsPlaying(false);
    } else {
      transportRef.current.cancel();
      metronomeEventsRef.current = [];

      const beatMs = 60000 / bpm;
      const allNotes = tracks.flatMap(t => t.notes);
      const maxEndTime = allNotes.length > 0
        ? Math.max(...allNotes.map(n => n.startTime + n.duration)) + 2000
        : beatMs * 8;

      const startTimeOffset = playheadRef.current;
      const startBeat = startTimeOffset / beatMs;

      allNotes.forEach(note => {
        if (tracks[note.trackId]?.muted) return;
        const noteStartMs = note.startTime;
        if (noteStartMs + note.duration < startTimeOffset) return;

        const scheduleTime = Math.max(0, (noteStartMs - startTimeOffset) / 1000);
        const durationSec = note.duration / 1000;
        const volume = (tracks[note.trackId]?.volume ?? 80) / 100;

        const eventId = transportRef.current!.schedule((time) => {
          if (synthRef.current) {
            synthRef.current.volume.value = Tone.gainToDb(Math.max(0.01, volume));
            synthRef.current.triggerAttackRelease(note.pitch, durationSec, time);
          }
          setFlashingKeys(prev => ({ ...prev, [note.pitch]: tracks[note.trackId]?.color || '#fff' }));
          setTimeout(() => {
            setFlashingKeys(prev => {
              const next = { ...prev };
              delete next[note.pitch];
              return next;
            });
          }, note.duration * 0.5);
        }, scheduleTime);
        metronomeEventsRef.current.push(eventId);
      });

      if (metronomeEnabled) {
        let beatNum = 0;
        const totalBeats = Math.ceil((maxEndTime - startTimeOffset) / beatMs) + 4;
        for (let i = 0; i < totalBeats; i++) {
          const scheduleTime = (startBeat + i) * (60 / bpm);
          const eventId = transportRef.current!.schedule((time) => {
            if (metronomeSynthRef.current) {
              const freq = beatNum % 4 === 0 ? 1000 : 800;
              metronomeSynthRef.current.triggerAttackRelease(freq, '32n', time);
            }
            beatNum++;
          }, scheduleTime);
          metronomeEventsRef.current.push(eventId);
        }
      }

      playStartTimeRef.current = Tone.now() - (startBeat * (60 / bpm));
      transportRef.current.start();
      setIsPlaying(true);

      const updatePlayhead = () => {
        if (transportRef.current && transportRef.current.state === 'started') {
          const currentTime = Tone.now() - playStartTimeRef.current;
          const currentMs = currentTime * 1000 + startTimeOffset;
          setPlayheadPos(currentMs);
          playheadRef.current = currentMs;

          if (currentMs < maxEndTime) {
            animFrameRef.current = requestAnimationFrame(updatePlayhead);
          } else {
            setIsPlaying(false);
            transportRef.current.stop();
          }
        }
      };
      animFrameRef.current = requestAnimationFrame(updatePlayhead);
    }
  }, [isPlaying, bpm, tracks, metronomeEnabled]);

  const stopPlayback = useCallback(() => {
    if (transportRef.current) {
      transportRef.current.stop();
      transportRef.current.cancel();
    }
    cancelAnimationFrame(animFrameRef.current);
    setIsPlaying(false);
    setPlayheadPos(0);
    playheadRef.current = 0;
  }, []);

  const handleExport = useCallback(() => {
    const exportData = {
      bpm,
      trackCount: tracks.length,
      tracks: tracks.map(t => ({
        id: t.id,
        color: t.color,
        notes: t.notes.map(n => ({
          pitch: n.pitch,
          startTime: n.startTime,
          duration: n.duration
        }))
      })),
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jam_${formatTimestamp()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [bpm, tracks]);

  const handleStaffMouseDown = useCallback((e: React.MouseEvent) => {
    if (!staffRef.current) return;
    const rect = staffRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + staffRef.current.scrollLeft;
    const y = e.clientY - rect.top + staffRef.current.scrollTop;

    const beatMs = 60000 / bpm;
    const timeMs = (x / CELL_WIDTH) * (beatMs / 4);
    const pitch = yToPitch(y, CELL_HEIGHT, 0);
    const quantizedTime = quantizeTime(timeMs, bpm, 4);

    const defaultDuration = beatMs / 2;
    const note: Omit<Note, 'id' | 'trackId'> = {
      pitch,
      startTime: quantizedTime - playheadRef.current,
      duration: defaultDuration
    };

    if (synthRef.current) {
      synthRef.current.triggerAttackRelease(pitch, defaultDuration / 1000);
    }

    const newId = `local_${Date.now()}_${Math.random()}`;
    pushUndo({
      type: 'add',
      noteId: newId,
      newState: { ...note, id: newId, trackId: trackIndex } as Note
    });
    addNote(note);

    setNewNotes(prev => {
      const s = new Set(prev);
      s.add(newId);
      return s;
    });
    setTimeout(() => {
      setNewNotes(prev => {
        const s = new Set(prev);
        s.delete(newId);
        return s;
      });
    }, 150);
  }, [bpm, addNote, pushUndo, trackIndex]);

  const handleNoteMouseDown = useCallback((e: React.MouseEvent, note: Note) => {
    e.stopPropagation();
    if (note.trackId !== trackIndex) return;

    const rect = staffRef.current?.getBoundingClientRect();
    if (!rect) return;

    const isResize = e.clientX - rect.left + staffRef.current!.scrollLeft >
      (getNoteX(note) + getNoteWidth(note) - 8);

    dragStateRef.current = {
      type: isResize ? 'resize' : 'move',
      noteId: note.id,
      startX: e.clientX,
      startY: e.clientY,
      originalNote: { ...note }
    };

    const handleMouseMove = (ev: MouseEvent) => {
      const dx = ev.clientX - dragStateRef.current.startX;
      const dy = ev.clientY - dragStateRef.current.startY;
      const beatMs = 60000 / bpm;
      const timePerPixel = (beatMs / 4) / CELL_WIDTH;

      if (!dragStateRef.current.originalNote) return;
      const orig = dragStateRef.current.originalNote;

      if (dragStateRef.current.type === 'move') {
        const newStartTime = Math.max(0, orig.startTime + dx * timePerPixel);
        const newY = pitchToY(orig.pitch, CELL_HEIGHT, 0) + dy;
        const newPitch = yToPitch(newY, CELL_HEIGHT, 0);
        updateNote(note.id, { startTime: Math.round(newStartTime / 50) * 50, pitch: newPitch });
      } else if (dragStateRef.current.type === 'resize') {
        const newDuration = Math.max(50, orig.duration + dx * timePerPixel);
        updateNote(note.id, { duration: Math.round(newDuration / 50) * 50 });
      }
    };

    const handleMouseUp = () => {
      if (dragStateRef.current.originalNote && dragStateRef.current.noteId) {
        const orig = dragStateRef.current.originalNote;
        const currentTrack = tracks.find(t => t.id === trackIndex);
        const current = currentTrack?.notes.find(n => n.id === orig.id);
        if (current && (current.startTime !== orig.startTime || current.pitch !== orig.pitch || current.duration !== orig.duration)) {
          pushUndo({
            type: 'update',
            noteId: orig.id,
            previousState: orig,
            newState: current
          });
        }
      }
      dragStateRef.current = { type: null, noteId: null, startX: 0, startY: 0, originalNote: null };
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [bpm, trackIndex, tracks, updateNote, pushUndo]);

  const handleNoteRightClick = useCallback((e: React.MouseEvent, note: Note) => {
    e.preventDefault();
    e.stopPropagation();
    if (note.trackId !== trackIndex) return;

    pushUndo({
      type: 'delete',
      noteId: note.id,
      previousState: note
    });
    deleteNote(note.id);
  }, [trackIndex, deleteNote, pushUndo]);

  const getNoteX = (note: Note) => {
    const beatMs = 60000 / bpm;
    return ((note.startTime + playheadRef.current) / (beatMs / 4)) * CELL_WIDTH;
  };

  const getNoteWidth = (note: Note) => {
    const beatMs = 60000 / bpm;
    return Math.max(10, (note.duration / (beatMs / 4)) * CELL_WIDTH);
  };

  const allPitches = getAllPitches();
  const whitePitches = allPitches.filter(p => !isBlackKey(p));

  const renderGrid = () => {
    const lines = [];
    const beatMs = 60000 / bpm;
    const cellsPerBeat = 4;
    const totalBeats = 32;
    const totalCells = totalBeats * cellsPerBeat;

    for (let i = 0; i <= totalCells; i++) {
      const x = i * CELL_WIDTH;
      const isBeat = i % cellsPerBeat === 0;
      lines.push(
        <div key={`v-${i}`} style={{
          position: 'absolute',
          left: x,
          top: 0,
          width: 1,
          height: STAFF_HEIGHT,
          background: isBeat ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
          opacity: isBeat ? 0.3 : 0.2
        }} />
      );
    }

    for (let i = 0; i <= TOTAL_PITCHES; i++) {
      const y = i * CELL_HEIGHT;
      const midi = pitchToMidi(PITCH_RANGE.max) - i;
      const pitch = midiToPitch(midi);
      const isC = pitch.startsWith('C') && !isBlackKey(pitch);
      lines.push(
        <div key={`h-${i}`} style={{
          position: 'absolute',
          left: 0,
          top: y,
          width: totalCells * CELL_WIDTH + 100,
          height: 1,
          background: isC ? 'rgba(0, 212, 255, 0.2)' : 'rgba(255,255,255,0.05)',
          opacity: isC ? 0.4 : 0.2
        }} />
      );
    }

    return lines;
  };

  const renderPianoLabels = () => {
    return whitePitches.map((pitch, i) => (
      <div key={pitch} style={{
        position: 'absolute',
        left: 0,
        top: pitchToY(pitch, CELL_HEIGHT, 0),
        width: PIANO_WIDTH,
        height: CELL_HEIGHT * 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingRight: 8,
        fontSize: 10,
        color: pitch.startsWith('C') ? '#00d4ff' : '#5a6a8a',
        borderBottom: '1px solid rgba(255,255,255,0.03)',
        pointerEvents: 'none'
      }}>
        {pitch}
      </div>
    ));
  };

  const renderNotes = () => {
    const elements: JSX.Element[] = [];
    tracks.forEach(track => {
      track.notes.forEach(note => {
        const x = getNoteX(note);
        const y = pitchToY(note.pitch, CELL_HEIGHT, 0);
        const width = getNoteWidth(note);
        const isNew = newNotes.has(note.id);
        const isMine = note.trackId === trackIndex;

        elements.push(
          <div
            key={note.id}
            onMouseDown={(e) => handleNoteMouseDown(e, note)}
            onContextMenu={(e) => handleNoteRightClick(e, note)}
            style={{
              position: 'absolute',
              left: x,
              top: y + 1,
              width,
              height: CELL_HEIGHT - 2,
              background: track.color,
              borderRadius: 3,
              cursor: isMine ? (note.trackId === trackIndex ? 'move' : 'default') : 'default',
              opacity: track.muted ? 0.3 : 0.9,
              boxShadow: `0 0 8px ${track.color}40`,
              border: isMine ? `1px solid ${track.color}` : '1px solid transparent',
              animation: isNew ? 'scaleIn 0.15s ease-out' : undefined,
              zIndex: 10
            }}
          >
            <div style={{
              position: 'absolute',
              right: 0,
              top: 0,
              width: 6,
              height: '100%',
              cursor: isMine ? 'ew-resize' : 'default',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '0 3px 3px 0'
            }} />
          </div>
        );
      });
    });
    return elements;
  };

  const renderCursors = () => {
    return users
      .filter(u => u.cursorX !== undefined && u.cursorY !== undefined)
      .map(user => (
        <div
          key={user.id}
          style={{
            position: 'absolute',
            left: user.cursorX,
            top: user.cursorY,
            pointerEvents: 'none',
            zIndex: 20
          }}
        >
          <div style={{
            width: 12,
            height: 12,
            border: `2px solid ${user.color}`,
            borderRadius: '50%',
            background: `${user.color}30`
          }} />
          <div style={{
            position: 'absolute',
            left: 14,
            top: -4,
            fontSize: 10,
            color: user.color,
            whiteSpace: 'nowrap',
            textShadow: '0 1px 2px rgba(0,0,0,0.8)'
          }}>
            {user.name}
          </div>
        </div>
      ));
  };

  const renderVirtualKeyboard = () => {
    const displayPitches = getAllPitches('C4', 'B5');
    const displayWhiteKeys = displayPitches.filter(p => !isBlackKey(p));

    return (
      <div style={{
        height: WHITE_KEY_HEIGHT + 20,
        background: '#0f3460',
        padding: '10px 20px',
        display: 'flex',
        justifyContent: 'center',
        position: 'relative',
        borderTop: '1px solid rgba(0, 212, 255, 0.2)'
      }}>
        <div style={{ position: 'relative', display: 'flex' }}>
          {displayWhiteKeys.map((pitch, i) => {
            const isActive = activeNotes.has(pitch);
            const flashColor = flashingKeys[pitch];
            return (
              <div
                key={pitch}
                onMouseDown={() => triggerNote(pitch)}
                onMouseUp={() => releaseNote(pitch)}
                onMouseLeave={() => { if (activeNotes.has(pitch)) releaseNote(pitch); }}
                style={{
                  width: WHITE_KEY_WIDTH,
                  height: WHITE_KEY_HEIGHT,
                  background: isActive || flashColor
                    ? (flashColor || color)
                    : 'linear-gradient(180deg, #e8e8e8 0%, #c8c8c8 100%)',
                  border: '1px solid #333',
                  borderRight: i < displayWhiteKeys.length - 1 ? 'none' : '1px solid #333',
                  borderRadius: '0 0 4px 4px',
                  cursor: 'pointer',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'center',
                  paddingBottom: 8,
                  fontSize: 10,
                  color: isActive || flashColor ? '#fff' : '#666',
                  fontWeight: 600,
                  transition: 'all 0.05s',
                  userSelect: 'none'
                }}
              >
                {pitch}
              </div>
            );
          })}

          {displayPitches.filter(p => isBlackKey(p)).map((pitch) => {
            const noteLetter = pitch.slice(0, -1);
            const whiteIndex = displayWhiteKeys.findIndex(w => w.startsWith(noteLetter.replace('#', '')));
            if (whiteIndex === -1) return null;

            const isActive = activeNotes.has(pitch);
            const flashColor = flashingKeys[pitch];

            return (
              <div
                key={pitch}
                onMouseDown={() => triggerNote(pitch)}
                onMouseUp={() => releaseNote(pitch)}
                onMouseLeave={() => { if (activeNotes.has(pitch)) releaseNote(pitch); }}
                style={{
                  position: 'absolute',
                  left: (whiteIndex + 1) * WHITE_KEY_WIDTH - BLACK_KEY_WIDTH / 2,
                  top: 0,
                  width: BLACK_KEY_WIDTH,
                  height: BLACK_KEY_HEIGHT,
                  background: isActive || flashColor
                    ? (flashColor || color)
                    : 'linear-gradient(180deg, #333 0%, #111 100%)',
                  borderRadius: '0 0 3px 3px',
                  cursor: 'pointer',
                  zIndex: 5,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'center',
                  paddingBottom: 4,
                  fontSize: 9,
                  color: '#888',
                  userSelect: 'none'
                }}
              />
            );
          })}
        </div>
      </div>
    );
  };

  const handleStaffMouseMove = useCallback((e: React.MouseEvent) => {
    if (!staffRef.current) return;
    const rect = staffRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + staffRef.current.scrollLeft;
    const y = e.clientY - rect.top + staffRef.current.scrollTop;
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div style={{
        height: 60,
        background: 'rgba(22, 33, 62, 0.9)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(0, 212, 255, 0.15)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: 20
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={togglePlay}
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: isPlaying
                ? 'linear-gradient(135deg, #ff4757, #ff6b7a)'
                : 'linear-gradient(135deg, #2ed573, #7bed9f)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 18,
              animation: isPlaying ? 'none' : 'bounce 2s infinite',
              boxShadow: isPlaying
                ? '0 0 15px rgba(255, 71, 87, 0.4)'
                : '0 0 15px rgba(46, 213, 115, 0.4)',
              transition: 'all 0.2s'
            }}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>

          <button
            onClick={stopPlayback}
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              cursor: 'pointer',
              color: '#e0e0e0',
              fontSize: 14
            }}
          >
            ⏹
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            style={{
              padding: '8px 14px',
              background: undoStack.length === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(0, 212, 255, 0.15)',
              border: '1px solid rgba(0, 212, 255, 0.3)',
              borderRadius: 6,
              color: undoStack.length === 0 ? '#555' : '#00d4ff',
              cursor: undoStack.length === 0 ? 'not-allowed' : 'pointer',
              fontSize: 13
            }}
          >
            ↶ Undo
          </button>
          <button
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            style={{
              padding: '8px 14px',
              background: redoStack.length === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(0, 212, 255, 0.15)',
              border: '1px solid rgba(0, 212, 255, 0.3)',
              borderRadius: 6,
              color: redoStack.length === 0 ? '#555' : '#00d4ff',
              cursor: redoStack.length === 0 ? 'not-allowed' : 'pointer',
              fontSize: 13
            }}
          >
            ↷ Redo
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 14px',
            background: 'rgba(0, 212, 255, 0.08)',
            borderRadius: 8,
            border: '1px solid rgba(0, 212, 255, 0.2)'
          }}>
            <span style={{ color: '#8892b0', fontSize: 12 }}>BPM</span>
            <input
              type="range"
              min={40}
              max={200}
              step={5}
              value={bpm}
              onChange={e => setBpm(Number(e.target.value))}
              style={{
                width: 100,
                accentColor: '#00d4ff'
              }}
            />
            <span style={{
              color: '#00d4ff',
              fontWeight: 700,
              fontSize: 18,
              minWidth: 45,
              textAlign: 'center',
              animation: 'pulse 2s infinite'
            }}>
              {bpm}
            </span>
          </div>

          <button
            onClick={() => setMetronomeEnabled(!metronomeEnabled)}
            style={{
              padding: '8px 14px',
              background: metronomeEnabled ? 'rgba(46, 213, 115, 0.15)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${metronomeEnabled ? 'rgba(46, 213, 115, 0.4)' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: 6,
              color: metronomeEnabled ? '#2ed573' : '#666',
              cursor: 'pointer',
              fontSize: 13
            }}
          >
            🥁 节拍器 {metronomeEnabled ? 'ON' : 'OFF'}
          </button>
        </div>

        <div style={{ flex: 1 }} />

        <button
          onClick={handleExport}
          style={{
            padding: '10px 20px',
            background: 'linear-gradient(90deg, #00d4ff, #0099cc)',
            border: 'none',
            borderRadius: 8,
            color: '#1a1a2e',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          ⬇ 导出 JSON
        </button>
      </div>

      <div
        ref={staffRef}
        onMouseDown={handleStaffMouseDown}
        onMouseMove={handleStaffMouseMove}
        style={{
          flex: 1,
          overflow: 'auto',
          background: '#1a1a2e',
          position: 'relative',
          minHeight: 0
        }}
      >
        <div style={{
          position: 'relative',
          width: 'max-content',
          minWidth: '100%',
          paddingLeft: PIANO_WIDTH + 10
        }}>
          {renderGrid()}
          {renderPianoLabels()}
          {renderNotes()}
          {renderCursors()}

          <div style={{
            position: 'absolute',
            left: PIANO_WIDTH + 10 + (playheadPos / (60000 / bpm / 4)) * CELL_WIDTH,
            top: 0,
            width: 2,
            height: STAFF_HEIGHT,
            background: '#ff4757',
            boxShadow: '0 0 10px #ff475780',
            pointerEvents: 'none',
            zIndex: 15
          }}>
            <div style={{
              position: 'absolute',
              top: -6,
              left: -5,
              width: 12,
              height: 12,
              background: '#ff4757',
              borderRadius: '50%'
            }} />
          </div>
        </div>
      </div>

      {renderVirtualKeyboard()}
    </div>
  );
}
