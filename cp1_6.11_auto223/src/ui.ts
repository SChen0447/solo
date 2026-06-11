import type { WaveformData, SpectrumData, DecodeResult } from './signal';
import type { PointingParams } from './array';

export interface UICallbacks {
  onFrequencyChange: (freq: number) => void;
  onGainChange: (gain: number) => void;
  onDecode: () => void;
}

export class UIManager {
  private container: HTMLElement;
  private callbacks: UICallbacks;

  private statusPanel!: HTMLElement;
  private signalBar!: HTMLElement;
  private snrText!: HTMLElement;
  private radarCanvas!: HTMLCanvasElement;
  private radarAngle: number = 0;

  private spectrumPanel!: HTMLElement;
  private waveformCanvas!: HTMLCanvasElement;
  private pulseIndicator!: HTMLElement;
  private pulseActive: boolean = false;

  private decodePanel!: HTMLElement;
  private spectrumCanvas!: HTMLCanvasElement;
  private decodeBtn!: HTMLElement;
  private binaryDisplay!: HTMLElement;
  private binarySequence: string = '';
  private binaryAnimFrame: number = 0;

  private controlPanel!: HTMLElement;
  private freqKnob!: HTMLElement;
  private freqValue!: HTMLElement;
  private gainSlider!: HTMLInputElement;
  private gainValue!: HTMLElement;

  private pointingDisplay!: HTMLElement;

  private toastContainer!: HTMLElement;

  private audioContext: AudioContext | null = null;

  private isDraggingKnob: boolean = false;
  private knobStartAngle: number = 0;
  private knobStartY: number = 0;
  private currentFrequency: number = 1.42;

  private isDecoding: boolean = false;

  constructor(container: HTMLElement, callbacks: UICallbacks) {
    this.container = container;
    this.callbacks = callbacks;

    this.createStatusPanel();
    this.createSpectrumPanel();
    this.createDecodePanel();
    this.createControlPanel();
    this.createPointingDisplay();
    this.createToastContainer();

    this.bindEvents();
  }

