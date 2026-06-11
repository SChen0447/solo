import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { saveAs } from 'file-saver';
import { TeaType, TEA_INFO, blendTeaColor, hexToRgb, BrewRecord } from '../store';

interface BrewCardProps {
  teaType: TeaType;
  waterTemp: number;
  brewTime: number;
  onClose: () => void;
  onSave: (record: Omit<BrewRecord, 'id' | 'date'>) => void;
  existingRecord?: BrewRecord;
}

const CARD_W = 340;
const CARD_H = 480;
const CANVAS_H = 160;

const BrewCard: React.FC<BrewCardProps> = ({ teaType, waterTemp, brewTime, onClose, onSave, existingRecord }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const lastTimeRef = useRef<number>(0);
  const [saved, setSaved] = useState(false);

  const info = TEA_INFO[teaType];
  const blendedColor = blendTeaColor(teaType, waterTemp);
  const rgbStr = hexToRgb(blendedColor);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(58, 42, 26, 0.6)';

    if (existingRecord?.note) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
      };
      img.src = existingRecord.note;
    }
  }, [existingRecord]);

  const getPos = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      const touch = e.touches[0];
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  }, []);

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    isDrawingRef.current = true;
    lastPosRef.current = getPos(e);
    lastTimeRef.current = Date.now();
  }, [getPos]);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);
    const now = Date.now();
    const dt = Math.max(now - lastTimeRef.current, 1);
    const dx = pos.x - (lastPosRef.current?.x ?? pos.x);
    const dy = pos.y - (lastPosRef.current?.y ?? pos.y);
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = dist / dt;
    const lineWidth = Math.max(1.5, Math.min(6, 8 - speed * 3));
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(lastPosRef.current?.x ?? pos.x, lastPosRef.current?.y ?? pos.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPosRef.current = pos;
    lastTimeRef.current = now;
  }, [getPos]);

  const endDraw = useCallback(() => {
    isDrawingRef.current = false;
    lastPosRef.current = null;
  }, []);

  const handleSave = useCallback(() => {
    const startTime = performance.now();

    const offscreen = document.createElement('canvas');
    offscreen.width = CARD_W * 2;
    offscreen.height = CARD_H * 2;
    const octx = offscreen.getContext('2d')!;

    octx.scale(2, 2);

    const bgGrad = octx.createLinearGradient(0, 0, 0, CARD_H);
    bgGrad.addColorStop(0, '#faf0dc');
    bgGrad.addColorStop(1, '#f0e4c8');
    octx.fillStyle = bgGrad;
    octx.fillRect(0, 0, CARD_W, CARD_H);

    for (let i = 0; i < 200; i++) {
      octx.fillStyle = `rgba(180,160,130,${Math.random() * 0.06})`;
      octx.fillRect(
        Math.random() * CARD_W,
        Math.random() * CARD_H,
        Math.random() * 3 + 1,
        Math.random() * 3 + 1
      );
    }

    octx.fillStyle = '#3a2a1a';
    octx.font = '20px "Noto Serif JP", serif';
    octx.fillText('品鑑記録', 24, 40);

    octx.fillStyle = blendedColor;
    octx.fillRect(24, 55, 28, 28);
    octx.strokeStyle = 'rgba(0,0,0,0.15)';
    octx.strokeRect(24, 55, 28, 28);
    octx.font = '14px monospace';
    octx.fillStyle = '#5a4a3a';
    octx.fillText(`${blendedColor}  rgb(${rgbStr})`, 62, 73);

    octx.font = '14px "Noto Serif JP", serif';
    octx.fillStyle = '#5a4a3a';
    octx.fillText(`茶葉：${info.name}`, 24, 110);
    octx.fillText(`水温：${waterTemp}℃`, 24, 135);
    const brewSec = Math.round(brewTime / 1000);
    octx.fillText(`冲泡：${brewSec}秒`, 24, 160);

    const canvas = canvasRef.current;
    if (canvas) {
      octx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 24, 185, CARD_W - 48, CANVAS_H);
    }

    octx.strokeStyle = 'rgba(100,80,60,0.3)';
    octx.lineWidth = 1;
    octx.setLineDash([4, 4]);
    octx.strokeRect(24, 185, CARD_W - 48, CANVAS_H);
    octx.setLineDash([]);

    const noteDataUrl = canvas?.toDataURL('image/png') ?? '';

    offscreen.toBlob((blob) => {
      if (blob) {
        saveAs(blob, `茶鑑_${info.name}_${Date.now()}.png`);
      }
      onSave({
        teaType,
        waterTemp,
        brewTime,
        teaColorHex: blendedColor,
        teaColorRgb: `rgb(${rgbStr})`,
        note: noteDataUrl,
      });
      setSaved(true);
      const elapsed = performance.now() - startTime;
      console.log(`Save completed in ${elapsed.toFixed(1)}ms`);
    }, 'image/png');
  }, [teaType, waterTemp, brewTime, blendedColor, rgbStr, info.name, onSave]);

  const brewSec = Math.round(brewTime / 1000);

  return (
    <motion.div
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 60 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      style={{
        position: 'relative',
        width: CARD_W,
        background: 'linear-gradient(180deg, #faf0dc, #f0e4c8)',
        borderRadius: 12,
        padding: 24,
        boxShadow: '0 8px 40px rgba(0,0,0,0.2), 0 2px 8px rgba(0,0,0,0.1)',
        fontFamily: "'Noto Serif JP', serif",
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          background: 'none',
          border: 'none',
          fontSize: 18,
          cursor: 'pointer',
          color: '#8a7a6a',
          lineHeight: 1,
        }}
      >
        ✕
      </button>

      <div style={{ fontSize: 18, color: '#3a2a1a', marginBottom: 12, letterSpacing: 3 }}>
        品鑑記録
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 4,
            background: blendedColor,
            border: '1px solid rgba(0,0,0,0.15)',
          }}
        />
        <div style={{ fontSize: 13, color: '#5a4a3a' }}>
          <div style={{ fontFamily: 'monospace' }}>{blendedColor}</div>
          <div style={{ fontFamily: 'monospace', color: '#8a7a6a', fontSize: 11 }}>rgb({rgbStr})</div>
        </div>
      </div>

      <div style={{ fontSize: 14, color: '#5a4a3a', lineHeight: 1.8 }}>
        <div>茶葉：{info.name}</div>
        <div>水温：{waterTemp}℃</div>
        <div>冲泡：{brewSec}秒</div>
      </div>

      <div style={{ marginTop: 16, position: 'relative' }}>
        <div style={{ fontSize: 12, color: '#8a7a6a', marginBottom: 6 }}>手書き感想</div>
        <canvas
          ref={canvasRef}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
          style={{
            width: '100%',
            height: CANVAS_H,
            border: '1px dashed rgba(100,80,60,0.3)',
            borderRadius: 6,
            cursor: 'crosshair',
            background: 'rgba(255,252,245,0.5)',
            touchAction: 'none',
          }}
        />
      </div>

      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={handleSave}
        disabled={saved}
        style={{
          marginTop: 16,
          width: '100%',
          padding: '10px 0',
          background: saved
            ? 'linear-gradient(135deg, #8a9a7a, #6a7a5a)'
            : 'linear-gradient(135deg, #5a4a3a, #3a2a1a)',
          color: '#f5f0e8',
          border: 'none',
          borderRadius: 8,
          fontSize: 14,
          fontFamily: "'Noto Serif JP', serif",
          cursor: saved ? 'default' : 'pointer',
          letterSpacing: 3,
        }}
      >
        {saved ? '保存済み' : '保 存'}
      </motion.button>
    </motion.div>
  );
};

export default BrewCard;
