import React, { useRef, useEffect, useImperativeHandle, forwardRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import html2canvas from 'html2canvas';
import type { Note, ChurchMode } from './melodyEngine';
import { getModeName } from './melodyEngine';

export interface NeumeRendererHandle {
  exportImage: () => Promise<string>;
}

interface NeumeRendererProps {
  notes: Note[];
  mode: ChurchMode;
  currentNoteIndex: number;
  isPlaying: boolean;
}

interface StaffLine {
  y: number;
  color: string;
}

const STAFF_LINE_COUNT = 4;
const STAFF_SPACING = 28;
const NOTE_BASE_SIZE = 14;
const PARCHMENT_COLOR = '#f5e6c8';
const INK_COLOR = '#2c1810';
const HIGHLIGHT_COLOR = '#d4a574';

export const NeumeRenderer = forwardRef<NeumeRendererHandle, NeumeRendererProps>(
  function NeumeRenderer({ notes, mode, currentNoteIndex, isPlaying }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [noteAnimProgress, setNoteAnimProgress] = useState<number[]>([]);
    const animFrameRef = useRef<number>();

    useImperativeHandle(ref, () => ({
      exportImage: async () => {
        if (!containerRef.current) throw new Error('Container not found');
        const canvas = await html2canvas(containerRef.current, {
          backgroundColor: PARCHMENT_COLOR,
          scale: 2,
          useCORS: true,
          logging: false
        });
        return canvas.toDataURL('image/png');
      }
    }));

    const getStaffLines = useCallback((startY: number): StaffLine[] => {
      const lines: StaffLine[] = [];
      for (let i = 0; i < STAFF_LINE_COUNT; i++) {
        lines.push({
          y: startY + i * STAFF_SPACING,
          color: i % 2 === 0 ? '#8b1a1a' : '#4e342e'
        });
      }
      return lines;
    }, []);

    const getYPositionForDegree = useCallback((degree: number, staffTopY: number): number => {
      const centerDegree = 5;
      const degreeDiff = centerDegree - degree;
      return staffTopY + STAFF_SPACING * 1.5 + degreeDiff * (STAFF_SPACING / 2);
    }, []);

    const drawParchmentTexture = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
      ctx.fillStyle = PARCHMENT_COLOR;
      ctx.fillRect(0, 0, width, height);

      for (let i = 0; i < 3000; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const alpha = Math.random() * 0.04;
        const r = 139 + Math.floor(Math.random() * 30);
        const g = 90 + Math.floor(Math.random() * 30);
        const b = 43 + Math.floor(Math.random() * 20);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.fillRect(x, y, 2, 2);
      }

      const gradient = ctx.createRadialGradient(
        width / 2, height / 2, Math.min(width, height) / 3,
        width / 2, height / 2, Math.max(width, height) / 1.2
      );
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(1, 'rgba(120, 80, 40, 0.25)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = '#b8956e';
      ctx.lineWidth = 3;
      ctx.strokeRect(15, 15, width - 30, height - 30);
      ctx.lineWidth = 1;
      ctx.strokeRect(22, 22, width - 44, height - 44);

      const corners = [
        { x: 22, y: 22, dir: { dx: 1, dy: 1 } },
        { x: width - 22, y: 22, dir: { dx: -1, dy: 1 } },
        { x: 22, y: height - 22, dir: { dx: 1, dy: -1 } },
        { x: width - 22, y: height - 22, dir: { dx: -1, dy: -1 } }
      ];

      corners.forEach(({ x, y, dir }) => {
        ctx.beginPath();
        ctx.moveTo(x + dir.dx * 5, y);
        ctx.lineTo(x + dir.dx * 5, y + dir.dy * 15);
        ctx.lineTo(x + dir.dx * 20, y + dir.dy * 15);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y + dir.dy * 5);
        ctx.lineTo(x + dir.dx * 15, y + dir.dy * 5);
        ctx.lineTo(x + dir.dx * 15, y + dir.dy * 20);
        ctx.stroke();
      });
    }, []);

    const drawStaff = useCallback((ctx: CanvasRenderingContext2D, left: number, right: number, topY: number) => {
      const lines = getStaffLines(topY);

      const clefX = left + 30;
      ctx.strokeStyle = '#4e342e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(clefX, lines[0].y - 10);
      ctx.quadraticCurveTo(clefX + 5, lines[1].y, clefX, lines[3].y + 10);
      ctx.lineTo(clefX + 15, lines[3].y + 10);
      ctx.quadraticCurveTo(clefX + 20, lines[3].y, clefX + 15, lines[2].y - 5);
      ctx.stroke();
      ctx.fillStyle = '#4e342e';
      ctx.beginPath();
      ctx.arc(clefX + 15, lines[2].y - 5, 4, 0, Math.PI * 2);
      ctx.fill();

      lines.forEach((line) => {
        ctx.strokeStyle = line.color;
        ctx.lineWidth = 1.2;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(left + 60, line.y);
        ctx.lineTo(right - 30, line.y);
        ctx.stroke();
      });

      ctx.strokeStyle = '#6b4423';
      ctx.lineWidth = 1.5;
      const barLeft = left + 55;
      const barRight = right - 25;
      [barLeft, barRight].forEach((x) => {
        ctx.beginPath();
        ctx.moveTo(x, lines[0].y - 8);
        ctx.lineTo(x, lines[3].y + 8);
        ctx.stroke();
      });
    }, [getStaffLines]);

    const drawNeume = useCallback((
      ctx: CanvasRenderingContext2D,
      note: Note,
      x: number,
      y: number,
      isHighlighted: boolean,
      animProgress: number
    ) => {
      const alpha = animProgress;
      const floatOffset = Math.sin(animProgress * Math.PI) * 3 * (1 - animProgress);
      const actualY = y - floatOffset;
      const size = NOTE_BASE_SIZE + (note.duration - 1) * 2;
      const color = isHighlighted ? HIGHLIGHT_COLOR : INK_COLOR;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.shadowColor = 'rgba(44, 24, 16, 0.3)';
      ctx.shadowBlur = isHighlighted ? 8 : 4;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
      ctx.fillStyle = color;
      ctx.strokeStyle = color;

      switch (note.neumeType) {
        case 'punctum':
          ctx.beginPath();
          ctx.ellipse(x, actualY, size * 0.5, size * 0.4, 0, 0, Math.PI * 2);
          ctx.fill();
          break;

        case 'virga':
          ctx.lineWidth = 3;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(x, actualY + size * 0.8);
          ctx.quadraticCurveTo(x - 2, actualY, x, actualY - size * 0.8);
          ctx.stroke();
          ctx.beginPath();
          ctx.ellipse(x, actualY + size * 0.6, size * 0.35, size * 0.3, 0, 0, Math.PI * 2);
          ctx.fill();
          break;

        case 'podatus':
          ctx.lineWidth = 2.5;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(x - 6, actualY + size * 0.3);
          ctx.quadraticCurveTo(x - 3, actualY - size * 0.2, x + 2, actualY - size * 0.6);
          ctx.stroke();
          ctx.beginPath();
          ctx.ellipse(x - 6, actualY + size * 0.3, size * 0.3, size * 0.28, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(x + 2, actualY - size * 0.6, size * 0.32, size * 0.3, 0, 0, Math.PI * 2);
          ctx.fill();
          break;

        case 'clivis':
          ctx.lineWidth = 2.5;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(x - 6, actualY - size * 0.5);
          ctx.quadraticCurveTo(x - 2, actualY, x + 3, actualY + size * 0.4);
          ctx.stroke();
          ctx.beginPath();
          ctx.ellipse(x - 6, actualY - size * 0.5, size * 0.32, size * 0.3, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(x + 3, actualY + size * 0.4, size * 0.3, size * 0.28, 0, 0, Math.PI * 2);
          ctx.fill();
          break;

        case 'bivirga':
          ctx.lineWidth = 3;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(x - 6, actualY + size * 0.7);
          ctx.quadraticCurveTo(x - 8, actualY - size * 0.2, x - 6, actualY - size);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(x + 6, actualY + size * 0.7);
          ctx.quadraticCurveTo(x + 4, actualY - size * 0.2, x + 6, actualY - size);
          ctx.stroke();
          ctx.beginPath();
          ctx.ellipse(x - 6, actualY + size * 0.5, size * 0.28, size * 0.25, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(x + 6, actualY + size * 0.5, size * 0.28, size * 0.25, 0, 0, Math.PI * 2);
          ctx.fill();
          break;

        case 'bipunctum':
          ctx.beginPath();
          ctx.ellipse(x - 7, actualY, size * 0.35, size * 0.32, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(x + 7, actualY, size * 0.35, size * 0.32, 0, 0, Math.PI * 2);
          ctx.fill();
          break;

        default:
          ctx.beginPath();
          ctx.ellipse(x, actualY, size * 0.5, size * 0.4, 0, 0, Math.PI * 2);
          ctx.fill();
      }

      ctx.restore();
    }, []);

    const draw = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas || notes.length === 0) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      const width = rect.width;
      const height = rect.height;

      drawParchmentTexture(ctx, width, height);

      ctx.font = 'bold 22px "Georgia", "Times New Roman", serif';
      ctx.fillStyle = '#4e342e';
      ctx.textAlign = 'center';
      ctx.fillText(`✠ ${getModeName(mode)} · 格里高利圣咏 ✠`, width / 2, 60);

      ctx.font = 'italic 14px "Georgia", serif';
      ctx.fillStyle = '#6b4423';
      ctx.fillText(`—— 音符数: ${notes.length} · 公元十三世纪抄本 ——`, width / 2, 85);

      const staffTopY = 130;
      const staffLeft = 40;
      const staffRight = width - 40;

      drawStaff(ctx, staffLeft, staffRight, staffTopY);

      const usableWidth = staffRight - staffLeft - 120;
      const spacing = usableWidth / Math.max(notes.length - 1, 1);

      notes.forEach((note, i) => {
        const x = staffLeft + 80 + i * spacing;
        const y = getYPositionForDegree(note.scaleDegree, staffTopY);
        const progress = noteAnimProgress[i] ?? 1;
        const isHighlighted = isPlaying && currentNoteIndex === i;

        drawNeume(ctx, note, x, y, isHighlighted, progress);

        if (note.duration >= 2) {
          ctx.save();
          ctx.globalAlpha = (noteAnimProgress[i] ?? 1) * 0.6;
          ctx.fillStyle = isHighlighted ? HIGHLIGHT_COLOR : '#6b4423';
          ctx.font = '10px "Georgia", serif';
          ctx.textAlign = 'center';
          ctx.fillText('·'.repeat(note.duration - 1), x, y + 28);
          ctx.restore();
        }
      });

      ctx.font = 'italic 12px "Georgia", serif';
      ctx.fillStyle = '#8b6f47';
      ctx.textAlign = 'right';
      ctx.fillText('Soli Deo Gloria', width - 50, height - 35);
    }, [notes, mode, currentNoteIndex, isPlaying, noteAnimProgress, drawParchmentTexture, drawStaff, drawNeume, getYPositionForDegree]);

    useEffect(() => {
      if (notes.length === 0) return;

      setNoteAnimProgress(new Array(notes.length).fill(0));
      const startTime = performance.now();
      const staggerDelay = 60;
      const noteAnimDuration = 500;

      const animate = (now: number) => {
        const elapsed = now - startTime;
        const newProgress = notes.map((_, i) => {
          const noteStart = i * staggerDelay;
          const noteElapsed = elapsed - noteStart;
          if (noteElapsed <= 0) return 0;
          return Math.min(1, noteElapsed / noteAnimDuration);
        });
        setNoteAnimProgress(newProgress);

        if (newProgress.some(p => p < 1)) {
          animFrameRef.current = requestAnimationFrame(animate);
        }
      };

      animFrameRef.current = requestAnimationFrame(animate);

      return () => {
        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current);
        }
      };
    }, [notes]);

    useEffect(() => {
      draw();
    }, [draw]);

    useEffect(() => {
      const handleResize = () => draw();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, [draw]);

    return (
      <motion.div
        ref={containerRef}
        className="neume-scroll-container"
        initial={{ opacity: 0, clipPath: 'polygon(100% 0, 100% 0, 100% 0, 100% 0)' }}
        animate={{
          opacity: notes.length > 0 ? 1 : 0.3,
          clipPath: notes.length > 0
            ? 'polygon(0 0, 100% 0, 100% 100%, 0 100%)'
            : 'polygon(100% 0, 100% 0, 100% 0, 100% 0)'
        }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        style={{
          width: '100%',
          height: '100%',
          minHeight: '500px',
          position: 'relative',
          borderRadius: '8px',
          overflow: 'hidden'
        }}
      >
        {notes.length === 0 ? (
          <div style={{
            width: '100%',
            height: '500px',
            background: PARCHMENT_COLOR,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            borderRadius: '8px',
            border: '3px double #8b6f47'
          }}>
            <div style={{ fontSize: '60px', opacity: 0.4, marginBottom: '20px' }}>📜</div>
            <p style={{
              fontFamily: 'Georgia, "Times New Roman", serif',
              color: '#6b4423',
              fontSize: '18px',
              fontStyle: 'italic'
            }}>
              愿主赐予灵感... 选择调式并生成圣咏
            </p>
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            style={{
              width: '100%',
              height: '500px',
              display: 'block'
            }}
          />
        )}
      </motion.div>
    );
  }
);
