import type { Note, Point, RadioState } from './types';

const NOTE_SYMBOLS = ['♪', '♫', '♬', '♩', '♭', '♮'];

const FREQUENCY_POINTS = [
  { freq: 88, label: 'LXXXVIII' },
  { freq: 96, label: 'XCVI' },
  { freq: 104, label: 'CIV' },
  { freq: 108, label: 'CVIII' },
];

export class RadioUI {
  private ctx: CanvasRenderingContext2D;
  private canvasWidth: number = 0;
  private canvasHeight: number = 0;
  private scale: number = 1;
  private radioCenter: Point = { x: 0, y: 0 };
  private radioWidth: number = 0;
  private radioHeight: number = 0;
  private knobCenter: Point = { x: 0, y: 0 };
  private knobRadius: number = 40;
  private panelCenter: Point = { x: 0, y: 0 };
  private panelWidth: number = 0;
  private panelHeight: number = 0;
  private notes: Note[] = [];
  private noteIdCounter: number = 0;
  private lastNoteTime: number = 0;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.scale = Math.min(width / 800, height / 600);

    this.radioWidth = 560 * this.scale;
    this.radioHeight = 320 * this.scale;
    this.radioCenter = {
      x: width / 2,
      y: height / 2 - 40 * this.scale,
    };

    this.knobRadius = 40 * this.scale;
    this.knobCenter = {
      x: this.radioCenter.x - this.radioWidth * 0.25,
      y: this.radioCenter.y + this.radioHeight * 0.15,
    };

