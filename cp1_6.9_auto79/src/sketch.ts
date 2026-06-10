import p5 from 'p5';
import { Petal, SPRING_COLORS, type PetalColor } from './petal';
import { Ripple, type RippleType } from './ripple';

const MAX_PETALS = 150;
const MAX_RIPPLES = 20;
const MIN_NOTE_INTERVAL = 80;
const AUTO_GENERATE_MIN = 60;
const AUTO_GENERATE_MAX = 120;

class Sketch {
  private p!: p5;
  private petals: Petal[] = [];
  private ripples: Ripple[] = [];
  private autoGenTimer = 0;
  private nextAutoGen = 0;
  private lastNoteTime = 0;
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;

  constructor() {
    const sketch = (p: p5) => {
      this.p = p;
      p.setup = () => this.setup();
      p.draw = () => this.draw();
      p.mousePressed = () => this.mousePressed();
      p.mouseDragged = () => this.mouseDragged();
      p.mouseReleased = () => this.mouseReleased();
      p.touchStarted = () => this.touchStarted();
      p.touchMoved = () => this.touchMoved();
      p.touchEnded = () => this.touchEnded();
      p.windowResized = () => this.windowResized();
    };

    new p5(sketch, document.getElementById('sketch-container') as HTMLElement);
  }

  private setup(): void {
    const p = this.p;
    p.createCanvas(p.windowWidth, p.windowHeight);
    p.pixelDensity(1);
    this.scheduleNextAutoGen();
    this.initAudio();
  }

