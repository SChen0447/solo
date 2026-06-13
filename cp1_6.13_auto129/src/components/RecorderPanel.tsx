import React, { useRef, useState, useEffect, useCallback } from 'react';

interface RecorderPanelProps {
  isAnalyzing: boolean;
  onAnalyze: () => void;
  onAudioData?: (audioBlob: Blob) => void;
}

const RecorderPanel: React.FC<RecorderPanelProps> = ({ isAnalyzing, onAnalyze, onAudioData }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  const MIN_RECORD_TIME = 10;

  const drawWaveform = useCallback(() => {
    if (!canvasRef.current || !analyserRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteTimeDomainData(dataArray);

    const width = canvas.width;
    const height = canvas.height;

    const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) / 2);
    gradient.addColorStop(0, '#1b263b');
    gradient.addColorStop(1, '#050a12');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.lineWidth = 2;
    ctx.beginPath();

    const sliceWidth = width / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const normalizedY = (v * height) / 2;
      const amplitude = Math.abs(normalizedY - height / 2);
      const clampedAmplitude = Math.min(Math.max(amplitude, 10), 40);
      const y = height / 2 + (normalizedY - height / 2) * (clampedAmplitude / Math.max(amplitude, 1));

      const hue = 180 + (i / bufferLength) * 100;
      ctx.strokeStyle = `hsl(${hue}, 80%, 60%)`;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      x += sliceWidth;
    }

    ctx.stroke();
    animationRef.current = requestAnimationFrame(drawWaveform);
  }, []);

  const drawIdleWaveform = useCallback(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) / 2);
    gradient.addColorStop(0, '#1b263b');
    gradient.addColorStop(1, '#050a12');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(0, 180, 216, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
  }, []);

  useEffect(() => {
    if (!isRecording) {
      drawIdleWaveform();
    }
  }, [drawIdleWaveform, isRecording]);

  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setRecordedBlob(audioBlob);
        if (onAudioData) onAudioData(audioBlob);
        if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
        drawIdleWaveform();
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      setRecordedBlob(null);
      drawWaveform();

      timerRef.current = window.setInterval(() => {
        setRecordingTime((t) => {
          const newTime = t + 0.1;
          if (newTime >= MIN_RECORD_TIME + 5) {
            stopRecording();
          }
          return newTime;
        });
      }, 100);
    } catch (err: any) {
      setError('无法访问麦克风，请检查权限设置');
      console.error(err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleRecordClick = () => {
    if (isRecording) {
      if (recordingTime >= MIN_RECORD_TIME) {
        stopRecording();
      }
    } else {
      startRecording();
    }
  };

  const togglePlay = () => {
    if (!recordedBlob) return;

    if (isPlaying) {
      audioElementRef.current?.pause();
      setIsPlaying(false);
    } else {
      const url = URL.createObjectURL(recordedBlob);
      if (!audioElementRef.current) {
        audioElementRef.current = new Audio();
      }
      audioElementRef.current.src = url;
      audioElementRef.current.onended = () => setIsPlaying(false);
      audioElementRef.current.play();
      setIsPlaying(true);
    }
  };

  const formatTime = (t: number) => {
    const s = Math.floor(t);
    const ms = Math.floor((t - s) * 10);
    return `${s.toString().padStart(2, '0')}.${ms}`;
  };

  const canAnalyze = recordedBlob && recordingTime >= MIN_RECORD_TIME && !isAnalyzing;

  return (
    <div className="panel fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="section-title">录音采集</div>

      <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', aspectRatio: '16/9', background: '#050a12' }}>
        <canvas
          ref={canvasRef}
          width={480}
          height={270}
          style={{ width: '100%', height: '100%', display: 'block' }}
        />
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            padding: '4px 10px',
            borderRadius: 4,
            background: isRecording ? 'rgba(230, 57, 70, 0.9)' : 'rgba(0, 180, 216, 0.3)',
            fontSize: 12,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {isRecording && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#e63946' }} />}
          {formatTime(recordingTime)}s
          {!isRecording && recordingTime < MIN_RECORD_TIME && recordedBlob && (
            <span style={{ color: '#f4a261', marginLeft: 8 }}>需{MIN_RECORD_TIME}秒</span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 20 }}>
        <button
          onClick={handleRecordClick}
          disabled={isRecording && recordingTime < MIN_RECORD_TIME}
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: isRecording
              ? 'linear-gradient(135deg, #e63946, #c9184a)'
              : 'linear-gradient(135deg, #00b4d8, #7209b7)',
            boxShadow: isRecording
              ? '0 4px 20px rgba(230, 57, 70, 0.5)'
              : '0 4px 20px rgba(0, 180, 216, 0.4), 0 4px 20px rgba(114, 9, 183, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
          className={isRecording ? 'recording-pulse' : ''}
        >
          {isRecording ? (
            <div style={{ width: 24, height: 24, borderRadius: 4, background: 'white' }} />
          ) : (
            <div style={{ width: 0, height: 0, borderTop: '14px solid transparent', borderBottom: '14px solid transparent', borderLeft: '22px solid white', marginLeft: 6 }} />
          )}
        </button>

        <button
          onClick={togglePlay}
          disabled={!recordedBlob}
          className="icon-btn"
          style={{ width: 48, height: 48, opacity: recordedBlob ? 1 : 0.3 }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {isPlaying ? (
              <>
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </>
            ) : (
              <polygon points="5 3 19 12 5 21 5 3" />
            )}
          </svg>
        </button>
      </div>

      {error && (
        <div style={{ padding: 10, borderRadius: 8, background: 'rgba(230, 57, 70, 0.15)', color: '#e63946', fontSize: 13, textAlign: 'center' }}>
          {error}
        </div>
      )}

      <button
        className="gradient-btn"
        onClick={onAnalyze}
        disabled={!canAnalyze}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
      >
        {isAnalyzing ? (
          <>
            <div
              style={{
                width: 20,
                height: 20,
                border: '3px solid rgba(255,255,255,0.3)',
                borderTopColor: 'white',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            解析中...
          </>
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
            解析旋律
          </>
        )}
      </button>

      <div style={{ fontSize: 12, color: '#778da9', lineHeight: 1.6, textAlign: 'center' }}>
        点击中央按钮开始录制人声，建议录制10秒以上以便准确分析音高和节奏
      </div>
    </div>
  );
};

export default RecorderPanel;
