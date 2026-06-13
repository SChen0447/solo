export interface ParticleOffset {
  x: number;
  y: number;
}

export interface CharParticleGroup {
  char: string;
  x: number;
  y: number;
  particles: ParticleOffset[];
}

const SAMPLE_CANVAS_SIZE = 200;
const FONT_SIZE = 120;
const PARTICLES_PER_CHAR = 100;

export function textToParticles(
  text: string,
  canvasWidth: number,
  canvasHeight: number,
  startX: number,
  startY: number
): CharParticleGroup[] {
  const offscreen = document.createElement('canvas');
  offscreen.width = SAMPLE_CANVAS_SIZE;
  offscreen.height = SAMPLE_CANVAS_SIZE;
  const ctx = offscreen.getContext('2d')!;

  const groups: CharParticleGroup[] = [];
  let currentX = startX;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === ' ') {
      currentX += 30;
      continue;
    }

    ctx.clearRect(0, 0, SAMPLE_CANVAS_SIZE, SAMPLE_CANVAS_SIZE);
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${FONT_SIZE}px sans-serif`;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'center';
    ctx.fillText(char, SAMPLE_CANVAS_SIZE / 2, 10);

    const imageData = ctx.getImageData(0, 0, SAMPLE_CANVAS_SIZE, SAMPLE_CANVAS_SIZE);
    const pixels = imageData.data;

    const filledPoints: { x: number; y: number }[] = [];
    for (let y = 0; y < SAMPLE_CANVAS_SIZE; y += 2) {
      for (let x = 0; x < SAMPLE_CANVAS_SIZE; x += 2) {
        const idx = (y * SAMPLE_CANVAS_SIZE + x) * 4;
        if (pixels[idx + 3] > 128) {
          filledPoints.push({ x, y });
        }
      }
    }

    const particles: ParticleOffset[] = [];
    const count = Math.min(PARTICLES_PER_CHAR, filledPoints.length);

    if (filledPoints.length <= count) {
      for (const p of filledPoints) {
        particles.push({
          x: (p.x - SAMPLE_CANVAS_SIZE / 2) * 0.5,
          y: (p.y - FONT_SIZE / 2) * 0.5,
        });
      }
    } else {
      const step = filledPoints.length / count;
      for (let j = 0; j < count; j++) {
        const p = filledPoints[Math.floor(j * step)];
        particles.push({
          x: (p.x - SAMPLE_CANVAS_SIZE / 2) * 0.5,
          y: (p.y - FONT_SIZE / 2) * 0.5,
        });
      }
    }

    while (particles.length < PARTICLES_PER_CHAR) {
      const base = particles[Math.floor(Math.random() * particles.length)];
      particles.push({
        x: base.x + (Math.random() - 0.5) * 4,
        y: base.y + (Math.random() - 0.5) * 4,
      });
    }

    groups.push({
      char,
      x: currentX,
      y: startY,
      particles: particles.slice(0, PARTICLES_PER_CHAR),
    });

    const metrics = ctx.measureText(char);
    currentX += metrics.width * 0.5 + 10;
  }

  return groups;
}
