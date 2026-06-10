import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { VoiceprintData, VoiceprintPoint } from '../types';

interface RecorderProps {
  onClose: () => void;
  onComplete: (data: { audioBlob: Blob; voiceprint: VoiceprintData; duration: number }) => void;
}

export default function Recorder({ onClose, onComplete }: RecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [status, setStatus] = useState<'idle' | 'requesting' | 'recording' | 'processing' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const rafRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const extractVoiceprint = useCallback(async (audioBlob: Blob, sampleRate: number): Promise<VoiceprintData> => {
    const arrayBuffer = await audioBlob.arrayBuffer();
    const offlineCtx = new OfflineAudioContext(1, arrayBuffer.byteLength, sampleRate);
    const audioBuffer = await offlineCtx.decodeAudioData(arrayBuffer.slice(0));
    const channelData = audioBuffer.getChannelData(0);
    const duration = audioBuffer.duration;

    const frameSize = 2048;
    const hopSize = 512;
    const points: VoiceprintPoint[] = [];
    const fundamentalFrequencies: number[] = [];
    const energyDistribution: number[] = [];

    for (let start = 0; start + frameSize < channelData.length; start += hopSize) {
      const frame = channelData.slice(start, start + frameSize);
      let energy = 0;
      for (let i = 0; i < frame.length; i++) energy += frame[i] * frame[i];
      energy = Math.sqrt(energy / frame.length);
      energyDistribution.push(energy);

      const fft = new Float32Array(frameSize);
      for (let i = 0; i < frameSize; i++) fft[i] = frame[i] || 0;
      const magnitudes = computeFFTMagnitudes(fft);

      let peakFreq = 0;
      let peakMag = 0;
      for (let i = 1; i < magnitudes.length / 2; i++) {
        if (magnitudes[i] > peakMag) {
          peakMag = magnitudes[i];
          peakFreq = (i * sampleRate) / frameSize;
        }
      }

      const f0 = detectPitch(frame, sampleRate);
      fundamentalFrequencies.push(f0);

      const formants = detectFormants(magnitudes, sampleRate, frameSize);

      points.push({
        time: (start / channelData.length) * duration,
        frequency: peakFreq,
        energy,
        formant1: formants[0],
        formant2: formants[1],
        formant3: formants[2]
      });
    }

    return {
      sampleRate,
      duration,
      points,
      fundamentalFrequencies,
      energyDistribution
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setStatus('requesting');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioCtx = new AudioContext({ sampleRate: 44100 });
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        setStatus('processing');
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const finalDuration = (Date.now() - startTimeRef.current) / 1000;
        try {
          const voiceprint = await extractVoiceprint(audioBlob, 44100);
          onComplete({ audioBlob, voiceprint, duration: finalDuration });
        } catch (err) {
          setStatus('error');
          setErrorMsg('声纹提取失败');
        }
      };

      mediaRecorder.start();
      startTimeRef.current = Date.now();
      setIsRecording(true);
      setStatus('recording');
      drawWaveform();

      timerRef.current = setInterval(() => {
        setDuration((Date.now() - startTimeRef.current) / 1000);
      }, 100);
    } catch (err) {
      setStatus('error');
      setErrorMsg('无法访问麦克风，请检查权限设置');
    }
  }, [extractVoiceprint, onComplete]);

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteTimeDomainData(dataArray);

    ctx.fillStyle = '#0f1120';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const barCount = 64;
    const barWidth = 4;
    const barGap = 2;
    const totalWidth = barCount * (barWidth + barGap);
    const startX = (canvas.width - totalWidth) / 2;

    const freqData = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(freqData);

    for (let i = 0; i < barCount; i++) {
      const dataIndex = Math.floor((i / barCount) * (freqData.length / 2));
      const value = freqData[dataIndex] || 0;
      const barHeight = Math.max(4, (value / 255) * (canvas.height - 20));
      const x = startX + i * (barWidth + barGap);
      const y = (canvas.height - barHeight) / 2;

      const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
      gradient.addColorStop(0, '#00d4ff');
      gradient.addColorStop(1, '#7c3aed');
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, barWidth, barHeight);
    }

    rafRef.current = requestAnimationFrame(drawWaveform);
  }, []);

  const stopRecording = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach(t => t.stop());
    audioCtxRef.current?.close();
    setIsRecording(false);
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
      audioCtxRef.current?.close();
    };
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    const ms = Math.floor((s % 1) * 10);
    return `${m}:${sec.toString().padStart(2, '0')}.${ms}`;
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#1e2030', borderRadius: 16, border: '1px solid #3a3e5a',
          padding: 32, width: 480, maxWidth: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, color: '#e0e0e0', margin: 0 }}>录制方言</h2>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', color: '#6b7280',
            cursor: 'pointer', fontSize: 20
          }}>✕</button>
        </div>

        <canvas
          ref={canvasRef}
          width={420}
          height={120}
          style={{
            width: '100%', background: '#0f1120',
            borderRadius: 8, marginBottom: 20
          }}
        />

        <div style={{
          textAlign: 'center', fontSize: 32, fontFamily: 'monospace',
          color: isRecording ? '#ff3366' : '#00d4ff', marginBottom: 24
        }}>
          {formatTime(duration)}
        </div>

        {status === 'error' && (
          <div style={{ color: '#ff3366', textAlign: 'center', marginBottom: 16, fontSize: 13 }}>
            {errorMsg}
          </div>
        )}

        {status === 'processing' && (
          <div style={{ color: '#00d4ff', textAlign: 'center', marginBottom: 16, fontSize: 13 }}>
            正在提取声纹特征...
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
          {!isRecording && status !== 'processing' && (
            <button
              onClick={startRecording}
              style={{
                width: 56, height: 56, borderRadius: '50%',
                background: '#ff3366', border: 'none', color: 'white',
                fontSize: 24, cursor: 'pointer',
                transition: 'all 0.2s ease-in-out',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
            >●</button>
          )}
          {isRecording && (
            <button
              onClick={stopRecording}
              style={{
                width: 56, height: 56, borderRadius: 8,
                background: '#3a3e5a', border: 'none', color: 'white',
                fontSize: 20, cursor: 'pointer',
                transition: 'all 0.2s ease-in-out',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#4a4e6a'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#3a3e5a'; }}
            >■</button>
          )}
        </div>

        <div style={{ textAlign: 'center', color: '#6b7280', fontSize: 12, marginTop: 20 }}>
          {isRecording ? '点击方形按钮停止录制' : '点击圆形按钮开始录制'}
        </div>
      </div>
    </div>
  );
}

function computeFFTMagnitudes(input: Float32Array): Float32Array {
  const n = input.length;
  const output = new Float32Array(n);
  const cos = new Float32Array(n);
  const sin = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    cos[i] = Math.cos(-2 * Math.PI * i / n);
    sin[i] = Math.sin(-2 * Math.PI * i / n);
  }
  for (let k = 0; k < n; k++) {
    let real = 0, imag = 0;
    for (let t = 0; t < n; t++) {
      const idx = (k * t) % n;
      real += input[t] * cos[idx];
      imag += input[t] * sin[idx];
    }
    output[k] = Math.sqrt(real * real + imag * imag);
  }
  return output;
}

function detectPitch(frame: Float32Array, sampleRate: number): number {
  const rms = Math.sqrt(frame.reduce((a, b) => a + b * b, 0) / frame.length);
  if (rms < 0.01) return 0;

  let bestTau = 0;
  let bestVal = -1;
  const minTau = Math.floor(sampleRate / 400);
  const maxTau = Math.floor(sampleRate / 80);

  for (let tau = minTau; tau < maxTau && tau < frame.length / 2; tau++) {
    let sum = 0;
    for (let i = 0; i < frame.length - tau; i++) {
      sum += frame[i] * frame[i + tau];
    }
    if (sum > bestVal) {
      bestVal = sum;
      bestTau = tau;
    }
  }
  return bestTau > 0 ? sampleRate / bestTau : 0;
}

function detectFormants(magnitudes: Float32Array, sampleRate: number, frameSize: number): [number, number, number] {
  const formants: number[] = [];
  const startBin = Math.floor(200 * frameSize / sampleRate);
  const endBin = Math.floor(4000 * frameSize / sampleRate);
  const smoothed = new Float32Array(magnitudes.length);

  for (let i = startBin; i < endBin; i++) {
    let sum = 0;
    const window = 3;
    for (let j = -window; j <= window; j++) {
      sum += magnitudes[i + j] || 0;
    }
    smoothed[i] = sum / (window * 2 + 1);
  }

  for (let i = startBin + 1; i < endBin - 1 && formants.length < 3; i++) {
    if (smoothed[i] > smoothed[i - 1] && smoothed[i] > smoothed[i + 1]) {
      formants.push((i * sampleRate) / frameSize);
    }
  }

  while (formants.length < 3) formants.push(0);
  return [formants[0], formants[1], formants[2]];
}