  private createStatusPanel(): void {
    this.statusPanel = document.createElement('div');
    this.statusPanel.className = 'glass-panel';
    this.statusPanel.style.cssText = `
      position: absolute;
      top: 20px;
      left: 20px;
      width: 180px;
      height: 100px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      z-index: 20;
    `;

    const title = document.createElement('div');
    title.textContent = '系统状态';
    title.style.cssText = `
      font-size: 11px;
      color: #22c55e;
      letter-spacing: 1px;
      text-transform: uppercase;
    `;
    this.statusPanel.appendChild(title);

    const signalRow = document.createElement('div');
    signalRow.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
    `;

    const signalLabel = document.createElement('span');
    signalLabel.textContent = 'SIG';
    signalLabel.style.cssText = `
      font-size: 10px;
      color: #9ca3af;
      width: 30px;
    `;
    signalRow.appendChild(signalLabel);

    const barContainer = document.createElement('div');
    barContainer.style.cssText = `
      flex: 1;
      height: 12px;
      background: rgba(30, 41, 59, 0.8);
      border-radius: 2px;
      overflow: hidden;
      position: relative;
    `;

    this.signalBar = document.createElement('div');
    this.signalBar.style.cssText = `
      height: 100%;
      width: 30%;
      background: linear-gradient(90deg, #22c55e, #eab308, #ef4444);
      transition: width 0.1s ease;
      border-radius: 2px;
    `;
    barContainer.appendChild(this.signalBar);
    signalRow.appendChild(barContainer);

    this.statusPanel.appendChild(signalRow);

    const snrRow = document.createElement('div');
    snrRow.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
    `;

    const snrLabel = document.createElement('span');
    snrLabel.textContent = 'SNR';
    snrLabel.style.cssText = `
      font-size: 10px;
      color: #9ca3af;
      width: 30px;
    `;
    snrRow.appendChild(snrLabel);

    this.snrText = document.createElement('span');
    this.snrText.textContent = '00.0 dB';
    this.snrText.style.cssText = `
      font-size: 12px;
      color: #22c55e;
      font-weight: bold;
      flex: 1;
    `;
    snrRow.appendChild(this.snrText);

    this.statusPanel.appendChild(snrRow);

    const radarRow = document.createElement('div');
    radarRow.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
    `;

    const scanLabel = document.createElement('span');
    scanLabel.textContent = '扫描中';
    scanLabel.style.cssText = `
      font-size: 10px;
      color: #9ca3af;
      width: 30px;
    `;
    radarRow.appendChild(scanLabel);

    this.radarCanvas = document.createElement('canvas');
    this.radarCanvas.width = 40;
    this.radarCanvas.height = 40;
    this.radarCanvas.style.cssText = `
      width: 40px;
      height: 40px;
    `;
    radarRow.appendChild(this.radarCanvas);

    this.statusPanel.appendChild(radarRow);

    this.container.appendChild(this.statusPanel);
  }

  private createSpectrumPanel(): void {
    this.spectrumPanel = document.createElement('div');
    this.spectrumPanel.className = 'glass-panel neon-border';
    this.spectrumPanel.style.cssText = `
      position: absolute;
      top: 20px;
      right: 20px;
      width: 300px;
      height: 400px;
      background: rgba(10, 15, 30, 0.85);
      border: 1px solid #16a34a;
      border-radius: 6px;
      padding: 12px;
      z-index: 20;
    `;

    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    `;

    const title = document.createElement('span');
    title.textContent = '频谱仪 · 实时波形';
    title.style.cssText = `
      font-size: 11px;
      color: #22c55e;
      letter-spacing: 1px;
      text-transform: uppercase;
    `;
    header.appendChild(title);

    this.pulseIndicator = document.createElement('div');
    this.pulseIndicator.style.cssText = `
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 1px solid #ff4444;
      background: transparent;
      transition: all 0.05s ease;
    `;
    header.appendChild(this.pulseIndicator);

    this.spectrumPanel.appendChild(header);

    this.waveformCanvas = document.createElement('canvas');
    this.waveformCanvas.width = 276;
    this.waveformCanvas.height = 340;
    this.waveformCanvas.style.cssText = `
      width: 100%;
      height: calc(100% - 60px);
      background: rgba(0, 0, 0, 0.5);
      border-radius: 4px;
    `;
    this.spectrumPanel.appendChild(this.waveformCanvas);

    const scaleLabels = document.createElement('div');
    scaleLabels.style.cssText = `
      display: flex;
      justify-content: space-between;
      margin-top: 6px;
      font-size: 9px;
      color: #4b5563;
    `;

    const leftLabel = document.createElement('span');
    leftLabel.textContent = '-10dB';
    scaleLabels.appendChild(leftLabel);

    const midLabel = document.createElement('span');
    midLabel.textContent = '0dB';
    scaleLabels.appendChild(midLabel);

    const rightLabel = document.createElement('span');
    rightLabel.textContent = '+10dB';
    scaleLabels.appendChild(rightLabel);

    this.spectrumPanel.appendChild(scaleLabels);

    this.container.appendChild(this.spectrumPanel);
  }

  private createDecodePanel(): void {
    this.decodePanel = document.createElement('div');
    this.decodePanel.className = 'glass-panel';
    this.decodePanel.style.cssText = `
      position: absolute;
      top: 440px;
      right: 20px;
      width: 300px;
      height: 150px;
      background: rgba(17, 24, 39, 0.85);
      border: 1px solid #374151;
      border-radius: 6px;
      padding: 12px;
      z-index: 20;
    `;

    const title = document.createElement('div');
    title.textContent = '信号解码';
    title.style.cssText = `
      font-size: 11px;
      color: #22c55e;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-bottom: 8px;
    `;
    this.decodePanel.appendChild(title);

    this.spectrumCanvas = document.createElement('canvas');
    this.spectrumCanvas.width = 276;
    this.spectrumCanvas.height = 60;
    this.spectrumCanvas.style.cssText = `
      width: 100%;
      height: 60px;
      background: rgba(0, 0, 0, 0.5);
      border-radius: 4px;
      margin-bottom: 8px;
    `;
    this.decodePanel.appendChild(this.spectrumCanvas);

    const bottomRow = document.createElement('div');
    bottomRow.style.cssText = `
      display: flex;
      align-items: center;
      gap: 10px;
    `;

    this.decodeBtn = document.createElement('button');
    this.decodeBtn.className = 'btn';
    this.decodeBtn.textContent = '智能解码';
    this.decodeBtn.style.cssText = `
      background: #2563eb;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 11px;
      font-family: 'Courier New', Courier, monospace;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(37, 99, 235, 0.4);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    `;
    bottomRow.appendChild(this.decodeBtn);

    this.binaryDisplay = document.createElement('div');
    this.binaryDisplay.style.cssText = `
      flex: 1;
      height: 32px;
      display: flex;
      align-items: center;
      gap: 2px;
      overflow: hidden;
      padding: 0 4px;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 4px;
    `;
    bottomRow.appendChild(this.binaryDisplay);

    this.decodePanel.appendChild(bottomRow);

    this.container.appendChild(this.decodePanel);
  }

  private createControlPanel(): void {
    this.controlPanel = document.createElement('div');
    this.controlPanel.className = 'glass-panel';
    this.controlPanel.style.cssText = `
      position: absolute;
      bottom: 20px;
      left: 20px;
      padding: 16px;
      display: flex;
      align-items: flex-end;
      gap: 20px;
      z-index: 20;
    `;

    const knobContainer = document.createElement('div');
    knobContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    `;

    this.freqKnob = document.createElement('div');
    this.freqKnob.style.cssText = `
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: linear-gradient(145deg, #374151, #1f2937);
      border: 2px solid #4b5563;
      position: relative;
      cursor: grab;
      box-shadow: 
        inset 0 2px 4px rgba(255,255,255,0.1),
        0 4px 12px rgba(0,0,0,0.4);
    `;

    const knobIndicator = document.createElement('div');
    knobIndicator.style.cssText = `
      position: absolute;
      top: 6px;
      left: 50%;
      transform: translateX(-50%);
      width: 3px;
      height: 12px;
      background: #22c55e;
      border-radius: 2px;
    `;
    this.freqKnob.appendChild(knobIndicator);

    const knobTicks = document.createElement('div');
    knobTicks.style.cssText = `
      position: absolute;
      top: -4px;
      left: -4px;
      right: -4px;
      bottom: -4px;
      border-radius: 50%;
      pointer-events: none;
    `;

    for (let i = 0; i <= 10; i++) {
      const tick = document.createElement('div');
      const angle = -135 + (i / 10) * 270;
      const rad = (angle * Math.PI) / 180;
      const isMajor = i % 2 === 0;
      const tickLen = isMajor ? 6 : 3;
      const tickW = isMajor ? 2 : 1;
      tick.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        width: ${tickW}px;
        height: ${tickLen}px;
        background: #4b5563;
        transform-origin: center ${25 + 4}px;
        transform: translate(-50%, -100%) rotate(${angle}deg) translateY(-${25 - tickLen + 2}px);
      `;
      knobTicks.appendChild(tick);
    }
    this.freqKnob.appendChild(knobTicks);

    knobContainer.appendChild(this.freqKnob);

    this.freqValue = document.createElement('div');
    this.freqValue.textContent = '1.42 GHz';
    this.freqValue.style.cssText = `
      font-size: 10px;
      color: #22c55e;
      text-align: center;
      min-width: 60px;
    `;
    knobContainer.appendChild(this.freqValue);

    const freqLabel = document.createElement('div');
    freqLabel.textContent = '频率';
    freqLabel.style.cssText = `
      font-size: 9px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 1px;
    `;
    knobContainer.appendChild(freqLabel);

    this.controlPanel.appendChild(knobContainer);

    const sliderContainer = document.createElement('div');
    sliderContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      height: 140px;
    `;

    const sliderTrack = document.createElement('div');
    sliderTrack.style.cssText = `
      width: 8px;
      height: 120px;
      background: #1f2937;
      border-radius: 4px;
      position: relative;
      border: 1px solid #374151;
    `;

    this.gainSlider = document.createElement('input');
    this.gainSlider.type = 'range';
    this.gainSlider.min = '0';
    this.gainSlider.max = '100';
    this.gainSlider.value = '50';
    this.gainSlider.style.cssText = `
      position: absolute;
      top: 0;
      left: -6px;
      width: 120px;
      height: 8px;
      transform: rotate(-90deg);
      transform-origin: top left;
      appearance: none;
      -webkit-appearance: none;
      background: transparent;
      cursor: pointer;
    `;

    const style = document.createElement('style');
    style.textContent = `
      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: linear-gradient(145deg, #22c55e, #16a34a);
        cursor: pointer;
        box-shadow: 0 2px 6px rgba(34, 197, 94, 0.5);
        border: 2px solid #166534;
      }
      input[type="range"]::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: linear-gradient(145deg, #22c55e, #16a34a);
        cursor: pointer;
        box-shadow: 0 2px 6px rgba(34, 197, 94, 0.5);
        border: 2px solid #166534;
      }
    `;
    document.head.appendChild(style);

    sliderTrack.appendChild(this.gainSlider);
    sliderContainer.appendChild(sliderTrack);

    this.gainValue = document.createElement('div');
    this.gainValue.textContent = '50 dB';
    this.gainValue.style.cssText = `
      font-size: 10px;
      color: #22c55e;
      text-align: center;
      min-width: 50px;
    `;
    sliderContainer.appendChild(this.gainValue);

    const gainLabel = document.createElement('div');
    gainLabel.textContent = '增益';
    gainLabel.style.cssText = `
      font-size: 9px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 1px;
    `;
    sliderContainer.appendChild(gainLabel);

    this.controlPanel.appendChild(sliderContainer);

    this.container.appendChild(this.controlPanel);
  }

  private createPointingDisplay(): void {
    this.pointingDisplay = document.createElement('div');
    this.pointingDisplay.className = 'glass-panel';
    this.pointingDisplay.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -80px);
      padding: 10px 16px;
      font-size: 12px;
      color: #22c55e;
      text-align: center;
      pointer-events: none;
      opacity: 0.8;
      z-index: 15;
    `;

    const raLine = document.createElement('div');
    raLine.innerHTML = 'RA: <span id="ra-value">12h00m00s</span>';
    raLine.style.cssText = `
      letter-spacing: 1px;
    `;
    this.pointingDisplay.appendChild(raLine);

    const decLine = document.createElement('div');
    decLine.innerHTML = 'DEC: <span id="dec-value">+20°00\'00"</span>';
    decLine.style.cssText = `
      letter-spacing: 1px;
      margin-top: 4px;
    `;
    this.pointingDisplay.appendChild(decLine);

    this.container.appendChild(this.pointingDisplay);
  }

  private createToastContainer(): void {
    this.toastContainer = document.createElement('div');
    this.toastContainer.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 100;
      pointer-events: none;
    `;
    this.container.appendChild(this.toastContainer);
  }

  private bindEvents(): void {
    this.freqKnob.addEventListener('mousedown', (e) => this.startKnobDrag(e));
    window.addEventListener('mousemove', (e) => this.onKnobDrag(e));
    window.addEventListener('mouseup', () => this.endKnobDrag());

    this.gainSlider.addEventListener('input', () => {
      const gain = parseFloat(this.gainSlider.value);
      this.gainValue.textContent = `${gain.toFixed(0)} dB`;
      this.callbacks.onGainChange(gain);
    });

    this.decodeBtn.addEventListener('click', () => {
      this.onDecodeClick();
    });
  }

  private startKnobDrag(e: MouseEvent): void {
    e.preventDefault();
    this.isDraggingKnob = true;
    this.knobStartY = e.clientY;
    this.knobStartAngle = this.freqToAngle(this.currentFrequency);
    this.freqKnob.style.cursor = 'grabbing';
  }

  private onKnobDrag(e: MouseEvent): void {
    if (!this.isDraggingKnob) return;

    const deltaY = this.knobStartY - e.clientY;
    const sensitivity = 1.5;
    const angleDelta = deltaY * sensitivity;

    let newAngle = this.knobStartAngle + angleDelta;
    newAngle = Math.max(-135, Math.min(135, newAngle));

    const freq = this.angleToFreq(newAngle);
    this.setFrequency(freq);
  }

  private endKnobDrag(): void {
    this.isDraggingKnob = false;
    this.freqKnob.style.cursor = 'grab';
  }

  private freqToAngle(freq: number): number {
    const normalized = (freq - 0.1) / (10 - 0.1);
    return -135 + normalized * 270;
  }

  private angleToFreq(angle: number): number {
    const normalized = (angle + 135) / 270;
    return 0.1 + normalized * (10 - 0.1);
  }

  setFrequency(freq: number): void {
    this.currentFrequency = freq;
    const angle = this.freqToAngle(freq);
    const indicator = this.freqKnob.querySelector('div') as HTMLElement;
    if (indicator) {
      indicator.style.transform = `translateX(-50%) rotate(${angle}deg)`;
      indicator.style.transformOrigin = 'center 25px';
    }
    this.freqValue.textContent = `${freq.toFixed(2)} GHz`;
    this.callbacks.onFrequencyChange(freq);
  }

  setGain(gain: number): void {
    this.gainSlider.value = gain.toString();
    this.gainValue.textContent = `${gain.toFixed(0)} dB`;
  }

  private onDecodeClick(): void {
    if (this.isDecoding) return;
    this.isDecoding = true;

    this.decodeBtn.style.background = '#1d4ed8';
    this.decodeBtn.style.transform = 'scale(0.98) translateY(1px)';

    setTimeout(() => {
      this.decodeBtn.style.background = '#2563eb';
      this.decodeBtn.style.transform = '';
      this.isDecoding = false;
    }, 200);

    this.callbacks.onDecode();
  }

  updateWaveform(waveform: WaveformData): void {
    const canvas = this.waveformCanvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(34, 197, 94, 0.1)';
    ctx.lineWidth = 1;

    for (let i = 0; i <= 4; i++) {
      const y = (h / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(34, 197, 94, 0.15)';
    for (let i = 0; i <= 8; i++) {
      const x = (w / 8) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    const { samples } = waveform;
    const numSamples = samples.length;

    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#22c55e';
    ctx.shadowBlur = 6;
    ctx.beginPath();

    for (let i = 0; i < w; i++) {
      const sampleIdx = Math.floor((i / w) * numSamples);
      const sample = samples[sampleIdx];
      const normalized = (sample + 3) / 6;
      const y = h * (1 - Math.max(0, Math.min(1, normalized)));

      if (i === 0) {
        ctx.moveTo(i, y);
      } else {
        ctx.lineTo(i, y);
      }
    }

    ctx.stroke();
    ctx.shadowBlur = 0;

    if (waveform.hasPulse) {
      this.pulseActive = true;
      this.pulseIndicator.style.background = '#ef4444';
      this.pulseIndicator.style.boxShadow = '0 0 10px #ef4444, 0 0 20px #ef4444';
    } else {
      this.pulseActive = false;
      this.pulseIndicator.style.background = 'transparent';
      this.pulseIndicator.style.boxShadow = 'none';
    }
  }

  updateSpectrum(spectrum: SpectrumData): void {
    const canvas = this.spectrumCanvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, w, h);

    const { frequencies, magnitudes } = spectrum;
    const numBins = frequencies.length;

    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#22c55e';
    ctx.shadowBlur = 4;
    ctx.beginPath();

    for (let i = 0; i < numBins; i++) {
      const x = (i / (numBins - 1)) * w;
      const mag = magnitudes[i];
      const normalized = (mag + 40) / 60;
      const y = h * (1 - Math.max(0, Math.min(1, normalized)));

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.stroke();
    ctx.shadowBlur = 0;

    const peakX = (spectrum.peakFreq / 10) * w;
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(peakX, 5, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  updateStatus(signalStrength: number, snr: number): void {
    const percent = Math.max(0, Math.min(100, signalStrength * 100));
    this.signalBar.style.width = `${percent}%`;

    this.snrText.textContent = `${snr.toFixed(1)} dB`;

    if (snr > 25) {
      this.snrText.style.color = '#22c55e';
    } else if (snr > 10) {
      this.snrText.style.color = '#eab308';
    } else {
      this.snrText.style.color = '#ef4444';
    }
  }

  updatePointing(pointing: PointingParams): void {
    const raEl = this.pointingDisplay.querySelector('#ra-value');
    const decEl = this.pointingDisplay.querySelector('#dec-value');
    if (raEl) raEl.textContent = pointing.ra;
    if (decEl) decEl.textContent = pointing.dec;
  }

  updateRadar(time: number): void {
    const canvas = this.radarCanvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(cx, cy) - 2;

    ctx.clearRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(34, 197, 94, 0.3)';
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.66, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.33, 0, Math.PI * 2);
    ctx.stroke();

    const scanAngle = (time * Math.PI * 2) / 2;

    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    gradient.addColorStop(0, 'rgba(34, 197, 94, 0)');
    gradient.addColorStop(1, 'rgba(34, 197, 94, 0)');

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(scanAngle);

    const sweepGradient = ctx.createLinearGradient(0, 0, 0, -radius);
    sweepGradient.addColorStop(0, 'rgba(34, 197, 94, 0.6)');
    sweepGradient.addColorStop(1, 'rgba(34, 197, 94, 0)');

    ctx.strokeStyle = sweepGradient;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -radius);
    ctx.stroke();

    ctx.fillStyle = 'rgba(34, 197, 94, 0.1)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, -Math.PI / 4, 0);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    const blinkAlpha = 0.5 + 0.5 * Math.sin(time * 4);
    ctx.fillStyle = `rgba(34, 197, 94, ${blinkAlpha})`;
    ctx.beginPath();
    ctx.arc(cx + radius * 0.5, cy - radius * 0.3, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(34, 197, 94, ${0.3 + 0.3 * Math.sin(time * 3 + 1)})`;
    ctx.beginPath();
    ctx.arc(cx + radius * 0.2, cy + radius * 0.5, 1, 0, Math.PI * 2);
    ctx.fill();
  }

  showDecodeResult(result: DecodeResult): void {
    this.binarySequence = result.binarySequence;
    this.binaryAnimFrame = 0;

    this.binaryDisplay.innerHTML = '';

    if (result.isTechSignal && result.binarySequence) {
      for (let i = 0; i < Math.min(20, result.binarySequence.length); i++) {
        const bit = document.createElement('div');
        bit.style.cssText = `
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: ${result.binarySequence[i] === '1' ? '#22c55e' : '#1f2937'};
          flex-shrink: 0;
          transition: background 0.3s ease;
        `;
        this.binaryDisplay.appendChild(bit);
      }

      this.showToast('检测到候选技术信号', '#22c55e');
      this.playTone(result.carrierFreq * 100, 2);
    } else {
      const empty = document.createElement('div');
      empty.textContent = '未检测到可解码信号';
      empty.style.cssText = `
        font-size: 9px;
        color: #6b7280;
        width: 100%;
        text-align: center;
      `;
      this.binaryDisplay.appendChild(empty);
    }
  }

  updateBinaryAnimation(time: number): void {
    const bits = this.binaryDisplay.querySelectorAll('div');
    if (bits.length === 0 || !this.binarySequence) return;

    const blinkSpeed = 0.5;
    const activeIdx = Math.floor(time / blinkSpeed) % this.binarySequence.length;

    bits.forEach((bit, i) => {
      const seqIdx = i;
      if (seqIdx >= this.binarySequence.length) return;

      const isOne = this.binarySequence[seqIdx] === '1';
      const isActive = seqIdx === activeIdx % bits.length;

      if (isOne) {
        (bit as HTMLElement).style.background = isActive ? '#4ade80' : '#22c55e';
        (bit as HTMLElement).style.boxShadow = isActive ? '0 0 8px #22c55e' : 'none';
      } else {
        (bit as HTMLElement).style.background = isActive ? '#374151' : '#1f2937';
        (bit as HTMLElement).style.boxShadow = 'none';
      }
    });
  }

  private showToast(message: string, color: string = '#ffffff'): void {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
      padding: 12px 24px;
      background: rgba(0, 0, 0, 0.8);
      color: ${color};
      border: 1px solid ${color};
      border-radius: 6px;
      font-size: 13px;
      letter-spacing: 1px;
      opacity: 0;
      transform: translateY(-20px);
      transition: all 0.3s ease;
      backdrop-filter: blur(8px);
      box-shadow: 0 0 20px ${color}40;
    `;

    this.toastContainer.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-20px)';
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 3000);
  }

  private playTone(freq: number, duration: number): void {
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.value = Math.max(100, Math.min(2000, freq));

      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.1, this.audioContext.currentTime + 0.1);
      gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + duration - 0.1);

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.start();
      oscillator.stop(this.audioContext.currentTime + duration);
    } catch (e) {
      console.warn('Audio playback failed:', e);
    }
  }

  showPulseAlert(): void {
    this.showToast('检测到候选脉冲星信号', '#ef4444');
  }

  update(deltaTime: number, time: number): void {
    this.updateRadar(time);
    this.updateBinaryAnimation(time);
  }

  getFrequency(): number {
    return this.currentFrequency;
  }

  getGain(): number {
    return parseFloat(this.gainSlider.value);
  }
}
