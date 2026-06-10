import React, { useEffect, useRef } from 'react';
import type { RecordingRecord } from '../types';

interface CompareViewProps {
  recordings: RecordingRecord[];
}

export default function CompareView({ recordings }: CompareViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    draw();
  }, [recordings]);

  const draw = () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const padding = { top: 20, right: 20, bottom: 40, left: 60 };
    const plotW = w - padding.left - padding.right;
    const plotH = h - padding.top - padding.bottom;

    ctx.fillStyle = '#0f1120';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#1e2030';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (i / 5) * plotH;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();

      ctx.fillStyle = '#6b7280';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'right';
      const freq = 4000 - (i / 5) * 4000;
      ctx.fillText(`${Math.round(freq)}Hz`, padding.left - 8, y + 3);
    }

    const maxDuration = Math.max(...recordings.map(r => r.duration), 1);
    for (let i = 0; i <= 5; i++) {
      const x = padding.left + (i / 5) * plotW;
      const t = (i / 5) * maxDuration;
      ctx.fillStyle = '#6b7280';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(t.toFixed(1) + 's', x, h - padding.bottom + 16);
    }

    if (recordings.length === 0) {
      ctx.fillStyle = '#6b7280';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('请从左侧选择两条录音进行对比', w / 2, h / 2);
      return;
    }

    if (recordings.length === 1) {
      ctx.fillStyle = '#6b7280';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('请再选择一条录音进行对比', w / 2, h / 2);
    }

    const colors = [
      { line: '#00d4ff', diff: '#00cc99', name: '录音 A' },
      { line: '#ff00d4', diff: '#ff3366', name: '录音 B' }
    ];

    const curves = recordings.map((r, idx) => {
      return r.voiceprint.points.map(p => {
        const x = padding.left + (p.time / maxDuration) * plotW;
        const clampedFreq = Math.min(Math.max(p.frequency, 0), 4000);
        const y = padding.top + (1 - clampedFreq / 4000) * plotH;
        return { x, y, time: p.time, freq: clampedFreq, energy: p.energy };
      });
    });

    if (curves.length === 2 && curves[0].length > 0 && curves[1].length > 0) {
      const [c1, c2] = curves;
      const len1 = c1.length;
      const len2 = c2.length;
      const maxLen = Math.max(len1, len2);

      ctx.beginPath();
      let started = false;
      for (let i = 0; i < maxLen; i++) {
        const idx1 = Math.min(Math.floor((i / maxLen) * len1), len1 - 1);
        const idx2 = Math.min(Math.floor((i / maxLen) * len2), len2 - 1);
        const p1 = c1[idx1];
        const p2 = c2[idx2];
        if (!p1 || !p2) continue;
        const diff = Math.abs(p1.freq - p2.freq);
        if (diff < 300) {
          const x = (p1.x + p2.x) / 2;
          const topY = Math.min(p1.y, p2.y);
          const bottomY = Math.max(p1.y, p2.y);
          if (!started) { ctx.moveTo(x, topY); started = true; }
          else ctx.lineTo(x, topY);
        } else {
          started = false;
        }
      }
      for (let i = maxLen - 1; i >= 0; i--) {
        const idx1 = Math.min(Math.floor((i / maxLen) * len1), len1 - 1);
        const idx2 = Math.min(Math.floor((i / maxLen) * len2), len2 - 1);
        const p1 = c1[idx1];
        const p2 = c2[idx2];
        if (!p1 || !p2) continue;
        const diff = Math.abs(p1.freq - p2.freq);
        if (diff < 300) {
          const x = (p1.x + p2.x) / 2;
          const bottomY = Math.max(p1.y, p2.y);
          ctx.lineTo(x, bottomY);
        }
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.fill();
    }

    curves.forEach((curve, curveIdx) => {
      if (curve.length < 2) return;
      const color = colors[curveIdx] || colors[0];

      for (let i = 0; i < curve.length - 1; i++) {
        const p1 = curve[i];
        const p2 = curve[i + 1];
        const progress = i / (curve.length - 1);

        if (curves.length === 2 && curveIdx === 1) {
          const c0 = curves[0];
          if (c0 && c0.length > 0) {
            const idx0 = Math.min(Math.floor(progress * (c0.length - 1)), c0.length - 1);
            const p0 = c0[idx0];
            if (p0 && Math.abs(p0.freq - p1.freq) > 300) {
              ctx.beginPath();
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.strokeStyle = color.diff;
              ctx.lineWidth = 3;
              ctx.globalAlpha = 0.8;
              ctx.stroke();
              ctx.globalAlpha = 1;
              continue;
            }
          }
        }
        if (curves.length === 2 && curveIdx === 0) {
          const c1 = curves[1];
          if (c1 && c1.length > 0) {
            const idx1 = Math.min(Math.floor(progress * (c1.length - 1)), c1.length - 1);
            const p1b = c1[idx1];
            if (p1b && Math.abs(p1b.freq - p1.freq) > 300) {
              ctx.beginPath();
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.strokeStyle = color.diff;
              ctx.lineWidth = 3;
              ctx.globalAlpha = 0.8;
              ctx.stroke();
              ctx.globalAlpha = 1;
              continue;
            }
          }
        }

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = color.line;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.5;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      for (let i = 0; i < curve.length; i += Math.max(1, Math.floor(curve.length / 60))) {
        const p = curve[i];
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = color.line;
        ctx.globalAlpha = 0.6;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    });

    if (recordings.length > 0) {
      const legendY = padding.top + 10;
      recordings.forEach((r, idx) => {
        const color = colors[idx] || colors[0];
        const x = w - padding.right - 120;
        const y = legendY + idx * 22;
        ctx.fillStyle = color.line;
        ctx.fillRect(x, y, 16, 3);
        ctx.fillStyle = '#e0e0e0';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'left';
        const title = r.title.length > 16 ? r.title.slice(0, 16) + '...' : r.title;
        ctx.fillText(`${color.name}: ${title}`, x + 22, y + 4);
      });
    }
  };

  if (recordings.length === 0) {
    return (
      <div style={{
        height: '100%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', color: '#6b7280', gap: 16
      }}>
        <div style={{ fontSize: 48 }}>⇄</div>
        <div style={{ fontSize: 16 }}>对比模式</div>
        <div style={{ fontSize: 13 }}>请从左侧录音列表勾选两条录音进行对比</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, height: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: 18, color: '#e0e0e0', margin: 0 }}>声纹对比</h2>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 16, height: 3, background: '#00d4ff' }} />
            <span style={{ fontSize: 12, color: '#a0a0b0' }}>
              A: {recordings[0]?.title.slice(0, 20) || '-'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 16, height: 3, background: '#ff00d4' }} />
            <span style={{ fontSize: 12, color: '#a0a0b0' }}>
              B: {recordings[1]?.title.slice(0, 20) || '-'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 16, height: 8, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)' }} />
            <span style={{ fontSize: 12, color: '#a0a0b0' }}>相似区域</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 16, height: 3, background: '#ff3366' }} />
            <span style={{ fontSize: 12, color: '#a0a0b0' }}>差异(A/B)</span>
          </div>
        </div>
      </div>

      <div
        ref={containerRef}
        style={{ flex: 1, minHeight: 0, background: '#0f1120', borderRadius: 8, overflow: 'hidden' }}
      >
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
      </div>

      {recordings.length < 2 && (
        <div style={{
          padding: 16, background: '#1e2030', borderRadius: 8,
          textAlign: 'center', color: '#6b7280', fontSize: 13
        }}>
          请再选择 <strong style={{ color: '#00d4ff' }}>{2 - recordings.length}</strong> 条录音进行对比
        </div>
      )}
    </div>
  );
}
