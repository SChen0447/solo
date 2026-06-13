const BASE_RPM = 33.33;
const BASE_RPS = BASE_RPM / 60;
const BASE_RAD_PER_MS = BASE_RPS * Math.PI * 2 / 1000;
const ACCEL_DURATION = 2000;

class Spring {
  value: number;
  target: number;
  velocity: number;
  stiffness: number;
  damping: number;

  constructor(initial: number, stiffness = 0.08, damping = 0.75) {
    this.value = initial;
    this.target = initial;
    this.velocity = 0;
    this.stiffness = stiffness;
    this.damping = damping;
  }

  update() {
    const force = (this.target - this.value) * this.stiffness;
    this.velocity += force;
    this.velocity *= this.damping;
    this.value += this.velocity;
  }
}

export class RecordPlayer {
  cx: number;
  cy: number;
  radius: number;

  private vinylOffscreen: HTMLCanvasElement;
  private rotation: number = 0;
  private rotationSpeed: number = 0;
  private targetSpeed: number = 0;
  private accelStart: number = 0;
  private isPlaying: boolean = false;
  private wasPlaying: boolean = false;

  private tonearmPivotX: number;
  private tonearmPivotY: number;
  private tonearmLength: number;
  private tonearmAngle: Spring;
  private tonearmRestAngle: number;
  private tonearmPlayAngle: number;
  private isDragging: boolean = false;
  private dragStartAngle: number = 0;
  private scratchFactor: number = 0;

  private wobblePhase: number = 0;
  private wobbleAmount: number = 0;
  private airRipplePhase: number = 0;

  constructor(cx: number, cy: number, radius: number) {
    this.cx = cx;
    this.cy = cy;
    this.radius = radius;

    this.tonearmLength = radius * 1.3;
    this.tonearmPivotX = cx + radius * 0.75;
    this.tonearmPivotY = cy - radius * 1.05;
    this.tonearmRestAngle = -Math.PI * 0.35;
    this.tonearmPlayAngle = -Math.PI * 0.18;
    this.tonearmAngle = new Spring(this.tonearmRestAngle, 0.06, 0.72);

    this.vinylOffscreen = document.createElement('canvas');
    this.preRenderVinyl();
  }

  reposition(cx: number, cy: number, radius: number) {
    this.cx = cx;
    this.cy = cy;
    this.radius = radius;
    this.tonearmLength = radius * 1.3;
    this.tonearmPivotX = cx + radius * 0.75;
    this.tonearmPivotY = cy - radius * 1.05;
    this.preRenderVinyl();
  }

