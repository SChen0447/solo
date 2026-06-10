import { AudioEngine } from './audioEngine';
import { EffectProcessor } from './effectProcessor';

const BAR_COUNT = 128;
const WAVEFORM_RESOLUTION = 1000;
const MIN_FREQ = 20;
const MAX_FREQ = 20000;

const $ = <T extends Element>(id: string): T => document.getElementById(id) as unknown as T;

const audioEngine = new AudioEngine();
let waveformData: Float32Array = new Float32Array(0);
let currentVolumePercent = 100;
let currentReverbPercent = 20;
let currentLowPassFreq = 20000;
let currentLowPassQ = 0;

const spectrumCanvas = $<HTMLCanvasElement>('spectrumCanvas');
const waveformCanvas = $<HTMLCanvasElement>('waveformCanvas');
const spectrumCtx = spectrumCanvas.getContext('2d')!;
const waveformCtx = waveformCanvas.getContext('2d')!;

const uploadBtn = $<HTMLButtonElement>('uploadBtn');
const fileInput = $<HTMLInputElement>('fileInput');
const fileNameEl = $<HTMLSpanElement>('fileName');

const progressTrack = $<HTMLDivElement>('progressTrack');
const progressFill = $<HTMLDivElement>('progressFill');
const progressHandle = $<HTMLDivElement>('progressHandle');
const currentTimeEl = $<HTMLSpanElement>('currentTime');
const totalTimeEl = $<HTMLSpanElement>('totalTime');

const playBtn = $<HTMLButtonElement>('playBtn');
const stopBtn = $<HTMLButtonElement>('stopBtn');
const loopBtn = $<HTMLButtonElement>('loopBtn');
const playIcon = $<SVGElement>('playIcon');

const reverbSlider = $<HTMLInputElement>('reverbSlider');
const reverbValueEl = $<HTMLSpanElement>('reverbValue');

const freqSlider = $<HTMLInputElement>('freqSlider');
const freqValueEl = $<HTMLSpanElement>('freqValue');
const qSlider = $<HTMLInputElement>('qSlider');
const qValueEl = $<HTMLSpanElement>('qValue');
const resetFreqBtn = $<HTMLButtonElement>('resetFreq');
const resetQBtn = $<HTMLButtonElement>('resetQ');

const volumeSlider = $<HTMLInputElement>('volumeSlider');
const volumeValueEl = $<HTMLSpanElement>('volumeValue');

const chainStatusEl = $<HTMLDivElement>('chainStatus');
const loadingOverlay = $<HTMLDivElement>('loadingOverlay');

function logToFreq(percent: number): number {
  const minL = Math.log(MIN_FREQ);
  const maxL = Math.log(MAX_FREQ);
  return Math.exp(minL + (maxL - minL) * (percent / 100));
}

