import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAnnotationStore, LABEL_LIST, LABEL_COLORS, LABEL_NAMES, LabelType, generateId, Annotation } from '../stores/annotationStore';

interface Selection {
  startX: number;
  endX: number;
  dragging: boolean;
}

const Waveform: React.FC = () => {
  const { state, dispatch } = useAnnotationStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const audioDataRef = useRef<Float32Array | null>(null);
  const [viewStart, setViewStart] = useState(0);
  const [viewDuration, setViewDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [showLabelModal, setShowLabelModal] = useState<{ x: number; y: number; startTime: number; endTime: number } | null>(null);
  const [isDraggingPan, setIsDraggingPan] = useState(false);
  const lastPanXRef = useRef(0);
  const animFrameRef = useRef<number>(0);

  const audioDuration = state.audioFile?.duration || 0;
  const totalDuration = audioDuration > 0 ? audioDuration : 1;

  const parseAudio = useCallback(async (url: string) => {
    try {
      const res = await fetch(url);
      const buf = await res.arrayBuffer();
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const decoded = await audioCtx.decodeAudioData(buf);
      const channelData = decoded.getChannelData(0);
      const samples = 4000;
      const blockSize = Math.floor(channelData.length / samples);
      const peakData = new Float32Array(samples);
      for (let i = 0; i < samples; i++) {
        let max = 0;
        for (let j = 0; j < blockSize; j++) {
          const val = Math.abs(channelData[i * blockSize + j]);
          if (val > max) max = val;
        }
        peakData[i] = max;
      }
      audioDataRef.current = peakData;
      setViewDuration(decoded.duration);
      audioCtx.close();
    } catch (e) {
      console.error('音频解析失败', e);
    }
  }, []);

  useEffect(() => {
    if (state.audioFile) {
      parseAudio(state.audioFile.url);
      setCurrentTime(0);
      setViewStart(0);
    } else {
      audioDataRef.current = null;
    }
  }, [state.audioFile, parseAudio]);

  const timeToX = useCallback((time: number, width: number) => {
    return ((time - viewStart) / viewDuration) * width;
  }, [viewStart, viewDuration]);

  const xToTime = useCallback((x: number, width: number) => {
    return viewStart + (x / width) * viewDuration;
  }, [viewStart, viewDuration]);

  const formatTime = (t: number) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    const ms = Math.floor((t % 1) * 100);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
  };

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const W = container.clientWidth;
    const H = container.clientHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const waveAreaTop = 40;
    const waveAreaH = H - 120;
    const labelAreaTop = waveAreaTop + waveAreaH + 10;

    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = '#21262d';
    ctx.lineWidth = 1;
    for (let t = 0; t <= viewDuration; t += 1) {
      const x = timeToX(viewStart + t, W);
      if (x >= 0 && x <= W) {
        ctx.beginPath();
        ctx.moveTo(x, waveAreaTop);
        ctx.lineTo(x, waveAreaTop + waveAreaH);
        ctx.stroke();
      }
    }

    ctx.fillStyle = '#8b949e';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    const step = viewDuration > 60 ? 10 : viewDuration > 20 ? 5 : viewDuration > 5 ? 1 : 0.5;
    const start = Math.ceil(viewStart / step) * step;
    for (let t = start; t <= viewStart + viewDuration; t += step) {
      const x = timeToX(t, W);
      if (x >= 0 && x <= W) {
        ctx.fillText(formatTime(t), x, 25);
        ctx.beginPath();
        ctx.strokeStyle = '#30363d';
        ctx.moveTo(x, 32);
        ctx.lineTo(x, waveAreaTop);
        ctx.stroke();
      }
    }

    if (audioDataRef.current) {
      const data = audioDataRef.current;
      const totalSamples = data.length;
      const sampleStart = Math.floor((viewStart / totalDuration) * totalSamples);
      const sampleEnd = Math.floor(((viewStart + viewDuration) / totalDuration) * totalSamples);
      const visibleSamples = Math.max(1, sampleEnd - sampleStart);
      const midY = waveAreaTop + waveAreaH / 2;

      const grad = ctx.createLinearGradient(0, waveAreaTop, 0, waveAreaTop + waveAreaH);
      grad.addColorStop(0, '#58a6ff');
      grad.addColorStop(0.5, '#1f6feb');
      grad.addColorStop(1, '#0d419d');
      ctx.fillStyle = grad;

      for (let x = 0; x < W; x++) {
        const idx = sampleStart + Math.floor((x / W) * visibleSamples);
        const amp = data[idx] || 0;
        const barH = Math.max(1, amp * waveAreaH * 0.9);
        ctx.fillRect(x, midY - barH / 2, 1, barH);
      }
    }

    if (selection && selection.startX !== selection.endX) {
      const sx = Math.min(selection.startX, selection.endX);
      const ex = Math.max(selection.startX, selection.endX);
      ctx.fillStyle = 'rgba(255, 215, 0, 0.25)';
      ctx.fillRect(sx, waveAreaTop, ex - sx, waveAreaH);
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sx, waveAreaTop);
      ctx.lineTo(sx, waveAreaTop + waveAreaH);
      ctx.moveTo(ex, waveAreaTop);
      ctx.lineTo(ex, waveAreaTop + waveAreaH);
      ctx.stroke();
    }

    if (state.selectedAnnotationId) {
      const ann = state.annotations.find(a => a.id === state.selectedAnnotationId);
      if (ann) {
        const sx = timeToX(ann.startTime, W);
        const ex = timeToX(ann.endTime, W);
        ctx.strokeStyle = LABEL_COLORS[ann.label];
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);
        ctx.strokeRect(sx, waveAreaTop, ex - sx, waveAreaH);
        ctx.setLineDash([]);
      }
    }

    state.annotations.forEach(ann => {
      const sx = timeToX(ann.startTime, W);
      const ex = timeToX(ann.endTime, W);
      if (ex < 0 || sx > W) return;
      const clampedSx = Math.max(0, sx);
      const clampedEx = Math.min(W, ex);
      ctx.fillStyle = LABEL_COLORS[ann.label] + 'cc';
      ctx.fillRect(clampedSx, labelAreaTop, clampedEx - clampedSx, 24);
      ctx.strokeStyle = LABEL_COLORS[ann.label];
      ctx.lineWidth = 1;
      ctx.strokeRect(clampedSx, labelAreaTop, clampedEx - clampedSx, 24);

      if (clampedEx - clampedSx > 60) {
        ctx.fillStyle = '#0d1117';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(LABEL_NAMES[ann.label], clampedSx + 6, labelAreaTop + 16);
      }
      const dur = (ann.endTime - ann.startTime).toFixed(1) + 's';
      ctx.fillStyle = '#c9d1d9';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(dur, clampedEx - 4, labelAreaTop + 16);
    });

    if (audioDuration > 0) {
      const playX = timeToX(currentTime, W);
      if (playX >= 0 && playX <= W) {
        ctx.strokeStyle = '#f85149';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(playX, 0);
        ctx.lineTo(playX, H);
        ctx.stroke();
        ctx.fillStyle = '#f85149';
        ctx.beginPath();
        ctx.moveTo(playX - 6, 0);
        ctx.lineTo(playX + 6, 0);
        ctx.lineTo(playX, 8);
        ctx.closePath();
        ctx.fill();
      }
    }
  }, [viewStart, viewDuration, selection, state.annotations, state.selectedAnnotationId, currentTime, audioDuration, totalDuration, timeToX]);

  useEffect(() => {
    drawWaveform();
  }, [drawWaveform]);

  useEffect(() => {
    const onResize = () => drawWaveform();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [drawWaveform]);

  useEffect(() => {
    const tick = () => {
      if (audioRef.current && !audioRef.current.paused) {
        setCurrentTime(audioRef.current.currentTime);
      }
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, []);

  const handleWheel: React.WheelEventHandler<HTMLCanvasElement> = (e) => {
    e.preventDefault();
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const W = rect.width;
    const tAtMouse = xToTime(x, W);

    const scale = e.deltaY < 0 ? 0.8 : 1.25;
    let newDur = viewDuration * scale;
    newDur = Math.max(0.5, Math.min(newDur, totalDuration));

    const ratio = (tAtMouse - viewStart) / viewDuration;
    let newStart = tAtMouse - newDur * ratio;
    newStart = Math.max(0, Math.min(newStart, totalDuration - newDur));

    setViewDuration(newDur);
    setViewStart(newStart);
  };

  const handleMouseDown: React.MouseEventHandler<HTMLCanvasElement> = (e) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const H = rect.height;
    const waveAreaTop = 40;
    const waveAreaH = H - 120;
    const y = e.clientY - rect.top;

    if (e.button === 1 || e.shiftKey) {
      setIsDraggingPan(true);
      lastPanXRef.current = x;
      return;
    }

    if (y >= waveAreaTop && y <= waveAreaTop + waveAreaH) {
      setSelection({ startX: x, endX: x, dragging: true });
    } else {
      if (audioRef.current) {
        const W = rect.width;
        const t = xToTime(x, W);
        audioRef.current.currentTime = Math.max(0, Math.min(t, audioDuration));
        setCurrentTime(audioRef.current.currentTime);
      }
    }
  };

  const handleMouseMove: React.MouseEventHandler<HTMLCanvasElement> = (e) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;

    if (isDraggingPan) {
      const dx = lastPanXRef.current - x;
      const W = rect.width;
      const dt = (dx / W) * viewDuration;
      let newStart = viewStart + dt;
      newStart = Math.max(0, Math.min(newStart, totalDuration - viewDuration));
      setViewStart(newStart);
      lastPanXRef.current = x;
      return;
    }

    if (selection?.dragging) {
      setSelection({ ...selection, endX: x });
    }
  };

  const handleMouseUp: React.MouseEventHandler<HTMLCanvasElement> = (e) => {
    if (isDraggingPan) {
      setIsDraggingPan(false);
      return;
    }
    if (selection?.dragging) {
      const rect = canvasRef.current!.getBoundingClientRect();
      const W = rect.width;
      let t1 = xToTime(selection.startX, W);
      let t2 = xToTime(selection.endX, W);
      if (Math.abs(t1 - t2) >= 0.05) {
        const startTime = Math.max(0, Math.min(t1, t2));
        const endTime = Math.min(audioDuration, Math.max(t1, t2));
        setShowLabelModal({
          x: e.clientX,
          y: e.clientY,
          startTime,
          endTime
        });
      }
      setSelection(null);
    }
  };

  const handleSaveLabel = (label: LabelType) => {
    if (!showLabelModal || !state.audioFile) return;
    const { startTime, endTime } = showLabelModal;
    const annotation: Annotation = {
      id: generateId(),
      startTime,
      endTime,
      label,
      createdAt: Date.now()
    };
    dispatch({ type: 'ADD_ANNOTATION', payload: annotation });
    setShowLabelModal(null);
  };

  const togglePlay = () => {
    if (!audioRef.current || !state.audioFile) return;
    if (audioRef.current.paused) {
      audioRef.current.play();
      setIsPlaying(true);
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  useEffect(() => {
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const a = audioRef.current;
    if (a) {
      a.addEventListener('play', onPlay);
      a.addEventListener('pause', onPause);
      return () => {
        a.removeEventListener('play', onPlay);
        a.removeEventListener('pause', onPause);
      };
    }
  }, [state.audioFile]);

  useEffect(() => {
    dispatch({ type: 'SELECT_ANNOTATION', payload: null });
  }, [viewStart, viewDuration, dispatch]);

  if (!state.audioFile) {
    return (
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#8b949e', fontSize: 16, minHeight: 400
      }}>
        请上传 MP3 或 WAV 音频文件开始标注
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 400, position: 'relative' }}>
      <audio ref={audioRef} src={state.audioFile.url} preload="auto" />

      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px',
        background: '#161b22', borderBottom: '1px solid #30363d', flexShrink: 0
      }}>
        <button onClick={togglePlay} style={{
          padding: '6px 14px', background: '#1f6feb', color: '#fff', border: 'none',
          borderRadius: 6, cursor: 'pointer', fontSize: 14, minWidth: 70
        }}>
          {isPlaying ? '⏸ 暂停' : '▶ 播放'}
        </button>
        <span style={{ color: '#8b949e', fontSize: 13, fontFamily: 'monospace' }}>
          {formatTime(currentTime)} / {formatTime(audioDuration)}
        </span>
        <div style={{ flex: 1 }} />
        <span style={{ color: '#6e7681', fontSize: 12 }}>
          滚轮缩放 | Shift+拖拽平移 | 波形区拖拽选段 | 点击时间轴跳转
        </span>
      </div>

      <div style={{ flex: 1, position: 'relative', minHeight: 350 }}>
        <canvas
          ref={canvasRef}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            width: '100%', height: '100%', cursor: isDraggingPan ? 'grabbing' : 'crosshair',
            display: 'block'
          }}
        />
      </div>

      {showLabelModal && (
        <div
          onClick={() => setShowLabelModal(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)',
            zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#161b22', border: '1px solid #30363d', borderRadius: 8,
              padding: 20, minWidth: 320, boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
            }}
          >
            <h3 style={{ color: '#c9d1d9', fontSize: 16, marginBottom: 8 }}>选择标签</h3>
            <p style={{ color: '#8b949e', fontSize: 13, marginBottom: 16, fontFamily: 'monospace' }}>
              时长: {(showLabelModal.endTime - showLabelModal.startTime).toFixed(2)}s
              （{formatTime(showLabelModal.startTime)} - {formatTime(showLabelModal.endTime)}）
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {LABEL_LIST.map(lbl => (
                <button
                  key={lbl}
                  onClick={() => handleSaveLabel(lbl)}
                  style={{
                    padding: '10px 14px', border: `1px solid ${LABEL_COLORS[lbl]}`,
                    background: 'transparent', color: LABEL_COLORS[lbl], borderRadius: 6,
                    cursor: 'pointer', fontSize: 14, textAlign: 'left', display: 'flex',
                    alignItems: 'center', gap: 10, transition: 'background 0.15s'
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.background = LABEL_COLORS[lbl] + '22')}
                  onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{
                    width: 14, height: 14, borderRadius: 3, background: LABEL_COLORS[lbl]
                  }} />
                  {LABEL_NAMES[lbl]}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowLabelModal(null)}
              style={{
                marginTop: 12, width: '100%', padding: '8px', background: 'transparent',
                color: '#8b949e', border: '1px solid #30363d', borderRadius: 6,
                cursor: 'pointer', fontSize: 13
              }}
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Waveform;
