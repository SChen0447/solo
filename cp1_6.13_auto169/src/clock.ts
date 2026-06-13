import {
  degToRad,
  normalizeAngle,
  shortestAngleDiff,
  springAnimation,
  getAngleFromCenter,
  RUNES,
  noteFrequency,
  RuneData,
  easeInOutQuad,
  clamp
} from './utils';

interface AudioContextState {
  audioCtx: AudioContext;
  currentOsc: OscillatorNode | null;
  currentGain: GainNode | null;
}

export interface ClockOptions {
  diameter: number;
  pointerLength: number;
  onRuneSelect: (rune: RuneData | null) => void;
}

export class Clock {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private diameter: number;
  private pointerLength: number;
  private cx: number;
  private cy: number;

  private outerRingAngle: number = 0;
  private targetOuterRingAngle: number = 0;
  private pointerAngle: number = 0;
  private targetPointerAngle: number = 0;
  private pointerVelocity: number = 0;
  private resetOuterRingAngle: number = 0;
  private resetPointerAngle: number = 0;

  private isDraggingOuter: boolean = false;
  private isDraggingPointer: boolean = false;
  private lastDragAngle: number = 0;
  private lastRuneIndex: number = 0;

  private isAutoRotating: boolean = false;
  private autoRotateTimer: number = 0;
  private autoRotateRuneIndex: number = 0;

  private isResetting: boolean = false;
  private resetStartTime: number = 0;
  private resetStartOuterAngle: number = 0;
  private resetStartPointerAngle: number = 0;
  private resetScaleTimer: number = 0;

  private audio: AudioContextState;
  private onRuneSelect: (rune: RuneData | null) => void;
  private selectedRune: RuneData | null = null;

  private lightBeamAlpha: number = 0;

  constructor(canvas: HTMLCanvasElement, options: ClockOptions) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2d context');
    this.ctx = ctx;

    this.diameter = options.diameter;
    this.pointerLength = options.pointerLength;
    this.onRuneSelect = options.onRuneSelect;

    this.canvas.width = this.diameter;
    this.canvas.height = this.diameter;
    this.cx = this.diameter / 2;
    this.cy = this.diameter / 2;

