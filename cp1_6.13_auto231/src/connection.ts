import { SpiritChar } from './particle';

interface LightConnection {
  charA: string;
  charB: string;
  alpha: number;
  targetAlpha: number;
  pulsePhase: number;
  pulseSpeed: number;
  lineWidth: number;
}

export class ConnectionManager {
  connections: LightConnection[];
  threshold: number;
  minCharCount: number;

  constructor() {
    this.connections = [];
    this.threshold = 80;
    this.minCharCount = 8;
  }

  update(chars: SpiritChar[], delta: number, _time: number): void {
    const activeChars = chars.filter(c => !c.isDispersing);

    if (activeChars.length < this.minCharCount) {
      for (const conn of this.connections) {
        conn.targetAlpha = 0;
      }
      this.connections = this.connections.filter(c => c.alpha > 0.01);
      for (const conn of this.connections) {
        conn.alpha += (conn.targetAlpha - conn.alpha) * delta * 3;
      }
      return;
    }

    const existingPairs = new Set<string>();
    for (const conn of this.connections) {
      existingPairs.add(`${conn.charA}-${conn.charB}`);
      existingPairs.add(`${conn.charB}-${conn.charA}`);
    }

    for (let i = 0; i < activeChars.length; i++) {
      for (let j = i + 1; j < activeChars.length; j++) {
        const charA = activeChars[i];
        const charB = activeChars[j];
        const dx = charA.x - charB.x;
        const dy = charA.y - charB.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const pairKey = `${charA.id}-${charB.id}`;

        if (dist < this.threshold && !existingPairs.has(pairKey)) {
          this.connections.push({
            charA: charA.id,
            charB: charB.id,
            alpha: 0,
            targetAlpha: 0.3 + Math.random() * 0.3,
            pulsePhase: Math.random() * Math.PI * 2,
            pulseSpeed: Math.PI * 2 / 2,
            lineWidth: 1 + Math.random()
          });
          existingPairs.add(pairKey);
          existingPairs.add(`${charB.id}-${charA.id}`);
        }
      }
    }

    const charMap = new Map<string, SpiritChar>();
    for (const c of activeChars) {
      charMap.set(c.id, c);
    }

    this.connections = this.connections.filter(conn => {
      const a = charMap.get(conn.charA);
      const b = charMap.get(conn.charB);
      if (!a || !b) {
        conn.targetAlpha = 0;
        return conn.alpha > 0.01;
      }

      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist >= this.threshold * 1.2) {
        conn.targetAlpha = 0;
      }

      return true;
    });

    for (const conn of this.connections) {
      conn.alpha += (conn.targetAlpha - conn.alpha) * delta * 2;
      conn.pulsePhase += conn.pulseSpeed * delta;
    }

    this.connections = this.connections.filter(c => c.alpha > 0.01 || c.targetAlpha > 0.01);
  }

  draw(ctx: CanvasRenderingContext2D, chars: SpiritChar[]): void {
    const charMap = new Map<string, SpiritChar>();
    for (const c of chars) {
      charMap.set(c.id, c);
    }

    for (const conn of this.connections) {
      if (conn.alpha <= 0.01) continue;

      const charA = charMap.get(conn.charA);
      const charB = charMap.get(conn.charB);
      if (!charA || !charB) continue;

      const pulseFactor = 0.7 + 0.3 * Math.sin(conn.pulsePhase);
      const alpha = conn.alpha * pulseFactor;

      const gradient = ctx.createLinearGradient(
        charA.x, charA.y,
        charB.x, charB.y
      );
      gradient.addColorStop(0, `rgba(212, 163, 115, ${alpha})`);
      gradient.addColorStop(0.5, `rgba(230, 100, 150, ${alpha * 0.8})`);
      gradient.addColorStop(1, `rgba(247, 37, 133, ${alpha})`);

      ctx.beginPath();
      ctx.moveTo(charA.x, charA.y);
      ctx.lineTo(charB.x, charB.y);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = conn.lineWidth * pulseFactor;
      ctx.lineCap = 'round';
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(charA.x, charA.y);
      ctx.lineTo(charB.x, charB.y);
      ctx.strokeStyle = `rgba(255, 220, 200, ${alpha * 0.3})`;
      ctx.lineWidth = conn.lineWidth * 2 * pulseFactor;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  }

  clear(): void {
    this.connections = [];
  }
}
