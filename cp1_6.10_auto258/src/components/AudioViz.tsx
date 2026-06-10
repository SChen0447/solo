import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { RecordingRecord } from '../types';

interface AudioVizProps {
  recording: RecordingRecord;
}

export default function AudioViz({ recording }: AudioVizProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spectrumCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; freq: number } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const rafRef = useRef<number>(0);
  const gainRef = useRef<GainNode | null>(null);

  const initAudio = useCallback(async () => {
    if (!recording.audioBlob) return;
    if (audioRef.current) return;

    const url = URL.createObjectURL(recording.audioBlob);
    const audio = new Audio(url);
    audioRef.current = audio;

    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioCtxRef.current = audioCtx;
    const source = audioCtx.createMediaElementSource(audio);
    sourceRef.current = source;
    const gain = audioCtx.createGain();
    gain.gain.value = volume;
    gainRef.current = gain;
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    analyserRef.current = analyser;

    source.connect(gain);
    gain.connect(analyser);
    analyser.connect(audioCtx.destination);

    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime);
    });
    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      setCurrentTime(0);
    });
  }, [recording.audioBlob, volume]);

  const togglePlay = useCallback(async () => {
    await initAudio();
    const audio = audioRef.current;
    if (!audio) return;

    if (audioCtxRef.current?.state === 'suspended') {
      await audioCtxRef.current.resume();
    }

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      await audio.play();
      setIsPlaying(true);
      drawSpectrum();
    }
  }, [initAudio, isPlaying]);

  const drawSpectrum = useCallback(() => {
    const canvas = spectrumCanvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    ctx.fillStyle = '#0f1120';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const barWidth = 4;
    const barGap = 2;
    const barCount = Math.floor(canvas.width / (barWidth + barGap));

    for (let i = 0; i < barCount; i++) {
      const dataIdx = Math.floor((i / barCount) * bufferLength);
      const value = dataArray[dataIdx] || 0;
      const barHeight = Math.max(2, (value / 255) * canvas.height);
      const x = i * (barWidth + barGap);
      const y = canvas.height - barHeight;

      const gradient = ctx.createLinearGradient(x, y, x, canvas.height);
      gradient.addColorStop(0, '#00d4ff');
      gradient.addColorStop(1, '#7c3aed');
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, barWidth, barHeight);
    }

    if (isPlaying) {
      rafRef.current = requestAnimationFrame(drawSpectrum);
    }
  }, [isPlaying]);

  const seekTo = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  useEffect(() => {
    if (gainRef.current) {
      gainRef.current.gain.value = volume;
    }
  }, [volume]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      audioRef.current?.pause();
      audioCtxRef.current?.close();
    };
  }, []);

  useEffect(() => {
    drawVoiceprint();
    if (!isPlaying) {
      const canvas = spectrumCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#0f1120';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      }
    }
  }, [recording]);

  useEffect(() => {
    drawVoiceprint();
  }, [recording, currentTime, hoveredPoint]);

  const drawVoiceprint = () => {
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

    for (let i = 0; i <= 5; i++) {
      const x = padding.left + (i / 5) * plotW;
      const t = (i / 5) * recording.duration;
      ctx.fillStyle = '#6b7280';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(t.toFixed(1) + 's', x, h - padding.bottom + 16);
    }

    const points = recording.voiceprint.points;
    if (points.length < 2) return;

    ctx.beginPath();
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const x = padding.left + (p.time / recording.duration) * plotW;
      const clampedFreq = Math.min(Math.max(p.frequency, 0), 4000);
      const y = padding.top + (1 - clampedFreq / 4000) * plotH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(124, 58, 237, 0.5)';
    ctx.stroke();

    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const x1 = padding.left + (p1.time / recording.duration) * plotW;
      const x2 = padding.left + (p2.time / recording.duration) * plotW;
      const clampedFreq1 = Math.min(Math.max(p1.frequency, 0), 4000);
      const clampedFreq2 = Math.min(Math.max(p2.frequency, 0), 4000);
      const y1 = padding.top + (1 - clampedFreq1 / 4000) * plotH;
      const y2 = padding.top + (1 - clampedFreq2 / 4000) * plotH;

      const progress = i / (points.length - 1);
      const r = Math.round(0 + (255 - 0) * progress);
      const g = Math.round(212 + (0 - 212) * progress);
      const b = Math.round(255 + (212 - 255) * progress);

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    for (let i = 0; i < points.length; i += Math.max(1, Math.floor(points.length / 80))) {
      const p = points[i];
      const x = padding.left + (p.time / recording.duration) * plotW;
      const clampedFreq = Math.min(Math.max(p.frequency, 0), 4000);
      const y = padding.top + (1 - clampedFreq / 4000) * plotH;
      const progress = i / (points.length - 1);
      const r = Math.round(0 + (255 - 0) * progress);
      const g = Math.round(212 + (0 - 212) * progress);
      const b = Math.round(255 + (212 - 255) * progress);

      ctx.beginPath();
      ctx.arc(x, y, hoveredPoint && Math.abs(hoveredPoint.x - x) < 8 && Math.abs(hoveredPoint.y - y) < 8 ? 8 : 4, 0, Math.PI * 2);
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fill();
    }

    const progressX = padding.left + (currentTime / recording.duration) * plotW;
    ctx.beginPath();
    ctx.moveTo(progressX, padding.top);
    ctx.lineTo(progressX, h - padding.bottom);
    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    if (hoveredPoint) {
      const tooltipX = Math.min(Math.max(hoveredPoint.x, 60), w - 80);
      const tooltipY = Math.max(hoveredPoint.y - 30, 20);
      ctx.fillStyle = 'rgba(30, 32, 48, 0.95)';
      ctx.fillRect(tooltipX - 40, tooltipY - 16, 80, 22);
      ctx.strokeStyle = '#3a3e5a';
      ctx.lineWidth = 1;
      ctx.strokeRect(tooltipX - 40, tooltipY - 16, 80, 22);
      ctx.fillStyle = '#e0e0e0';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${hoveredPoint.freq.toFixed(0)}Hz`, tooltipX, tooltipY);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const rect = container.getBoundingClientRect();
    const padding = { top: 20, right: 20, bottom: 40, left: 60 };
    const plotW = rect.width - padding.left - padding.right;
    const plotH = rect.height - padding.top - padding.bottom;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (x < padding.left || x > rect.width - padding.right || y < padding.top || y > rect.height - padding.bottom) {
      setHoveredPoint(null);
      return;
    }

    const time = ((x - padding.left) / plotW) * recording.duration;
    const points = recording.voiceprint.points;
    let closest = points[0];
    let minDist = Infinity;
    for (const p of points) {
      const dist = Math.abs(p.time - time);
      if (dist < minDist) { minDist = dist; closest = p; }
    }
    const clampedFreq = Math.min(Math.max(closest.frequency, 0), 4000);
    const px = padding.left + (closest.time / recording.duration) * plotW;
    const py = padding.top + (1 - clampedFreq / 4000) * plotH;
    setHoveredPoint({ x: px, y: py, freq: closest.frequency });
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const padding = { top: 20, right: 20, bottom: 40, left: 60 };
    const plotW = rect.width - padding.left - padding.right;
    const x = e.clientX - rect.left;
    if (x < padding.left || x > rect.width - padding.right) return;
    const time = ((x - padding.left) / plotW) * recording.duration;
    seekTo(time);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const progressPercent = (currentTime / recording.duration) * 100;

  return (
    <div style={{ padding: 20, height: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: 18, color: '#e0e0e0', margin: 0 }}>{recording.title}</h2>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
            时长: {formatTime(recording.duration)} · 采样点: {recording.voiceprint.points.length}
          </div>
          {recording.transcription && (
            <div style={{ fontSize: 13, color: '#a0a0b0', marginTop: 8, fontStyle: 'italic' }}>
              "{recording.transcription}"
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {recording.tags.map(tag => (
            <span key={tag} style={{
              fontSize: 11, padding: '3px 8px', borderRadius: 4,
              background: '#3a3e5a', color: '#a0a0b0'
            }}>{tag}</span>
          ))}
        </div>
      </div>

      <div
        ref={containerRef}
        style={{ flex: 1, minHeight: 0, background: '#0f1120', borderRadius: 8, overflow: 'hidden' }}
      >
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '100%', cursor: 'crosshair' }}
          onMouseMove={handleCanvasMouseMove}
          onMouseLeave={() => setHoveredPoint(null)}
          onClick={handleCanvasClick}
        />
      </div>

      <div style={{
        background: '#1e2030', borderRadius: 8, padding: 16,
        display: 'flex', alignItems: 'center', gap: 16
      }}>
        <button
          onClick={togglePlay}
          style={{
            width: 40, height: 40, borderRadius: '50%',
            background: '#00d4ff', border: 'none', color: '#0f1120',
            fontSize: 16, cursor: 'pointer',
            transition: 'all 0.2s ease-in-out',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.background = '#00b8e0'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = '#00d4ff'; }}
        >
          {isPlaying ? '❚❚' : '▶'}
        </button>

        <div style={{ flex: 1 }}>
          <div
            style={{
              height: 6, background: '#3a3e5a', borderRadius: 3,
              position: 'relative', cursor: 'pointer', overflow: 'hidden'
            }}
            onClick={e => {
              const rect = (e.target as HTMLDivElement).getBoundingClientRect();
              const pct = (e.clientX - rect.left) / rect.width;
              seekTo(pct * recording.duration);
            }}
          >
            <div style={{
              height: '100%', width: `${progressPercent}%`,
              background: '#00d4ff', borderRadius: 3, transition: 'width 0.1s linear'
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6b7280', marginTop: 4 }}>
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(recording.duration)}</span>
          </div>
        </div>

        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, color: '#6b7280' }}>🔊</span>
          <input
            type="range" min="0" max="1" step="0.01" value={volume}
            onChange={e => setVolume(parseFloat(e.target.value))}
            style={{ width: 100, cursor: 'pointer', accentColor: '#00d4ff' }}
          />
        </div>

        <canvas
          ref={spectrumCanvasRef}
          width={160}
          height={32}
          style={{ width: 160, height: 32, background: '#0f1120', borderRadius: 4, flexShrink: 0 }}
        />
      </div>
    </div>
  );
}