function freqToLog(freq: number): number {
  const minL = Math.log(MIN_FREQ);
  const maxL = Math.log(MAX_FREQ);
  return ((Math.log(freq) - minL) / (maxL - minL)) * 100;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function setupCanvas(): void {
  const dpr = window.devicePixelRatio || 1;
  [spectrumCanvas, waveformCanvas].forEach((canvas) => {
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  });
}

function drawSpectrum(): void {
  const rect = spectrumCanvas.getBoundingClientRect();
  const W = rect.width;
  const H = rect.height;
  spectrumCtx.clearRect(0, 0, W, H);

  const freqData = audioEngine.getFrequencyData();
  const barCount = Math.min(BAR_COUNT, freqData.length);
  const gap = 2;
  const barWidth = (W - gap * (barCount - 1)) / barCount;

  const grad = spectrumCtx.createLinearGradient(0, H, 0, 0);
  grad.addColorStop(0, '#6366f1');
  grad.addColorStop(1, '#a78bfa');

  const eff = audioEngine.getEffectProcessor();
  const cutoffFreq = eff ? eff.getLowPassFrequency() : 20000;
  const reverbBoost = eff ? eff.getReverbBoost() : 1;
  const sampleRate = audioEngine.getSampleRate();
  const nyquist = sampleRate / 2;

  for (let i = 0; i < barCount; i++) {
    let value = freqData[i] / 255;

    const binFreq = (i / barCount) * nyquist;
    if (binFreq < 200) {
      value *= reverbBoost;
    }

    if (binFreq > cutoffFreq) {
      const over = (binFreq - cutoffFreq) / Math.max(1, nyquist - cutoffFreq);
      const alpha = 1 - over * 0.8;
      spectrumCtx.globalAlpha = Math.max(0.2, alpha);
    } else {
      spectrumCtx.globalAlpha = 1;
    }

    const barHeight = Math.max(1, value * H);
    const x = i * (barWidth + gap);
    const y = H - barHeight;

    spectrumCtx.fillStyle = grad;
    spectrumCtx.fillRect(x, y, barWidth, barHeight);
  }

  spectrumCtx.globalAlpha = 1;
}

function drawWaveform(): void {
  const rect = waveformCanvas.getBoundingClientRect();
  const W = rect.width;
  const H = rect.height;
  waveformCtx.clearRect(0, 0, W, H);

  waveformCtx.fillStyle = 'rgba(99, 102, 241, 0.1)';
  waveformCtx.fillRect(0, H / 2 - 1, W, 2);

  if (waveformData.length > 0) {
    const scale = (H / 2) * (currentVolumePercent / 100);
    waveformCtx.fillStyle = '#a78bfa';
    const step = W / waveformData.length;

    for (let i = 0; i < waveformData.length; i++) {
      const v = waveformData[i] * scale;
      const x = i * step;
      waveformCtx.fillRect(x, H / 2 - v, Math.max(1, step), v * 2);
    }
  }

  if (audioEngine.duration > 0) {
    const pos = (audioEngine.currentTime / audioEngine.duration) * W;
    waveformCtx.strokeStyle = '#f59e0b';
    waveformCtx.lineWidth = 2;
    waveformCtx.beginPath();
    waveformCtx.moveTo(pos, 0);
    waveformCtx.lineTo(pos, H);
    waveformCtx.stroke();
  }
}

function updateProgressUI(): void {
  const duration = audioEngine.duration;
  if (duration <= 0) return;
  const progress = (audioEngine.currentTime / duration) * 100;
  progressFill.style.width = `${progress}%`;
  progressHandle.style.left = `${progress}%`;
  currentTimeEl.textContent = formatTime(audioEngine.currentTime);
}

function updateChainStatus(): void {
  chainStatusEl.textContent = `混响: ${currentReverbPercent}% | 低通: ${Math.round(currentLowPassFreq)}Hz / Q: ${currentLowPassQ.toFixed(1)}dB | 音量: ${currentVolumePercent}%`;
}

function togglePlay(): void {
  if (!audioEngine.hasBuffer()) return;
  if (audioEngine.isPlaying) {
    audioEngine.pause();
    playIcon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"></polygon>';
  } else {
    audioEngine.start();
    playIcon.innerHTML = '<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>';
  }
}

function stopPlayback(): void {
  audioEngine.stop(true);
  playIcon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"></polygon>';
  updateProgressUI();
}

function toggleLoop(): void {
  const next = !audioEngine.isLooping;
  audioEngine.setLooping(next);
  loopBtn.classList.toggle('active', next);
}

function handleSeek(clientX: number): void {
  if (!audioEngine.hasBuffer()) return;
  const rect = progressTrack.getBoundingClientRect();
  const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  audioEngine.seek(ratio);
  updateProgressUI();
}

function bindEvents(): void {
  uploadBtn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    fileNameEl.textContent = file.name;
    try {
      await audioEngine.loadFile(file);
      syncEffectsToProcessor();
      waveformData = audioEngine.getWaveformData(WAVEFORM_RESOLUTION);
      totalTimeEl.textContent = formatTime(audioEngine.duration);
      updateProgressUI();
    } catch (err) {
      console.error('加载失败', err);
      fileNameEl.textContent = '加载失败';
    }
  });

  playBtn.addEventListener('click', togglePlay);
  stopBtn.addEventListener('click', stopPlayback);
  loopBtn.addEventListener('click', toggleLoop);

  let isDragging = false;
  progressTrack.addEventListener('mousedown', (e) => {
    isDragging = true;
    handleSeek(e.clientX);
  });
  window.addEventListener('mousemove', (e) => {
    if (isDragging) handleSeek(e.clientX);
  });
  window.addEventListener('mouseup', () => {
    isDragging = false;
  });

  reverbSlider.addEventListener('input', (e) => {
    const val = Number((e.target as HTMLInputElement).value);
    currentReverbPercent = val;
    reverbValueEl.textContent = `${val}%`;
    const eff = audioEngine.getEffectProcessor();
    if (eff) eff.setReverb(val);
    updateChainStatus();
  });

  freqSlider.addEventListener('input', (e) => {
    const pct = Number((e.target as HTMLInputElement).value);
    const freq = logToFreq(pct);
    currentLowPassFreq = freq;
    freqValueEl.textContent = `${Math.round(freq)} Hz`;
    const eff = audioEngine.getEffectProcessor();
    if (eff) eff.setLowPass(freq, currentLowPassQ);
    updateChainStatus();
  });

  qSlider.addEventListener('input', (e) => {
    const pct = Number((e.target as HTMLInputElement).value);
    const q = (pct / 100) * 20;
    currentLowPassQ = q;
    qValueEl.textContent = `${q.toFixed(1)} dB`;
    const eff = audioEngine.getEffectProcessor();
    if (eff) eff.setLowPass(currentLowPassFreq, q);
    updateChainStatus();
  });

  resetFreqBtn.addEventListener('click', () => {
    freqSlider.value = '100';
    freqSlider.dispatchEvent(new Event('input'));
  });

  resetQBtn.addEventListener('click', () => {
    qSlider.value = '0';
    qSlider.dispatchEvent(new Event('input'));
  });

  volumeSlider.addEventListener('input', (e) => {
    const val = Number((e.target as HTMLInputElement).value);
    currentVolumePercent = val;
    volumeValueEl.textContent = `${val}%`;
    const eff = audioEngine.getEffectProcessor();
    if (eff) eff.setVolume(val);
    updateChainStatus();
  });

  window.addEventListener('resize', () => {
    setupCanvas();
  });

  audioEngine.onPlaybackEnd = () => {
    playIcon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"></polygon>';
  };
}

function renderLoop(): void {
  drawSpectrum();
  drawWaveform();
  updateProgressUI();
  requestAnimationFrame(renderLoop);
}

function init(): void {
  setupCanvas();
  bindEvents();
  updateChainStatus();

  setTimeout(() => {
    loadingOverlay.classList.add('hidden');
  }, 300);

  requestAnimationFrame(renderLoop);
}

function syncEffectsToProcessor(): void {
  const eff = audioEngine.getEffectProcessor();
  if (!eff) return;
  eff.setReverb(currentReverbPercent);
  eff.setLowPass(currentLowPassFreq, currentLowPassQ);
  eff.setVolume(currentVolumePercent);
}

document.addEventListener('DOMContentLoaded', init);