    this.panelWidth = 260 * this.scale;
    this.panelHeight = 60 * this.scale;
    this.panelCenter = {
      x: this.radioCenter.x + this.radioWidth * 0.18,
      y: this.radioCenter.y + this.radioHeight * 0.15,
    };
  }

  getKnobCenter(): Point {
    return { ...this.knobCenter };
  }

  getKnobRadius(): number {
    return this.knobRadius;
  }

  hitTestKnob(x: number, y: number): boolean {
    const dx = x - this.knobCenter.x;
    const dy = y - this.knobCenter.y;
    return dx * dx + dy * dy <= this.knobRadius * this.knobRadius * 1.3;
  }

  angleFromPointer(x: number, y: number): number {
    const dx = x - this.knobCenter.x;
    const dy = y - this.knobCenter.y;
    let angle = Math.atan2(dy, dx) * 180 / Math.PI;
    angle = (angle + 360) % 360;
    return angle;
  }

  spawnNotes(time: number): void {
    if (time - this.lastNoteTime < 150) return;
    this.lastNoteTime = time;

    const count = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
      this.notes.push({
        id: this.noteIdCounter++,
        x: this.panelCenter.x + (Math.random() - 0.5) * this.panelWidth * 0.6,
        y: this.panelCenter.y - 10 * this.scale,
        vy: -(0.8 + Math.random() * 0.6) * this.scale,
        symbol: NOTE_SYMBOLS[Math.floor(Math.random() * NOTE_SYMBOLS.length)],
        opacity: 1,
        life: 0,
        maxLife: 1200,
      });
    }
  }

  clearNotes(): void {
    this.notes = [];
  }

  update(deltaTime: number, time: number, isPlaying: boolean): void {
    if (isPlaying) {
      this.spawnNotes(time);
    }

    this.notes = this.notes.filter((note) => {
      note.life += deltaTime;
      note.y += note.vy;
      note.opacity = 1 - note.life / note.maxLife;
      return note.life < note.maxLife;
    });
  }

  private easeOut(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  render(state: RadioState, time: number): void {
    const ctx = this.ctx;
    const angleDiff = state.targetKnobAngle - state.knobAngle;
    const easedAngle = state.knobAngle + angleDiff * this.easeOut(Math.min(1, (time % 300) / 300));

    this.drawRadioBody();
    this.drawFrequencyPanel(state.frequency);
    this.drawKnob(easedAngle);
    this.drawNotes();
    this.drawGlow(time);
  }

  private drawRadioBody(): void {
    const ctx = this.ctx;
    const { x: cx, y: cy } = this.radioCenter;
    const w = this.radioWidth;
    const h = this.radioHeight;
    const r = 24 * this.scale;

    ctx.save();

    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 20 * this.scale;
    ctx.shadowOffsetY = 8 * this.scale;

    const bodyGrad = ctx.createLinearGradient(cx, cy - h / 2, cx, cy + h / 2);
    bodyGrad.addColorStop(0, '#a0522d');
    bodyGrad.addColorStop(0.5, '#8b4513');
    bodyGrad.addColorStop(1, '#cd853f');

    this.roundRect(cx - w / 2, cy - h / 2, w, h, r);
    ctx.fillStyle = bodyGrad;
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    ctx.lineWidth = 4 * this.scale;
    ctx.strokeStyle = '#3d2914';
    this.roundRect(cx - w / 2, cy - h / 2, w, h, r);
    ctx.stroke();

    ctx.lineWidth = 1 * this.scale;
    ctx.strokeStyle = 'rgba(255,215,150,0.3)';
    this.roundRect(cx - w / 2 + 6 * this.scale, cy - h / 2 + 6 * this.scale, w - 12 * this.scale, h - 12 * this.scale, r - 4 * this.scale);
    ctx.stroke();

    this.drawSpeakerGrill(cx - w * 0.22, cy + h * 0.05, 140 * this.scale, 160 * this.scale);

    ctx.fillStyle = '#d4a017';
    ctx.font = `bold ${18 * this.scale}px "Georgia", serif`;
    ctx.textAlign = 'center';
    ctx.fillText('拾 光 碎 片', cx, cy - h / 2 + 36 * this.scale);

    ctx.restore();
  }

  private drawSpeakerGrill(cx: number, cy: number, w: number, h: number): void {
    const ctx = this.ctx;
    ctx.save();

    ctx.beginPath();
    this.roundRect(cx - w / 2, cy - h / 2, w, h, 12 * this.scale);
    ctx.clip();

    const grillGrad = ctx.createLinearGradient(cx, cy - h / 2, cx, cy + h / 2);
    grillGrad.addColorStop(0, '#2c1810');
    grillGrad.addColorStop(1, '#4a2c1a');
    ctx.fillStyle = grillGrad;
    ctx.fillRect(cx - w / 2, cy - h / 2, w, h);

    const spacing = 10 * this.scale;
    ctx.strokeStyle = 'rgba(139,90,43,0.5)';
    ctx.lineWidth = 1.5 * this.scale;
    for (let y = cy - h / 2 + spacing; y < cy + h / 2; y += spacing) {
      ctx.beginPath();
      ctx.moveTo(cx - w / 2, y);
      ctx.lineTo(cx + w / 2, y);
      ctx.stroke();
    }
    for (let x = cx - w / 2 + spacing; x < cx + w / 2; x += spacing) {
      ctx.beginPath();
      ctx.moveTo(x, cy - h / 2);
      ctx.lineTo(x, cy + h / 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawFrequencyPanel(frequency: number): void {
    const ctx = this.ctx;
    const { x: cx, y: cy } = this.panelCenter;
    const w = this.panelWidth;
    const h = this.panelHeight;
    const r = 8 * this.scale;

    ctx.save();

    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 6 * this.scale;
    ctx.shadowInset = true;

    const panelGrad = ctx.createLinearGradient(cx, cy - h / 2, cx, cy + h / 2);
    panelGrad.addColorStop(0, '#fff8dc');
    panelGrad.addColorStop(1, '#f5deb3');

    this.roundRect(cx - w / 2, cy - h / 2, w, h, r);
    ctx.fillStyle = panelGrad;
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.lineWidth = 2 * this.scale;
    ctx.strokeStyle = '#8b6914';
    this.roundRect(cx - w / 2, cy - h / 2, w, h, r);
    ctx.stroke();

    const leftFreq = 88;
    const rightFreq = 108;
    const freqRange = rightFreq - leftFreq;
    const indicatorX = cx - w / 2 + ((frequency - leftFreq) / freqRange) * (w - 20 * this.scale) + 10 * this.scale;

    ctx.fillStyle = '#3d2914';
    ctx.font = `${10 * this.scale}px "Times New Roman", serif`;
    ctx.textAlign = 'center';
    FREQUENCY_POINTS.forEach((point) => {
      const px = cx - w / 2 + ((point.freq - leftFreq) / freqRange) * (w - 20 * this.scale) + 10 * this.scale;
      ctx.fillText(point.label, px, cy + h / 2 - 6 * this.scale);
      ctx.beginPath();
      ctx.moveTo(px, cy + h / 2 - 14 * this.scale);
      ctx.lineTo(px, cy + h / 2 - 18 * this.scale);
      ctx.strokeStyle = '#3d2914';
      ctx.lineWidth = 1.5 * this.scale;
      ctx.stroke();
    });

    for (let f = leftFreq; f <= rightFreq; f += 2) {
      if (!FREQUENCY_POINTS.find((p) => p.freq === f)) {
        const px = cx - w / 2 + ((f - leftFreq) / freqRange) * (w - 20 * this.scale) + 10 * this.scale;
        ctx.beginPath();
        ctx.moveTo(px, cy + h / 2 - 14 * this.scale);
        ctx.lineTo(px, cy + h / 2 - 16 * this.scale);
        ctx.strokeStyle = '#6b4423';
        ctx.lineWidth = 1 * this.scale;
        ctx.stroke();
      }
    }

    ctx.save();
    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.moveTo(indicatorX, cy - h / 2 + 4 * this.scale);
    ctx.lineTo(indicatorX - 6 * this.scale, cy - h / 2 + 16 * this.scale);
    ctx.lineTo(indicatorX + 6 * this.scale, cy - h / 2 + 16 * this.scale);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#922b21';
    ctx.lineWidth = 1 * this.scale;
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = '#6b4423';
    ctx.font = `bold ${9 * this.scale}px monospace`;
    ctx.textAlign = 'left';
    ctx.fillText(`${frequency.toFixed(1)} MHz`, cx - w / 2 + 8 * this.scale, cy - h / 2 + 14 * this.scale);

    ctx.restore();
  }

  private drawKnob(angle: number): void {
    const ctx = this.ctx;
    const { x: cx, y: cy } = this.knobCenter;
    const r = this.knobRadius;

    ctx.save();

    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 10 * this.scale;
    ctx.shadowOffsetY = 4 * this.scale;

    const outerGrad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.2, cx, cy, r);
    outerGrad.addColorStop(0, '#d4a574');
    outerGrad.addColorStop(0.5, '#b8860b');
    outerGrad.addColorStop(1, '#8b6914');

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = outerGrad;
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.lineWidth = 2 * this.scale;
    ctx.strokeStyle = '#3d2914';
    ctx.stroke();

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r - 4 * this.scale, 0, Math.PI * 2);
    ctx.clip();

    const stripeCount = 24;
    ctx.strokeStyle = 'rgba(61,41,20,0.6)';
    ctx.lineWidth = 1.5 * this.scale;
    for (let i = 0; i < stripeCount; i++) {
      const a = (i / stripeCount) * Math.PI * 2;
      const innerR = r * 0.55;
      const outerR = r * 0.9;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * innerR, cy + Math.sin(a) * innerR);
      ctx.lineTo(cx + Math.cos(a) * outerR, cy + Math.sin(a) * outerR);
      ctx.stroke();
    }
    ctx.restore();

    const innerGrad = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.2, r * 0.05, cx, cy, r * 0.45);
    innerGrad.addColorStop(0, '#f5deb3');
    innerGrad.addColorStop(1, '#cd853f');

    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.45, 0, Math.PI * 2);
    ctx.fillStyle = innerGrad;
    ctx.fill();
    ctx.lineWidth = 1.5 * this.scale;
    ctx.strokeStyle = '#8b6914';
    ctx.stroke();

    const radAngle = (angle - 135) * Math.PI / 180;
    const pointerLen = r * 0.75;
    const px = cx + Math.cos(radAngle) * pointerLen;
    const py = cy + Math.sin(radAngle) * pointerLen;

    ctx.save();
    ctx.strokeStyle = '#c0392b';
    ctx.lineWidth = 4 * this.scale;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(px, py);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(px, py, 3 * this.scale, 0, Math.PI * 2);
    ctx.fillStyle = '#e74c3c';
    ctx.fill();
    ctx.restore();

    ctx.beginPath();
    ctx.arc(cx, cy, 3 * this.scale, 0, Math.PI * 2);
    ctx.fillStyle = '#3d2914';
    ctx.fill();

    ctx.restore();
  }

  private drawNotes(): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.font = `${24 * this.scale}px "Arial Unicode MS", serif`;
    ctx.textAlign = 'center';

    this.notes.forEach((note) => {
      ctx.globalAlpha = note.opacity;
      ctx.fillStyle = '#d4a017';
      ctx.shadowColor = 'rgba(212,160,23,0.5)';
      ctx.shadowBlur = 8 * this.scale;
      ctx.fillText(note.symbol, note.x, note.y);
    });
    ctx.restore();
  }

  private drawGlow(time: number): void {
    const ctx = this.ctx;
    const glowIntensity = 0.15 + 0.05 * Math.sin(time / 800);

    ctx.save();
    const glowGrad = ctx.createRadialGradient(
      this.panelCenter.x,
      this.panelCenter.y,
      0,
      this.panelCenter.x,
      this.panelCenter.y,
      100 * this.scale
    );
    glowGrad.addColorStop(0, `rgba(255,200,100,${glowIntensity})`);
    glowGrad.addColorStop(1, 'rgba(255,200,100,0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(this.panelCenter.x, this.panelCenter.y, 100 * this.scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  getAlbumY(): number {
    return this.canvasHeight - 60 * this.scale;
  }

  getAlbumHeight(): number {
    return 100 * this.scale;
  }

  getScale(): number {
    return this.scale;
  }
}
