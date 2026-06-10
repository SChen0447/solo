import type p5 from 'p5';

export interface FlowerColor {
  r: number;
  g: number;
  b: number;
  hex: string;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  rotationSpeed: number;
  life: number;
  maxLife: number;
  color: FlowerColor;
}

export interface Flower {
  x: number;
  y: number;
  color: FlowerColor;
  petalCount: number;
  bloomProgress: number;
  bloomDuration: number;
  startTime: number;
  particles: Particle[];
  hasEmittedParticles: boolean;
  size: number;
  mixedColor: FlowerColor | null;
  pulseRadius: number;
  pulseProgress: number;
}

const FLOWER_PALETTE: string[] = [
  '#ff6b9d',
  '#f48fb1',
  '#e066ff',
  '#c44dff',
  '#ba68c8',
  '#ff80ab',
  '#ce93d8',
  '#f06292',
];

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 255, g: 107, b: 157 };
}

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function createFlowerColor(): FlowerColor {
  const hex = FLOWER_PALETTE[Math.floor(Math.random() * FLOWER_PALETTE.length)];
  const rgb = hexToRgb(hex);
  return { ...rgb, hex };
}

export function mixColors(c1: FlowerColor, c2: FlowerColor): FlowerColor {
  const r = Math.round((c1.r + c2.r) / 2);
  const g = Math.round((c1.g + c2.g) / 2);
  const b = Math.round((c1.b + c2.b) / 2);
  const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  return { r, g, b, hex };
}

export function createFlower(x: number, y: number): Flower {
  return {
    x,
    y,
    color: createFlowerColor(),
    petalCount: 5 + Math.floor(Math.random() * 4),
    bloomProgress: 0,
    bloomDuration: 1500,
    startTime: performance.now(),
    particles: [],
    hasEmittedParticles: false,
    size: 14 + Math.random() * 8,
    mixedColor: null,
    pulseRadius: 0,
    pulseProgress: -1,
  };
}

function createParticles(p: p5, flower: Flower): Particle[] {
  const count = 10 + Math.floor(Math.random() * 6);
  const particles: Particle[] = [];
  const displayColor = flower.mixedColor || flower.color;

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.5 + Math.random() * 1.5;
    particles.push({
      x: flower.x,
      y: flower.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed + 0.3,
      size: 2 + Math.random() * 2,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.1,
      life: 0,
      maxLife: 1500,
      color: displayColor,
    });
  }
  return particles;
}

export function triggerPulse(flower: Flower): void {
  flower.pulseProgress = 0;
  flower.pulseRadius = 0;
}

export function updateFlower(p: p5, flower: Flower, speedMultiplier: number = 1): void {
  const elapsed = performance.now() - flower.startTime;
  flower.bloomProgress = Math.min(1, (elapsed / flower.bloomDuration) * speedMultiplier);

  if (flower.bloomProgress >= 0.5 && !flower.hasEmittedParticles) {
    flower.particles = createParticles(p, flower);
    flower.hasEmittedParticles = true;
  }

  for (let i = flower.particles.length - 1; i >= 0; i--) {
    const particle = flower.particles[i];
    particle.life += p.deltaTime;
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vy += 0.02;
    particle.rotation += particle.rotationSpeed;
    if (particle.life >= particle.maxLife) {
      flower.particles.splice(i, 1);
    }
  }

  if (flower.pulseProgress >= 0) {
    flower.pulseProgress += p.deltaTime / 300;
    flower.pulseRadius = 30 * Math.sin(flower.pulseProgress * Math.PI);
    if (flower.pulseProgress >= 1) {
      flower.pulseProgress = -1;
    }
  }
}

export function drawFlower(p: p5, flower: Flower): void {
  const displayColor = flower.mixedColor || flower.color;
  const scale = easeOut(flower.bloomProgress);

  if (flower.pulseProgress >= 0) {
    p.push();
    p.noStroke();
    p.fill(displayColor.r, displayColor.g, displayColor.b, 60 * (1 - flower.pulseProgress));
    p.ellipse(flower.x, flower.y, flower.pulseRadius * 2, flower.pulseRadius * 2);
    p.pop();
  }

  if (flower.bloomProgress < 0.3) {
    const budScale = flower.bloomProgress / 0.3;
    p.push();
    p.noStroke();
    p.fill(displayColor.r, displayColor.g, displayColor.b, 200);
    p.ellipse(flower.x, flower.y, 6 * budScale, 8 * budScale);
    p.fill(displayColor.r - 30, displayColor.g - 30, displayColor.b - 30, 180);
    p.ellipse(flower.x, flower.y - 4 * budScale, 5 * budScale, 5 * budScale);
    p.pop();
    return;
  }

  const petalProgress = (flower.bloomProgress - 0.3) / 0.7;
  const petalScale = easeOut(petalProgress) * scale;

  p.push();
  p.translate(flower.x, flower.y);

  for (let i = 0; i < flower.petalCount; i++) {
    const angle = (i / flower.petalCount) * Math.PI * 2;
    p.push();
    p.rotate(angle);

    const petalWidth = flower.size * 0.6 * petalScale;
    const petalHeight = flower.size * petalScale;

    p.noStroke();
    p.fill(
      displayColor.r,
      displayColor.g,
      displayColor.b,
      220
    );

    p.beginShape();
    p.vertex(0, 0);
    p.quadraticVertex(-petalWidth * 0.6, -petalHeight * 0.5, 0, -petalHeight);
    p.quadraticVertex(petalWidth * 0.6, -petalHeight * 0.5, 0, 0);
    p.endShape(p.CLOSE);

    p.fill(
      displayColor.r + 30,
      displayColor.g + 30,
      displayColor.b + 30,
      150
    );
    p.beginShape();
    p.vertex(0, -petalHeight * 0.2);
    p.quadraticVertex(-petalWidth * 0.3, -petalHeight * 0.6, 0, -petalHeight * 0.9);
    p.quadraticVertex(petalWidth * 0.3, -petalHeight * 0.6, 0, -petalHeight * 0.2);
    p.endShape(p.CLOSE);

    p.pop();
  }

  const centerSize = flower.size * 0.35 * petalScale;
  p.noStroke();
  p.fill(255, 220, 150, 230);
  p.ellipse(0, 0, centerSize * 2, centerSize * 2);
  p.fill(255, 200, 120, 200);
  p.ellipse(0, 0, centerSize * 1.3, centerSize * 1.3);

  p.pop();

  for (const particle of flower.particles) {
    const alpha = 200 * (1 - particle.life / particle.maxLife);
    p.push();
    p.translate(particle.x, particle.y);
    p.rotate(particle.rotation);
    p.noStroke();
    p.fill(particle.color.r, particle.color.g, particle.color.b, alpha);
    p.ellipse(0, 0, particle.size, particle.size * 1.3);
    p.pop();
  }
}
