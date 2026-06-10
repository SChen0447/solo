import React, { useRef, useEffect, useState, useCallback } from 'react';
import { FretPosition, getAllFretboardNotes } from './HarmonyEngine';

interface FretboardProps {
  tuning: string[];
  numFrets: number;
  highlightedPositions: FretPosition[];
  highlightMode: 'scale' | 'chord';
  onNoteClick: (note: FretPosition) => void;
  chordName?: string;
}

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 300;
const NECK_PADDING_X = 40;
const NECK_PADDING_Y = 40;
const NUT_WIDTH = 8;

const COLORS = {
  neck: '#d2b48c',
  fret: '#c0c0c0',
  fretWire: '#1a1a1a',
  string: '#808080',
  scaleRoot: '#ff6f00',
  scaleNote: '#42a5f5',
  chordRoot: '#66bb6a',
  chordNote: '#ffee58',
  hover: '#cccccc'
};

const MARKER_FRETS = [3, 5, 7, 9, 12, 15, 17, 19, 21];
const DOUBLE_MARKER_FRETS = [12, 24];

export const Fretboard: React.FC<FretboardProps> = ({
  tuning,
  numFrets,
  highlightedPositions,
  highlightMode,
  onNoteClick,
  chordName
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoverPos, setHoverPos] = useState<{ stringIndex: number; fret: number } | null>(null);
  const [animationState, setAnimationState] = useState<{ phase: 'fadeOut' | 'fadeIn' | 'idle'; progress: number; prevPositions: FretPosition[] }>({
    phase: 'idle',
    progress: 1,
    prevPositions: []
  });
  const animationRef = useRef<number | null>(null);
  const lastPositionsRef = useRef<FretPosition[]>(highlightedPositions);
  const allNotesRef = useRef(getAllFretboardNotes(tuning, numFrets));

  useEffect(() => {
    allNotesRef.current = getAllFretboardNotes(tuning, numFrets);
  }, [tuning, numFrets]);

  const getFretX = useCallback((fret: number, neckWidth: number) => {
    return NECK_PADDING_X + NUT_WIDTH + (fret / numFrets) * (neckWidth - NUT_WIDTH);
  }, [numFrets]);

  const getStringY = useCallback((stringIndex: number, neckHeight: number) => {
    return NECK_PADDING_Y + (stringIndex / (tuning.length - 1)) * neckHeight;
  }, [tuning.length]);

  useEffect(() => {
    const prev = lastPositionsRef.current;
    if (JSON.stringify(prev.map(p => `${p.stringIndex}-${p.fret}`)) !==
        JSON.stringify(highlightedPositions.map(p => `${p.stringIndex}-${p.fret}`))) {
      setAnimationState({
        phase: 'fadeOut',
        progress: 1,
        prevPositions: prev
      });
    }
    lastPositionsRef.current = highlightedPositions;
  }, [highlightedPositions]);

  useEffect(() => {
    if (animationState.phase === 'idle') return;

    let startTime: number | null = null;
    const duration = 300;

    const animate = (timestamp: number) => {
      if (startTime === null) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);

      if (animationState.phase === 'fadeOut') {
        setAnimationState(prev => ({ ...prev, progress: 1 - progress }));
        if (progress >= 1) {
          setAnimationState({
            phase: 'fadeIn',
            progress: 0,
            prevPositions: []
          });
          startTime = null;
        }
      } else if (animationState.phase === 'fadeIn') {
        setAnimationState(prev => ({ ...prev, progress }));
        if (progress >= 1) {
          setAnimationState({
            phase: 'idle',
            progress: 1,
            prevPositions: []
          });
          return;
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animationState.phase]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const neckWidth = CANVAS_WIDTH - NECK_PADDING_X * 2;
    const neckHeight = CANVAS_HEIGHT - NECK_PADDING_Y * 2;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.fillStyle = COLORS.neck;
    ctx.fillRect(NECK_PADDING_X, NECK_PADDING_Y, neckWidth, neckHeight);

    ctx.fillStyle = '#000000';
    ctx.fillRect(NECK_PADDING_X, NECK_PADDING_Y, NUT_WIDTH, neckHeight);

    for (let fret = 1; fret <= numFrets; fret++) {
      const x = getFretX(fret, neckWidth);
      ctx.strokeStyle = COLORS.fretWire;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, NECK_PADDING_Y);
      ctx.lineTo(x, NECK_PADDING_Y + neckHeight);
      ctx.stroke();
    }

    for (const markerFret of MARKER_FRETS) {
      if (markerFret > numFrets) continue;
      const x = (getFretX(markerFret - 1, neckWidth) + getFretX(markerFret, neckWidth)) / 2;
      
      if (DOUBLE_MARKER_FRETS.includes(markerFret)) {
        const y1 = NECK_PADDING_Y + neckHeight * 0.33;
        const y2 = NECK_PADDING_Y + neckHeight * 0.67;
        ctx.fillStyle = COLORS.fret;
        ctx.beginPath();
        ctx.arc(x, y1, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y2, 5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const y = NECK_PADDING_Y + neckHeight / 2;
        ctx.fillStyle = COLORS.fret;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    for (let i = 0; i < tuning.length; i++) {
      const y = getStringY(i, neckHeight);
      const stringThickness = 1 + (i / (tuning.length - 1)) * 2;
      ctx.strokeStyle = COLORS.string;
      ctx.lineWidth = stringThickness;
      ctx.beginPath();
      ctx.moveTo(NECK_PADDING_X, y);
      ctx.lineTo(NECK_PADDING_X + neckWidth, y);
      ctx.stroke();
    }

    const drawHighlightedNote = (pos: FretPosition, alpha: number) => {
      const x = pos.fret === 0
        ? NECK_PADDING_X + NUT_WIDTH / 2
        : (getFretX(pos.fret - 1, neckWidth) + getFretX(pos.fret, neckWidth)) / 2;
      const y = getStringY(pos.stringIndex, neckHeight);

      let color: string;
      if (highlightMode === 'scale') {
        color = pos.isRoot ? COLORS.scaleRoot : COLORS.scaleNote;
      } else {
        color = pos.isRoot ? COLORS.chordRoot : COLORS.chordNote;
      }

      ctx.globalAlpha = alpha * 0.7;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 9, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pos.noteName, x, y);
      ctx.globalAlpha = 1;
    };

    if (animationState.phase === 'fadeOut') {
      for (const pos of animationState.prevPositions) {
        drawHighlightedNote(pos, animationState.progress);
      }
    } else if (animationState.phase === 'fadeIn') {
      for (const pos of highlightedPositions) {
        drawHighlightedNote(pos, animationState.progress);
      }
    } else {
      for (const pos of highlightedPositions) {
        drawHighlightedNote(pos, 1);
      }
    }

    if (hoverPos) {
      const x = hoverPos.fret === 0
        ? NECK_PADDING_X + NUT_WIDTH / 2
        : (getFretX(hoverPos.fret - 1, neckWidth) + getFretX(hoverPos.fret, neckWidth)) / 2;
      const y = getStringY(hoverPos.stringIndex, neckHeight);

      ctx.strokeStyle = COLORS.hover;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    if (highlightMode === 'chord' && chordName) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(chordName, CANVAS_WIDTH / 2, 10);
    }
  }, [tuning, numFrets, highlightedPositions, highlightMode, hoverPos, animationState, chordName, getFretX, getStringY]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const neckWidth = CANVAS_WIDTH - NECK_PADDING_X * 2;
    const neckHeight = CANVAS_HEIGHT - NECK_PADDING_Y * 2;

    if (x < NECK_PADDING_X || x > NECK_PADDING_X + neckWidth ||
        y < NECK_PADDING_Y || y > NECK_PADDING_Y + neckHeight) {
      setHoverPos(null);
      return;
    }

    let closestString = 0;
    let minDist = Infinity;
    for (let i = 0; i < tuning.length; i++) {
      const sy = getStringY(i, neckHeight);
      const dist = Math.abs(y - sy);
      if (dist < minDist) {
        minDist = dist;
        closestString = i;
      }
    }

    let closestFret = 0;
    let minXDist = Infinity;
    for (let f = 0; f <= numFrets; f++) {
      const fx = f === 0
        ? NECK_PADDING_X + NUT_WIDTH / 2
        : (getFretX(f - 1, neckWidth) + getFretX(f, neckWidth)) / 2;
      const dist = Math.abs(x - fx);
      if (dist < minXDist) {
        minXDist = dist;
        closestFret = f;
      }
    }

    if (minDist < 15 && minXDist < 25) {
      setHoverPos({ stringIndex: closestString, fret: closestFret });
    } else {
      setHoverPos(null);
    }
  };

  const handleMouseLeave = () => {
    setHoverPos(null);
  };

  const handleClick = () => {
    if (!hoverPos) return;
    const key = `${hoverPos.stringIndex}-${hoverPos.fret}`;
    const note = allNotesRef.current.get(key);
    if (note) {
      onNoteClick(note);
    }
  };

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      style={{
        width: '100%',
        maxWidth: '900px',
        height: 'auto',
        cursor: 'pointer',
        borderRadius: '8px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
      }}
    />
  );
};

export default Fretboard;
