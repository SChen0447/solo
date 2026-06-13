import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { Note } from '../services/apiService';

interface SheetMusicProps {
  notes: Note[];
  bpm?: number;
  key?: string;
  currentTime?: number;
}

const NOTE_ORDER = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

const noteToLinePosition = (name: string, octave: number): number => {
  const noteIdx = NOTE_ORDER.indexOf(name);
  const baseOctave = 4;
  const octaveDiff = octave - baseOctave;
  return octaveDiff * 7 + noteIdx;
};

const SheetMusic: React.FC<SheetMusicProps> = ({ notes, bpm, key, currentTime = 0 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });
  const [animationPhase, setAnimationPhase] = useState(0);
  const noteAnimationsRef = useRef<number[]>([]);

  const resize = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDimensions({
        width: Math.max(600, rect.width - 40),
        height: Math.max(300, rect.height - 40),
      });
    }
  }, []);

  useEffect(() => {
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [resize]);

  useEffect(() => {
    noteAnimationsRef.current = notes.map(() => 0);
    let startTime: number | null = null;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const duration = 500;
      const progress = Math.min(elapsed / duration, 1);
      setAnimationPhase(progress);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [notes.length]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = dimensions;
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const woodGradient = ctx.createLinearGradient(0, 0, 0, height);
    woodGradient.addColorStop(0, '#5d4037');
    woodGradient.addColorStop(0.3, '#6d4c41');
    woodGradient.addColorStop(0.5, '#4e342e');
    woodGradient.addColorStop(0.7, '#5d4037');
    woodGradient.addColorStop(1, '#3e2723');
    ctx.fillStyle = woodGradient;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i < height; i += 6) {
      ctx.beginPath();
      ctx.moveTo(0, i + Math.sin(i * 0.1) * 2);
      ctx.lineTo(width, i + Math.sin((i + width) * 0.1) * 2);
      ctx.stroke();
    }

    const paddingX = 60;
    const centerY = height / 2;
    const lineSpacing = 12;
    const staffTop = centerY - lineSpacing * 2;

    ctx.strokeStyle = '#2c1810';
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 5; i++) {
      const y = staffTop + i * lineSpacing;
      ctx.beginPath();
      ctx.moveTo(paddingX - 20, y);
      ctx.lineTo(width - 20, y);
      ctx.stroke();
    }

    ctx.strokeStyle = '#2c1810';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(paddingX - 20, staffTop);
    ctx.lineTo(paddingX - 20, staffTop + 4 * lineSpacing);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(width - 20, staffTop);
    ctx.lineTo(width - 20, staffTop + 4 * lineSpacing);
    ctx.stroke();

    ctx.fillStyle = '#1a0f0a';
    ctx.font = `bold ${lineSpacing * 4}px serif`;
    ctx.fillText('𝄞', paddingX - 10, centerY + lineSpacing * 1.2);

    if (key || bpm) {
      ctx.fillStyle = '#2c1810';
      ctx.font = '14px -apple-system, sans-serif';
      let infoY = staffTop - 20;
      if (key) {
        ctx.fillText(`调：${key}`, paddingX + 20, infoY);
      }
      if (bpm) {
        ctx.fillText(`♩ = ${bpm}`, width - 100, infoY);
      }
    }

    if (notes.length === 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '16px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('录制并解析后，音符将显示在此处', width / 2, centerY);
      ctx.textAlign = 'left';
      return;
    }

    const totalDuration = notes.reduce(
      (max, n) => Math.max(max, n.start + n.duration),
      0
    );
    const staffWidth = width - paddingX - 40;
    const pxPerSecond = Math.max(40, staffWidth / Math.max(totalDuration, 8));

    notes.forEach((note, idx) => {
      const pos = noteToLinePosition(note.name, note.octave);
      const y = centerY - (pos - 2) * (lineSpacing / 2);
      const x = paddingX + note.start * pxPerSecond;
      const noteWidth = Math.max(20, note.duration * pxPerSecond);

      const noteProgress = Math.min(1, Math.max(0, (animationPhase * notes.length - idx + 0.5) / 1.5));
      const ease = 1 - Math.pow(1 - noteProgress, 3);
      const dropY = y - 30 * (1 - ease);
      const scale = noteProgress < 1 ? 0.5 + 0.5 * ease - Math.sin(noteProgress * Math.PI) * 0.1 : 1;

      const ledgerLinesAbove = Math.max(0, Math.floor(-(pos - 5) / 2));
      const ledgerLinesBelow = Math.max(0, Math.floor((pos - 6) / 2));
      ctx.strokeStyle = '#2c1810';
      ctx.lineWidth = 1;
      for (let l = 0; l < ledgerLinesAbove; l++) {
        const ly = staffTop - (l + 1) * lineSpacing;
        ctx.beginPath();
        ctx.moveTo(x - 8, ly);
        ctx.lineTo(x + 8, ly);
        ctx.stroke();
      }
      for (let l = 0; l < ledgerLinesBelow; l++) {
        const ly = staffTop + 4 * lineSpacing + (l + 1) * lineSpacing;
        ctx.beginPath();
        ctx.moveTo(x - 8, ly);
        ctx.lineTo(x + 8, ly);
        ctx.stroke();
      }

      ctx.save();
      ctx.translate(x, dropY);
      ctx.scale(scale, scale);

      ctx.fillStyle = '#0a0a0a';
      ctx.beginPath();
      ctx.ellipse(0, 0, 8, 6, -0.15, 0, Math.PI * 2);
      ctx.fill();

      const stemUp = pos < 6;
      const stemColor = stemUp ? '#ffd700' : '#c0c0c0';
      ctx.strokeStyle = stemColor;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      if (stemUp) {
        ctx.moveTo(7, -2);
        ctx.lineTo(7, -lineSpacing * 3);
      } else {
        ctx.moveTo(-7, 2);
        ctx.lineTo(-7, lineSpacing * 3);
      }
      ctx.stroke();

      const isEighth = note.duration <= 0.5;
      const isSixteenth = note.duration <= 0.25;
      if (isEighth || isSixteenth) {
        ctx.strokeStyle = stemColor;
        ctx.lineWidth = 1.5;
        const flagStartX = stemUp ? 7 : -7;
        const flagStartY = stemUp ? -lineSpacing * 3 : lineSpacing * 3;
        const flagDir = stemUp ? 1 : -1;
        ctx.beginPath();
        ctx.moveTo(flagStartX, flagStartY);
        ctx.bezierCurveTo(
          flagStartX + flagDir * 10,
          flagStartY + flagDir * 3,
          flagStartX + flagDir * 12,
          flagStartY + flagDir * 8,
          flagStartX + flagDir * 4,
          flagStartY + flagDir * 10
        );
        ctx.stroke();
        if (isSixteenth) {
          ctx.beginPath();
          ctx.moveTo(flagStartX, flagStartY + flagDir * 6);
          ctx.bezierCurveTo(
            flagStartX + flagDir * 10,
            flagStartY + flagDir * 9,
            flagStartX + flagDir * 12,
            flagStartY + flagDir * 14,
            flagStartX + flagDir * 4,
            flagStartY + flagDir * 16
          );
          ctx.stroke();
        }
      }

      if (note.strength === 'strong') {
        ctx.fillStyle = 'rgba(255, 215, 0, 0.25)';
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      ctx.fillStyle = 'rgba(168, 218, 220, 0.7)';
      ctx.font = '10px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${note.name}${note.octave}`, x, centerY + lineSpacing * 3.5 + 8);
      ctx.textAlign = 'left';
    });

    const playheadX = paddingX + currentTime * pxPerSecond;
    if (currentTime > 0 && playheadX < width - 20) {
      ctx.strokeStyle = 'rgba(0, 180, 216, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, staffTop - 20);
      ctx.lineTo(playheadX, staffTop + 4 * lineSpacing + 20);
      ctx.stroke();

      ctx.fillStyle = '#00b4d8';
      ctx.beginPath();
      ctx.moveTo(playheadX - 6, staffTop - 28);
      ctx.lineTo(playheadX + 6, staffTop - 28);
      ctx.lineTo(playheadX, staffTop - 18);
      ctx.closePath();
      ctx.fill();
    }
  }, [notes, dimensions, bpm, key, currentTime, animationPhase]);

  useEffect(() => {
    let rafId: number;
    const render = () => {
      draw();
      rafId = requestAnimationFrame(render);
    };
    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [draw]);

  return (
    <div
      ref={containerRef}
      className="panel fade-in"
      style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0 }}
    >
      <div className="section-title">五线谱</div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
        <canvas ref={canvasRef} style={{ maxWidth: '100%', maxHeight: '100%' }} />
      </div>
    </div>
  );
};

export default SheetMusic;