  private initAudio(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = 0.3;
      this.gainNode.connect(this.audioContext.destination);
    } catch (e) {
      console.warn('Web Audio API not supported:', e);
    }
  }

  private resumeAudio(): void {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  private playNote(frequency: number): void {
    const now = performance.now();
    if (now - this.lastNoteTime < MIN_NOTE_INTERVAL) return;
    this.lastNoteTime = now;

    if (!this.audioContext || !this.gainNode) return;

    const osc = this.audioContext.createOscillator();
    const noteGain = this.audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

    noteGain.gain.setValueAtTime(0, this.audioContext.currentTime);
    noteGain.gain.linearRampToValueAtTime(0.4, this.audioContext.currentTime + 0.01);
    noteGain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.6);

    osc.connect(noteGain);
    noteGain.connect(this.gainNode);

    osc.start(this.audioContext.currentTime);
    osc.stop(this.audioContext.currentTime + 0.6);
  }

  private scheduleNextAutoGen(): void {
    this.nextAutoGen = Math.floor(this.p.random(AUTO_GENERATE_MIN, AUTO_GENERATE_MAX));
    this.autoGenTimer = 0;
  }

  private autoGeneratePetal(): void {
    const p = this.p;
    const x = p.random(p.width);
    const y = -30;
    const petal = new Petal(p, x, y);
    this.addPetal(petal);
  }

  private addPetal(petal: Petal): void {
    if (this.petals.length >= MAX_PETALS) {
      this.petals.shift();
    }
    this.petals.push(petal);
  }

  private addRipple(ripple: Ripple): void {
    if (this.ripples.length >= MAX_RIPPLES) {
      this.ripples.shift();
    }
    this.ripples.push(ripple);
    this.playNote(ripple.frequency);
  }

  private getColorAtPosition(x: number): PetalColor {
    const hue = (x / this.p.width) * 360;
    let bestColor = SPRING_COLORS[0];
    let minDist = Infinity;

    for (const color of SPRING_COLORS) {
      const colorHue = this.rgbToHue(color.r, color.g, color.b);
      let dist = Math.abs(colorHue - hue);
      if (dist > 180) dist = 360 - dist;
      dist += this.p.random(30);
      if (dist < minDist) {
        minDist = dist;
        bestColor = color;
      }
    }

    return bestColor;
  }

  private rgbToHue(r: number, g: number, b: number): number {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;

    if (max === min) {
      h = 0;
    } else if (max === r) {
      h = ((g - b) / (max - min)) * 60;
    } else if (max === g) {
      h = ((b - r) / (max - min) + 2) * 60;
    } else {
      h = ((r - g) / (max - min) + 4) * 60;
    }

    if (h < 0) h += 360;
    return h;
  }

  private spawnExplosion(x: number, y: number): void {
    const p = this.p;
    const count = Math.floor(p.random(3, 9));
    const preferredColor = this.getColorAtPosition(x);

    for (let i = 0; i < count; i++) {
      const angle = p.random(p.TWO_PI);
      const speed = p.random(1, 3);
      const usePreferred = p.random() > 0.3;
      const color = usePreferred ? preferredColor : SPRING_COLORS[Math.floor(p.random(SPRING_COLORS.length))];

      const petal = new Petal(p, x, y, {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        color,
        isExploding: true
      });
      this.addPetal(petal);
    }
  }

  private spawnDraggingPetal(x: number, y: number): void {
    const p = this.p;
    const preferredColor = this.getColorAtPosition(x);
    const usePreferred = p.random() > 0.4;
    const color = usePreferred ? preferredColor : SPRING_COLORS[Math.floor(p.random(SPRING_COLORS.length))];
    const angle = p.random(p.TWO_PI);
    const speed = p.random(0.5, 2);

    const petal = new Petal(p, x, y, {
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color,
      isExploding: true
    });
    this.addPetal(petal);
  }

  private drawBackground(): void {
    const p = this.p;
    const gradient = p.drawingContext.createLinearGradient(0, 0, 0, p.height);
    gradient.addColorStop(0, '#ffe6f0');
    gradient.addColorStop(1, '#e6f0ff');
    p.drawingContext.fillStyle = gradient;
    p.rect(0, 0, p.width, p.height);
  }

  private drawWater(): void {
    const p = this.p;
    const waterStart = p.height * 0.8;
    const waterHeight = p.height * 0.08;

    p.noStroke();
    p.fill(51, 153, 255, 77);

    p.beginShape();
    p.vertex(0, waterStart);

    for (let x = 0; x <= p.width; x += 10) {
      const waveY = waterStart + Math.sin((x / p.width) * Math.PI * 4 + (p.frameCount / 60) * ((Math.PI * 2) / 3)) * 2;
      p.vertex(x, waveY);
    }

    p.vertex(p.width, waterStart + waterHeight);
    p.vertex(0, waterStart + waterHeight);
    p.endShape(p.CLOSE);
  }

  private draw(): void {
    const p = this.p;
    this.drawBackground();
    this.drawWater();

    this.autoGenTimer++;
    if (this.autoGenTimer >= this.nextAutoGen) {
      this.autoGeneratePetal();
      this.scheduleNextAutoGen();
    }

    for (let i = this.petals.length - 1; i >= 0; i--) {
      const petal = this.petals[i];
      petal.update(p.frameCount);

      const collision = petal.checkCollision(p.height);
      if (collision) {
        const rippleType: RippleType = collision;
        const ripple = new Ripple(p, petal.x, p.height * 0.8, petal.color, rippleType);
        this.addRipple(ripple);
      }

      if (petal.isOffScreen(p.height)) {
        this.petals.splice(i, 1);
        continue;
      }

      petal.draw();
    }

    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const ripple = this.ripples[i];
      ripple.update();
      if (!ripple.alive) {
        this.ripples.splice(i, 1);
        continue;
      }
      ripple.draw();
    }
  }

  private mousePressed(): void {
    this.resumeAudio();
    this.spawnExplosion(this.p.mouseX, this.p.mouseY);
  }

  private mouseDragged(): void {
    this.spawnDraggingPetal(this.p.mouseX, this.p.mouseY);
  }

  private mouseReleased(): void {
    // no-op
  }

  private touchStarted(): void {
    this.resumeAudio();
    const touches = this.p.touches as Array<{ x: number; y: number }>;
    const touch = touches[0];
    this.spawnExplosion(touch?.x ?? this.p.mouseX, touch?.y ?? this.p.mouseY);
  }

  private touchMoved(): void {
    const touches = this.p.touches as Array<{ x: number; y: number }>;
    const touch = touches[0];
    this.spawnDraggingPetal(touch?.x ?? this.p.mouseX, touch?.y ?? this.p.mouseY);
  }

  private touchEnded(): void {
    // no-op
  }

  private windowResized(): void {
    this.p.resizeCanvas(this.p.windowWidth, this.p.windowHeight);
  }
}

new Sketch();