    this.audio = {
      audioCtx: new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)(),
      currentOsc: null,
      currentGain: null
    };

    this.bindEvents();
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mouseup', this.handleMouseUp);
    this.canvas.addEventListener('mouseleave', this.handleMouseUp);
    this.canvas.addEventListener('dblclick', this.handleDoubleClick);

    this.canvas.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    this.canvas.addEventListener('touchend', this.handleTouchEnd);
  }

  private getPointerPos(e: MouseEvent | Touch): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  private handleMouseDown = (e: MouseEvent): void => {
    if (this.isResetting) return;
    const pos = this.getPointerPos(e);
    this.startDrag(pos);
  };

  private handleMouseMove = (e: MouseEvent): void => {
    const pos = this.getPointerPos(e);
    this.moveDrag(pos);
  };

  private handleMouseUp = (): void => {
    this.endDrag();
  };

  private handleTouchStart = (e: TouchEvent): void => {
    if (this.isResetting) return;
    e.preventDefault();
    const touch = e.touches[0];
    const pos = this.getPointerPos(touch);
    this.startDrag(pos);
  };

  private handleTouchMove = (e: TouchEvent): void => {
    e.preventDefault();
    const touch = e.touches[0];
    const pos = this.getPointerPos(touch);
    this.moveDrag(pos);
  };

  private handleTouchEnd = (): void => {
    this.endDrag();
  };

  private startDrag(pos: { x: number; y: number }): void {
    const distToCenter = Math.hypot(pos.x - this.cx, pos.y - this.cy);
    const outerRingInnerRadius = (this.diameter / 2) * 0.72;
    const outerRingOuterRadius = (this.diameter / 2) * 0.95;

    this.audio.audioCtx.resume();

    if (distToCenter >= outerRingInnerRadius && distToCenter <= outerRingOuterRadius) {
      this.isDraggingOuter = true;
      this.lastDragAngle = getAngleFromCenter(this.cx, this.cy, pos.x, pos.y);
    } else {
      this.isDraggingPointer = true;
      this.pointerVelocity = 0;
    }
  }

  private moveDrag(pos: { x: number; y: number }): void {
    const currentAngle = getAngleFromCenter(this.cx, this.cy, pos.x, pos.y);

    if (this.isDraggingOuter) {
      let delta = currentAngle - this.lastDragAngle;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;

      this.targetOuterRingAngle = this.outerRingAngle + delta;
      this.outerRingAngle = this.targetOuterRingAngle;

      const normalizedAngle = normalizeAngle(this.outerRingAngle);
      const currentRuneIndex = Math.round(normalizedAngle / 30) % 12;

      if (currentRuneIndex !== this.lastRuneIndex) {
        this.playChime(currentRuneIndex);
        this.lastRuneIndex = currentRuneIndex;
      }

      this.lastDragAngle = currentAngle;
    } else if (this.isDraggingPointer) {
      this.targetPointerAngle = currentAngle;
      this.pointerAngle = currentAngle;
    }
  }

  private endDrag(): void {
    if (this.isDraggingPointer) {
      const nearestRuneIdx = this.findNearestRune(this.pointerAngle);
      const rune = RUNES[nearestRuneIdx];
      this.targetPointerAngle = nearestRuneIdx * 30;
      this.selectedRune = rune;
      this.onRuneSelect(rune);
      this.lightBeamAlpha = 1;
    }
    this.isDraggingOuter = false;
    this.isDraggingPointer = false;
  }

  private findNearestRune(angle: number): number {
    const normalized = normalizeAngle(angle);
    return Math.round(normalized / 30) % 12;
  }

  private handleDoubleClick = (): void => {
    this.startReset();
  };

  public startReset(): void {
    if (this.isResetting) return;
    this.isResetting = true;
    this.resetStartTime = performance.now();
    this.resetStartOuterAngle = this.outerRingAngle;
    this.resetStartPointerAngle = this.pointerAngle;
    this.resetOuterRingAngle = this.outerRingAngle;
    this.resetPointerAngle = this.pointerAngle;
    this.resetScaleTimer = 0;
    this.selectedRune = null;
    this.onRuneSelect(null);
    this.playResetScale();
  }

  public toggleAutoRotate(): boolean {
    this.isAutoRotating = !this.isAutoRotating;
    if (this.isAutoRotating) {
      this.autoRotateTimer = 0;
      this.autoRotateRuneIndex = this.findNearestRune(this.pointerAngle);
    }
    return this.isAutoRotating;
  }

  private playChime(runeIndex: number): void {
    const { audioCtx } = this.audio;
    if (this.audio.currentOsc) {
      this.audio.currentOsc.stop();
      this.audio.currentOsc.disconnect();
    }

    const semitone = clamp(runeIndex, 0, 12);
    const freq = noteFrequency(semitone);

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.value = freq;

    const now = audioCtx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    osc.connect(gain).connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.8);

    this.audio.currentOsc = osc;
    this.audio.currentGain = gain;
  }

  private playResetScale(): void {
    const { audioCtx } = this.audio;
    const now = audioCtx.currentTime;
    const noteDuration = 0.15;

    for (let i = 0; i < 15; i++) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const semitone = 24 - i;
      const freq = noteFrequency(semitone);

      osc.type = 'triangle';
      osc.frequency.value = freq;

      const startTime = now + i * noteDuration;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.2, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + noteDuration);

      osc.connect(gain).connect(audioCtx.destination);
      osc.start(startTime);
      osc.stop(startTime + noteDuration);
    }
  }

  public update(dt: number, timestamp: number): void {
    if (this.lightBeamAlpha > 0) {
      this.lightBeamAlpha = Math.max(0, this.lightBeamAlpha - dt * 0.5);
    }

    if (this.isResetting) {
      const elapsed = timestamp - this.resetStartTime;
      const duration = 3000;
      const t = clamp(elapsed / duration, 0, 1);
      const eased = easeInOutQuad(t);

      const targetOuter = Math.round(this.resetStartOuterAngle / 360) * 360;
      const targetPointer = Math.round(this.resetStartPointerAngle / 360) * 360;

      this.outerRingAngle = this.resetStartOuterAngle + (targetOuter - this.resetStartOuterAngle) * eased;
      this.targetOuterRingAngle = this.outerRingAngle;
      this.pointerAngle = this.resetStartPointerAngle + (targetPointer - this.resetStartPointerAngle) * eased;
      this.targetPointerAngle = this.pointerAngle;

      if (t >= 1) {
        this.isResetting = false;
        this.outerRingAngle = 0;
        this.targetOuterRingAngle = 0;
        this.pointerAngle = 0;
        this.targetPointerAngle = 0;
      }
      return;
    }

    if (this.isAutoRotating) {
      this.targetOuterRingAngle += 5 * dt;
      const spring = springAnimation(
        this.outerRingAngle,
        this.targetOuterRingAngle,
        0,
        0.15,
        0.85
      );
      this.outerRingAngle = spring.position;

      this.autoRotateTimer += dt;
      if (this.autoRotateTimer >= 3) {
        this.autoRotateTimer = 0;
        this.autoRotateRuneIndex = (this.autoRotateRuneIndex + 1) % 12;
        this.targetPointerAngle = this.autoRotateRuneIndex * 30;
        this.selectedRune = RUNES[this.autoRotateRuneIndex];
        this.onRuneSelect(this.selectedRune);
        this.lightBeamAlpha = 1;
      }
    } else if (!this.isDraggingOuter) {
      if (Math.abs(this.outerRingAngle - this.targetOuterRingAngle) > 0.01) {
        const diff = shortestAngleDiff(this.outerRingAngle, this.targetOuterRingAngle);
        this.outerRingAngle += diff * 0.1;
      }
    }

    if (!this.isDraggingPointer) {
      const result = springAnimation(
        this.pointerAngle,
        this.targetPointerAngle,
        this.pointerVelocity,
        0.4,
        0.7
      );
      this.pointerAngle = result.position;
      this.pointerVelocity = result.velocity;
    }
  }

  public draw(): void {
    const { ctx, cx, cy } = this;
    const radius = this.diameter / 2;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.drawClockBackground(radius);
    this.drawStoneBase(radius);
    this.drawMiddleRing(radius);
    this.drawOuterRing(radius);
    this.drawPointer(radius);
    this.drawCenterGem(radius);
    this.drawLightBeam(radius);
  }

  private drawClockBackground(radius: number): void {
    const { ctx, cx, cy } = this;
    const normalizedOuterAngle = Math.abs(normalizeAngle(this.outerRingAngle)) / 360;
    const bgStart = this.interpolateColor('#0a1628', '#1a0a28', normalizedOuterAngle);
    const bgEnd = this.interpolateColor('#0a1628', '#2d1b4e', normalizedOuterAngle);

    const gradient = ctx.createRadialGradient(cx, cy, radius * 0.2, cx, cy, radius * 0.95);
    gradient.addColorStop(0, bgStart);
    gradient.addColorStop(1, bgEnd);

    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.95, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  private interpolateColor(a: string, b: string, t: number): string {
    const ah = a.replace('#', '');
    const bh = b.replace('#', '');
    const ar = parseInt(ah.slice(0, 2), 16);
    const ag = parseInt(ah.slice(2, 4), 16);
    const ab = parseInt(ah.slice(4, 6), 16);
    const br = parseInt(bh.slice(0, 2), 16);
    const bg = parseInt(bh.slice(2, 4), 16);
    const bb = parseInt(bh.slice(4, 6), 16);
    const rr = Math.round(ar + (br - ar) * t);
    const gg = Math.round(ag + (bg - ag) * t);
    const rb = Math.round(ab + (bb - ab) * t);
    return `rgb(${rr},${gg},${rb})`;
  }

  private drawStoneBase(radius: number): void {
    const { ctx, cx, cy } = this;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.98, 0, Math.PI * 2);
    ctx.strokeStyle = '#4a5566';
    ctx.lineWidth = 6;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.95, 0, Math.PI * 2);
    const stoneGrad = ctx.createRadialGradient(
      cx - radius * 0.3,
      cy - radius * 0.3,
      0,
      cx,
      cy,
      radius * 0.95
    );
    stoneGrad.addColorStop(0, '#8a9aad');
    stoneGrad.addColorStop(0.5, '#6b7b8d');
    stoneGrad.addColorStop(1, '#4a5566');
    ctx.fillStyle = stoneGrad;
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.7, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  private drawMiddleRing(radius: number): void {
    const { ctx, cx, cy } = this;
    const midRadius = radius * 0.6;

    for (let i = 0; i < 30; i++) {
      const angle = degToRad(i * 12 - 90);
      const isMajor = i % 5 === 0;
      const innerR = midRadius - (isMajor ? 12 : 6);
      const outerR = midRadius;

      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR);
      ctx.lineTo(cx + Math.cos(angle) * outerR, cy + Math.sin(angle) * outerR);
      ctx.strokeStyle = isMajor ? 'rgba(224,224,224,0.9)' : 'rgba(224,224,224,0.5)';
      ctx.lineWidth = isMajor ? 2 : 1;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(cx, cy, midRadius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(224,224,224,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  private drawOuterRing(radius: number): void {
    const { ctx, cx, cy } = this;
    const outerRadius = radius * 0.82;
    const textRadius = radius * 0.88;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(degToRad(this.outerRingAngle));

    for (let i = 0; i < 12; i++) {
      const angle = degToRad(i * 30 - 90);
      const rune = RUNES[i];

      const innerR = radius * 0.72;
      const outerR = radius * 0.95;

      ctx.beginPath();
      ctx.moveTo(Math.cos(angle - degToRad(2)) * innerR, Math.sin(angle - degToRad(2)) * innerR);
      ctx.lineTo(Math.cos(angle - degToRad(2)) * outerR, Math.sin(angle - degToRad(2)) * outerR);
      ctx.moveTo(Math.cos(angle + degToRad(2)) * innerR, Math.sin(angle + degToRad(2)) * innerR);
      ctx.lineTo(Math.cos(angle + degToRad(2)) * outerR, Math.sin(angle + degToRad(2)) * outerR);
      ctx.strokeStyle = 'rgba(224,224,224,0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.save();
      ctx.translate(Math.cos(angle) * textRadius, Math.sin(angle) * textRadius);
      ctx.rotate(angle + Math.PI / 2);
      ctx.font = `${radius * 0.1}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(224,224,224,0.85)';
      ctx.shadowColor = rune.color;
      ctx.shadowBlur = 4;
      ctx.fillText(rune.symbol, 0, 0);
      ctx.restore();

      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * (outerRadius - 8), Math.sin(angle) * (outerRadius - 8));
      ctx.lineTo(Math.cos(angle) * (outerRadius + 8), Math.sin(angle) * (outerRadius + 8));
      ctx.strokeStyle = rune.color;
      ctx.lineWidth = 3;
      ctx.shadowColor = rune.color;
      ctx.shadowBlur = 6;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    ctx.restore();

    ctx.beginPath();
    ctx.arc(cx, cy, outerRadius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(224,224,224,0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  private drawPointer(radius: number): void {
    const { ctx, cx, cy } = this;
    const angle = degToRad(this.pointerAngle - 90);

    const pLength = Math.min(this.pointerLength, radius * 0.65);
    const tipX = cx + Math.cos(angle) * pLength;
    const tipY = cy + Math.sin(angle) * pLength;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    const pointerGrad = ctx.createLinearGradient(0, 0, pLength, 0);
    pointerGrad.addColorStop(0, '#b8860b');
    pointerGrad.addColorStop(0.5, '#d4af37');
    pointerGrad.addColorStop(1, '#ffd700');

    ctx.beginPath();
    ctx.moveTo(0, -4);
    ctx.lineTo(pLength - 25, -6);
    ctx.lineTo(pLength - 10, -10);
    ctx.lineTo(pLength, 0);
    ctx.lineTo(pLength - 10, 10);
    ctx.lineTo(pLength - 25, 6);
    ctx.lineTo(0, 4);
    ctx.closePath();
    ctx.fillStyle = pointerGrad;
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 10;
    ctx.fill();

    ctx.strokeStyle = '#8b6914';
    ctx.lineWidth = 1;
    ctx.shadowBlur = 0;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.lineTo(pLength - 20, 0);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();

    ctx.beginPath();
    ctx.arc(tipX, tipY, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#ffd700';
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 15;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  private drawCenterGem(radius: number): void {
    const { ctx, cx, cy } = this;
    const gemRadius = radius * 0.06;

    const gemGrad = ctx.createRadialGradient(cx - 2, cy - 2, 0, cx, cy, gemRadius);
    gemGrad.addColorStop(0, '#fff8dc');
    gemGrad.addColorStop(0.3, '#ffd700');
    gemGrad.addColorStop(1, '#8b6914');

    ctx.beginPath();
    ctx.arc(cx, cy, gemRadius, 0, Math.PI * 2);
    ctx.fillStyle = gemGrad;
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 20;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = '#5a4510';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  private drawLightBeam(radius: number): void {
    if (this.lightBeamAlpha <= 0 || !this.selectedRune) return;

    const { ctx, cx, cy } = this;
    const angle = degToRad(this.pointerAngle - 90);
    const pLength = Math.min(this.pointerLength, radius * 0.65);
    const tipX = cx + Math.cos(angle) * pLength;
    const tipY = cy + Math.sin(angle) * pLength;

    ctx.save();
    ctx.globalAlpha = this.lightBeamAlpha;

    const beamGrad = ctx.createLinearGradient(tipX, tipY, cx, cy + radius);
    beamGrad.addColorStop(0, 'rgba(255,215,0,0.8)');
    beamGrad.addColorStop(0.5, this.hexToRgba(this.selectedRune.color, 0.5));
    beamGrad.addColorStop(1, this.hexToRgba(this.selectedRune.color, 0));

    ctx.beginPath();
    const beamWidth = 30;
    const perpAngle = angle + Math.PI / 2;
    ctx.moveTo(tipX + Math.cos(perpAngle) * 8, tipY + Math.sin(perpAngle) * 8);
    ctx.lineTo(tipX - Math.cos(perpAngle) * 8, tipY - Math.sin(perpAngle) * 8);
    ctx.lineTo(
      cx + Math.cos(perpAngle) * beamWidth,
      cy + radius + 50 - Math.sin(perpAngle) * beamWidth
    );
    ctx.lineTo(
      cx - Math.cos(perpAngle) * beamWidth,
      cy + radius + 50 + Math.sin(perpAngle) * beamWidth
    );
    ctx.closePath();
    ctx.fillStyle = beamGrad;
    ctx.fill();

    ctx.restore();
  }

  private hexToRgba(hex: string, alpha: number): string {
    const h = hex.replace('#', '');
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  public getSelectedRune(): RuneData | null {
    return this.selectedRune;
  }

  public getClockSize(): number {
    return this.diameter;
  }

  public destroy(): void {
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas.removeEventListener('mouseleave', this.handleMouseUp);
    this.canvas.removeEventListener('dblclick', this.handleDoubleClick);
    this.canvas.removeEventListener('touchstart', this.handleTouchStart);
    this.canvas.removeEventListener('touchmove', this.handleTouchMove);
    this.canvas.removeEventListener('touchend', this.handleTouchEnd);
    this.audio.audioCtx.close();
  }
}
