import { useRef, useState, useEffect, useCallback } from 'react';
import type { ParticlePoint } from '../types';
import './LetterEditor.css';

interface LetterEditorProps {
  onBack: () => void;
  onCreated: () => void;
}

const COLORS = ['#ff6b6b', '#48dbfb', '#feca57', '#ff9ff3', '#54a0ff'];
const MAX_RECORD_SECONDS = 10;
const TRAIL_FADE_TIME = 2000;

interface ActiveParticle {
  x: number;
  y: number;
  color: string;
  size: number;
  opacity: number;
  createdAt: number;
}

function LetterEditor({ onBack, onCreated }: LetterEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(0);
  const particlesRef = useRef<ActiveParticle[]>([]);
  const recordedPointsRef = useRef<ParticlePoint[]>([]);
  const isDrawingRef = useRef(false);
  const startTimeRef = useRef(0);
  const lastPointRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const [title, setTitle] = useState('');
  const [password, setPassword] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [hasRecording, setHasRecording] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 400, height: 300 });
  const [colorIndex, setColorIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioDataUrlRef = useRef<string>('');
  const recordTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const width = Math.max(400, Math.min(containerWidth, 800));
        const height = Math.max(300, width * 0.6);
        setCanvasSize({ width, height });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const now = Date.now();

    ctx.fillStyle = '#15172b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    particlesRef.current = particlesRef.current.filter((p) => {
      const age = now - p.createdAt;
      if (age > TRAIL_FADE_TIME) return false;

      const alpha = (1 - age / TRAIL_FADE_TIME) * p.opacity;
      const size = p.size * (1 - age / TRAIL_FADE_TIME * 0.5);

      ctx.beginPath();
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fillStyle = p.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
      ctx.shadowBlur = size * 2;
      ctx.shadowColor = p.color;
      ctx.fill();
      ctx.shadowBlur = 0;

      return true;
    });

    animationRef.current = requestAnimationFrame(render);
  }, []);

  useEffect(() => {
    animationRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationRef.current);
  }, [render]);

  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const addParticle = (x: number, y: number) => {
    const now = Date.now();
    const color = COLORS[colorIndex % COLORS.length];
    const size = 5 + Math.random() * 5;
    const opacity = 0.7 + Math.random() * 0.2;

    particlesRef.current.push({
      x,
      y,
      color,
      size,
      opacity,
      createdAt: now,
    });

    if (isDrawingRef.current) {
      const elapsed = now - startTimeRef.current;
      recordedPointsRef.current.push({
        x,
        y,
        color,
        size,
        opacity,
        timestamp: elapsed,
      });
    }
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const { x, y } = getCanvasCoords(e);
    isDrawingRef.current = true;
    startTimeRef.current = Date.now();
    recordedPointsRef.current = [];
    lastPointRef.current = { x, y, time: Date.now() };
    addParticle(x, y);
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();

    const { x, y } = getCanvasCoords(e);
    const now = Date.now();
    const last = lastPointRef.current;

    if (last) {
      const dist = Math.sqrt((x - last.x) ** 2 + (y - last.y) ** 2);
      const timeDiff = now - last.time;

      if (dist > 3 || timeDiff > 16) {
        const steps = Math.max(1, Math.floor(dist / 5));
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          const px = last.x + (x - last.x) * t;
          const py = last.y + (y - last.y) * t;
          addParticle(px, py);
        }
        lastPointRef.current = { x, y, time: now };
      }
    }
  };

  const handleEnd = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    isDrawingRef.current = false;
    lastPointRef.current = null;
  };

  const clearCanvas = () => {
    recordedPointsRef.current = [];
    particlesRef.current = [];
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = () => {
          audioDataUrlRef.current = reader.result as string;
          setHasRecording(true);
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordTime(0);
      setHasRecording(false);

      let time = 0;
      recordTimerRef.current = window.setInterval(() => {
        time += 0.1;
        setRecordTime(Math.round(time * 10) / 10);
        if (time >= MAX_RECORD_SECONDS) {
          stopRecording();
        }
      }, 100);
    } catch (err) {
      console.error('录音失败:', err);
      alert('无法访问麦克风，请检查权限设置');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    setIsRecording(false);
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const canSubmit = title.trim() && password.length >= 4 && password.length <= 8 && recordedPointsRef.current.length > 0;

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/letters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          password,
          lightTrack: recordedPointsRef.current,
          audioData: audioDataUrlRef.current || null,
        }),
      });

      if (res.ok) {
        onCreated();
      } else {
        const data = await res.json();
        alert(data.error || '创建失败');
      }
    } catch (err) {
      console.error('提交失败:', err);
      alert('网络错误，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="editor-container">
      <button className="back-button" onClick={onBack}>
        ← 返回
      </button>

      <div className="editor-content">
        <h2 className="editor-title">写一封光信笺</h2>

        <div className="form-group">
          <label>信笺标题</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="给这封信起个名字..."
            maxLength={30}
            className="text-input"
          />
        </div>

        <div className="canvas-section">
          <div className="section-header">
            <span className="section-title">绘制光轨</span>
            <div className="color-picker">
              {COLORS.map((color, idx) => (
                <button
                  key={color}
                  className={`color-dot ${colorIndex === idx ? 'active' : ''}`}
                  style={{ background: color }}
                  onClick={() => setColorIndex(idx)}
                  title={`选择${color}`}
                />
              ))}
            </div>
            <button className="clear-btn" onClick={clearCanvas}>
              清除
            </button>
          </div>

          <div className="canvas-wrapper" ref={containerRef}>
            <canvas
              ref={canvasRef}
              width={canvasSize.width}
              height={canvasSize.height}
              className="drawing-canvas"
              onMouseDown={handleStart}
              onMouseMove={handleMove}
              onMouseUp={handleEnd}
              onMouseLeave={handleEnd}
              onTouchStart={handleStart}
              onTouchMove={handleMove}
              onTouchEnd={handleEnd}
            />
            <div className="canvas-hint">
              {recordedPointsRef.current.length > 0 ? (
                <span className="hint-success">已绘制 {recordedPointsRef.current.length} 个光点</span>
              ) : (
                <span>用鼠标在画布上绘制光的轨迹</span>
              )}
            </div>
          </div>
        </div>

        <div className="audio-section">
          <span className="section-title">录制语音 (最长10秒)</span>
          <button
            className={`record-btn ${isRecording ? 'recording' : ''}`}
            onClick={toggleRecording}
          >
            {isRecording ? (
              <>
                <span className="record-dot" />
                停止录音 ({recordTime.toFixed(1)}s)
              </>
            ) : hasRecording ? (
              '重新录制'
            ) : (
              '🎤 开始录音'
            )}
          </button>
          {hasRecording && !isRecording && (
            <span className="record-success">✓ 录音完成</span>
          )}
        </div>

        <div className="form-group">
          <label>设置密码 (4-8位)</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="设置4-8位密码"
            maxLength={8}
            className="text-input"
          />
        </div>

        <button
          className="glow-button submit-btn"
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
        >
          {submitting ? '创建中...' : '✦ 发送信笺'}
        </button>
      </div>
    </div>
  );
}

export default LetterEditor;