  private preRenderVinyl() {
    const size = (this.radius + 10) * 2;
    this.vinylOffscreen.width = size;
    this.vinylOffscreen.height = size;
    const ctx = this.vinylOffscreen.getContext('2d')!;
    const c = size / 2;
    const r = this.radius;

    ctx.beginPath();
    ctx.arc(c, c, r, 0, Math.PI * 2);
    ctx.fillStyle = '#0a0a0a';
    ctx.fill();

    const innerR = r * 0.32;
    const outerR = r * 0.96;
    const grooveCount = Math.floor((outerR - innerR) / 1.2);
    for (let i = 0; i < grooveCount; i++) {
      const gr = innerR + (outerR - innerR) * (i / grooveCount);
      const brightness = 20 + Math.random() * 18;
      const alpha = 0.25 + Math.random() * 0.35;
      ctx.beginPath();
      ctx.arc(c, c, gr, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${brightness}, ${brightness}, ${brightness + 5}, ${alpha})`;
      ctx.lineWidth = 0.4 + Math.random() * 0.3;
      ctx.stroke();
    }

    for (let i = 0; i < 3; i++) {
      const highlightAngle = -Math.PI * 0.25 + i * Math.PI * 0.5;
      const hx = c + Math.cos(highlightAngle) * r * 0.4;
      const hy = c + Math.sin(highlightAngle) * r * 0.4;
      const grad = ctx.createRadialGradient(hx, hy, 0, hx, hy, r * 0.8);
      grad.addColorStop(0, `rgba(120, 120, 130, ${0.06 - i * 0.015})`);
      grad.addColorStop(0.6, 'rgba(80, 80, 85, 0.02)');
      grad.addColorStop(1, 'rgba(40, 40, 40, 0)');
      ctx.beginPath();
      ctx.arc(c, c, r, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    }

    const edgeGrad = ctx.createRadialGradient(c, c, r * 0.92, c, c, r);
    edgeGrad.addColorStop(0, 'rgba(30, 30, 30, 0)');
    edgeGrad.addColorStop(0.5, 'rgba(50, 50, 55, 0.1)');
    edgeGrad.addColorStop(1, 'rgba(20, 20, 20, 0.3)');
    ctx.beginPath();
    ctx.arc(c, c, r, 0, Math.PI * 2);
    ctx.fillStyle = edgeGrad;
    ctx.fill();

    const labelR = r * 0.3;
    const labelGrad = ctx.createRadialGradient(c, c - labelR * 0.1, 0, c, c, labelR);
    labelGrad.addColorStop(0, '#a01020');
    labelGrad.addColorStop(0.5, '#7a0a15');
    labelGrad.addColorStop(0.85, '#5a0810');
    labelGrad.addColorStop(1, '#3a0508');
    ctx.beginPath();
    ctx.arc(c, c, labelR, 0, Math.PI * 2);
    ctx.fillStyle = labelGrad;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(c, c, labelR, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(200, 170, 120, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#d4a574';
    ctx.font = `bold ${Math.max(10, labelR * 0.28)}px 'Georgia', serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('墨韵留声', c, c - labelR * 0.15);

    ctx.fillStyle = 'rgba(200, 170, 120, 0.7)';
    ctx.font = `${Math.max(8, labelR * 0.16)}px 'Georgia', serif`;
    ctx.fillText('33⅓ RPM', c, c + labelR * 0.22);

    ctx.beginPath();
    ctx.arc(c, c, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#111';
    ctx.fill();
    ctx.strokeStyle = 'rgba(150, 150, 150, 0.4)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(c, c, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(60, 60, 65, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  setPlaying(playing: boolean) {
    this.isPlaying = playing;
    if (playing && !this.wasPlaying) {
      this.accelStart = performance.now();
      this.targetSpeed = BASE_RAD_PER_MS;
      this.tonearmAngle.target = this.tonearmPlayAngle;
    } else if (!playing) {
      this.targetSpeed = 0;
      this.tonearmAngle.target = this.tonearmRestAngle;
    }
    this.wasPlaying = playing;
  }

  getPlaying() {
    return this.isPlaying;
  }

  getRotationSpeed(): number {
    return this.rotationSpeed;
  }

  setRotationSpeed(speed: number) {
    this.rotationSpeed = speed;
  }

  getScratchFactor(): number {
    return this.scratchFactor;
  }

  getTonearmAngle(): number {
    return this.tonearmAngle.value;
  }

  setTonearmAngle(angle: number) {
    this.tonearmAngle.value = angle;
    this.tonearmAngle.target = angle;
  }

  update(dt: number) {
    if (this.isPlaying) {
      const elapsed = performance.now() - this.accelStart;
      const t = Math.min(1, elapsed / ACCEL_DURATION);
      const eased = t < 1 ? 1 - Math.pow(1 - t, 3) : 1;
      this.rotationSpeed = this.targetSpeed * eased;
    } else {
      this.rotationSpeed *= 0.97;
      if (Math.abs(this.rotationSpeed) < 0.000001) this.rotationSpeed = 0;
    }

    if (this.isDragging) {
      this.scratchFactor *= 0.9;
    } else {
      this.scratchFactor *= 0.95;
      if (Math.abs(this.scratchFactor) < 0.001) this.scratchFactor = 0;
    }

    const effectiveSpeed = this.rotationSpeed * (1 + this.scratchFactor);
    this.rotation -= effectiveSpeed * dt;

    if (this.isPlaying) {
      this.wobblePhase += dt * 0.003;
      this.wobbleAmount = Math.sin(this.wobblePhase) * 0.003 + Math.sin(this.wobblePhase * 1.7) * 0.002;
      this.airRipplePhase += dt * 0.002;
    } else {
      this.wobbleAmount *= 0.95;
      this.airRipplePhase *= 0.98;
    }

    if (!this.isDragging) {
      this.tonearmAngle.update();
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    this.drawWarmGlow(ctx);
    this.drawAirRipple(ctx);
    this.drawVinyl(ctx);
    this.drawTonearm(ctx);
  }

  private drawWarmGlow(ctx: CanvasRenderingContext2D) {
    const glowY = this.cy + this.radius + 20;
    const glowW = this.radius * 1.8;
    const glowH = this.radius * 0.4;
    const grad = ctx.createRadialGradient(
      this.cx, glowY, 0,
      this.cx, glowY, glowW * 0.6
    );
    grad.addColorStop(0, 'rgba(255, 180, 80, 0.12)');
    grad.addColorStop(0.4, 'rgba(255, 140, 50, 0.06)');
    grad.addColorStop(1, 'rgba(255, 100, 30, 0)');
    ctx.beginPath();
    ctx.ellipse(this.cx, glowY, glowW, glowH, 0, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
  }

  private drawAirRipple(ctx: CanvasRenderingContext2D) {
    if (!this.isPlaying || this.airRipplePhase === 0) return;
    const intensity = Math.min(1, this.airRipplePhase * 0.5);
    for (let i = 0; i < 3; i++) {
      const phase = this.airRipplePhase + i * 2.1;
      const r = this.radius + 5 + Math.sin(phase) * 8 * intensity;
      const alpha = (0.03 + Math.sin(phase * 0.7) * 0.02) * intensity;
      ctx.beginPath();
      ctx.arc(this.cx, this.cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(200, 200, 220, ${alpha})`;
      ctx.lineWidth = 1 + Math.sin(phase) * 0.5;
      ctx.stroke();
    }
  }

  private drawVinyl(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.cx, this.cy);
    ctx.rotate(this.rotation);
    const offset = this.vinylOffscreen.width / 2;
    ctx.drawImage(this.vinylOffscreen, -offset, -offset);
    ctx.restore();
  }

  private drawTonearm(ctx: CanvasRenderingContext2D) {
    const angle = this.tonearmAngle.value + this.wobbleAmount;
    const pivotX = this.tonearmPivotX;
    const pivotY = this.tonearmPivotY;
    const len = this.tonearmLength;

    const tipX = pivotX + Math.cos(angle) * len;
    const tipY = pivotY + Math.sin(angle) * len;

    ctx.save();

    const baseGrad = ctx.createRadialGradient(pivotX, pivotY, 0, pivotX, pivotY, 12);
    baseGrad.addColorStop(0, '#c0c0c0');
    baseGrad.addColorStop(0.5, '#909090');
    baseGrad.addColorStop(1, '#606060');
    ctx.beginPath();
    ctx.arc(pivotX, pivotY, 8, 0, Math.PI * 2);
    ctx.fillStyle = baseGrad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(180, 180, 180, 0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();

    const armGrad = ctx.createLinearGradient(pivotX, pivotY, tipX, tipY);
    armGrad.addColorStop(0, '#a8a8a8');
    armGrad.addColorStop(0.3, '#d0d0d0');
    armGrad.addColorStop(0.6, '#b0b0b0');
    armGrad.addColorStop(1, '#909090');

    const perpX = -Math.sin(angle);
    const perpY = Math.cos(angle);
    const w1 = 2.5;
    const w2 = 1.5;

    ctx.beginPath();
    ctx.moveTo(pivotX + perpX * w1, pivotY + perpY * w1);
    ctx.lineTo(tipX + perpX * w2, tipY + perpY * w2);
    ctx.lineTo(tipX - perpX * w2, tipY - perpY * w2);
    ctx.lineTo(pivotX - perpX * w1, pivotY - perpY * w1);
    ctx.closePath();
    ctx.fillStyle = armGrad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(200, 200, 200, 0.3)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    const headshellLen = 18;
    const headshellAngle = angle + 0.15;
    const hsStartX = tipX;
    const hsStartY = tipY;
    const hsEndX = tipX + Math.cos(headshellAngle) * headshellLen;
    const hsEndY = tipY + Math.sin(headshellAngle) * headshellLen;

    const hsGrad = ctx.createLinearGradient(hsStartX, hsStartY, hsEndX, hsEndY);
    hsGrad.addColorStop(0, '#b8b8b8');
    hsGrad.addColorStop(1, '#808080');
    ctx.beginPath();
    ctx.moveTo(hsStartX + perpX * 3, hsStartY + perpY * 3);
    ctx.lineTo(hsEndX + perpX * 1.5, hsEndY + perpY * 1.5);
    ctx.lineTo(hsEndX - perpX * 1.5, hsEndY - perpY * 1.5);
    ctx.lineTo(hsStartX - perpX * 3, hsStartY - perpY * 3);
    ctx.closePath();
    ctx.fillStyle = hsGrad;
    ctx.fill();

    const needleX = hsEndX;
    const needleY = hsEndY;
    ctx.beginPath();
    ctx.arc(needleX, needleY, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = '#e0c060';
    ctx.fill();

    const cwX = pivotX - Math.cos(angle) * 15;
    const cwY = pivotY - Math.sin(angle) * 15;
    const cwGrad = ctx.createRadialGradient(cwX, cwY, 0, cwX, cwY, 7);
    cwGrad.addColorStop(0, '#a0a0a0');
    cwGrad.addColorStop(1, '#606060');
    ctx.beginPath();
    ctx.arc(cwX, cwY, 6, 0, Math.PI * 2);
    ctx.fillStyle = cwGrad;
    ctx.fill();

    ctx.restore();
  }

  getTonearmTipPosition(): { x: number; y: number } {
    const angle = this.tonearmAngle.value;
    return {
      x: this.tonearmPivotX + Math.cos(angle) * this.tonearmLength,
      y: this.tonearmPivotY + Math.sin(angle) * this.tonearmLength
    };
  }

  hitTestTonearm(x: number, y: number): boolean {
    const tip = this.getTonearmTipPosition();
    const distToTip = Math.hypot(x - tip.x, y - tip.y);
    if (distToTip < 25) return true;

    const pivotX = this.tonearmPivotX;
    const pivotY = this.tonearmPivotY;
    const angle = this.tonearmAngle.value;
    const len = this.tonearmLength;
    for (let t = 0.2; t < 1; t += 0.1) {
      const px = pivotX + Math.cos(angle) * len * t;
      const py = pivotY + Math.sin(angle) * len * t;
      if (Math.hypot(x - px, y - py) < 12) return true;
    }
    return false;
  }

  startDrag(x: number, y: number) {
    this.isDragging = true;
    this.dragStartAngle = this.tonearmAngle.value;
  }

  moveDrag(x: number, y: number) {
    if (!this.isDragging) return;

    const dx = x - this.cx;
    const dy = y - this.cy;
    const dist = Math.hypot(dx, dy);
    const mouseAngle = Math.atan2(dy, dx);

    const minAngle = this.tonearmPlayAngle - 0.15;
    const maxAngle = this.tonearmRestAngle + 0.05;
    let newAngle = mouseAngle;

    if (newAngle < minAngle) newAngle = minAngle;
    if (newAngle > maxAngle) newAngle = maxAngle;

    const angleDelta = newAngle - this.tonearmAngle.value;
    this.scratchFactor = angleDelta * 8;
    this.tonearmAngle.value = newAngle;
    this.tonearmAngle.target = newAngle;
  }

  endDrag() {
    this.isDragging = false;
    if (this.isPlaying) {
      this.tonearmAngle.target = this.tonearmPlayAngle;
    } else {
      this.tonearmAngle.target = this.tonearmRestAngle;
    }
    this.scratchFactor = 0;
  }

  isDraggingActive(): boolean {
    return this.isDragging;
  }
}
