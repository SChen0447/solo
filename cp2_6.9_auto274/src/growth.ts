export interface SporeSettings {
  growthSpeed: number;
  colorLifespan: number;
  sporeDensity: number;
}

export interface Spore {
  x: number;
  y: number;
  radius: number;
  targetRadius: number;
  age: number;
  maxAge: number;
  color: { r: number; g: number; b: number };
  velocityX: number;
  velocityY: number;
  neighbors: Spore[];
  absorbed: boolean;
  absorbedBy: string | null;
  baseColor: { r: number; g: number; b: number };
  id: string;
}

const spores: Spore[] = [];

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 74, g: 107, b: 58 };
}

function lerpColor(
  c1: { r: number; g: number; b: number },
  c2: { r: number; g: number; b: number },
  t: number
): { r: number; g: number; b: number } {
  return {
    r: Math.round(c1.r + (c2.r - c1.r) * t),
    g: Math.round(c1.g + (c2.g - c1.g) * t),
    b: Math.round(c1.b + (c2.b - c1.b) * t),
  };
}

function getSporeColor(
  age: number,
  maxAge: number,
  baseColor: { r: number; g: number; b: number }
): { r: number; g: number; b: number } {
  const darkGreen = baseColor;
  const brightOrange = hexToRgb('#D46A35');
  const witheredYellow = hexToRgb('#C4A65A');

  const halfLife = maxAge * 0.5;

  if (age < halfLife) {
    const t = age / halfLife;
    return lerpColor(darkGreen, brightOrange, t);
  } else {
    const t = (age - halfLife) / (maxAge - halfLife);
    return lerpColor(brightOrange, witheredYellow, t);
  }
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export function addSpores(
  x: number,
  y: number,
  count: number,
  settings: SporeSettings,
  minRadius: number = 8,
  maxRadius: number = 16
): void {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * 5;
    const radius = minRadius + Math.random() * (maxRadius - minRadius);
    const baseColor = hexToRgb('#4A6B3A');

    const spore: Spore = {
      x: x + Math.cos(angle) * distance,
      y: y + Math.sin(angle) * distance,
      radius: radius * 0.3,
      targetRadius: radius,
      age: 0,
      maxAge: settings.colorLifespan,
      color: { ...baseColor },
      velocityX: (Math.random() - 0.5) * 0.5,
      velocityY: (Math.random() - 0.5) * 0.5,
      neighbors: [],
      absorbed: false,
      absorbedBy: null,
      baseColor: { ...baseColor },
      id: generateId(),
    };
    spores.push(spore);
  }
}

export function addSporesAlongPath(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  settings: SporeSettings,
  minRadius: number = 8,
  maxRadius: number = 16
): void {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const sporesPerPixel = settings.sporeDensity / 100;
  const totalSpores = Math.max(1, Math.floor(distance * sporesPerPixel));

  for (let i = 0; i < totalSpores; i++) {
    const t = i / totalSpores;
    const x = fromX + dx * t + (Math.random() - 0.5) * 4;
    const y = fromY + dy * t + (Math.random() - 0.5) * 4;
    addSpores(x, y, 1, settings, minRadius, maxRadius);
  }
}

export function updateSpores(
  settings: SporeSettings,
  timeMultiplier: number = 1,
  canvasWidth: number,
  canvasHeight: number
): void {
  for (let i = spores.length - 1; i >= 0; i--) {
    const spore = spores[i];

    if (spore.absorbed) {
      continue;
    }

    spore.age += (1 / 60) * timeMultiplier;

    if (spore.radius < spore.targetRadius) {
      spore.radius = Math.min(
        spore.radius + settings.growthSpeed * timeMultiplier * 0.5,
        spore.targetRadius
      );
    }

    spore.x += spore.velocityX * settings.growthSpeed * timeMultiplier;
    spore.y += spore.velocityY * settings.growthSpeed * timeMultiplier;

    spore.velocityX *= 0.98;
    spore.velocityY *= 0.98;

    if (Math.random() < 0.02 * timeMultiplier) {
      spore.velocityX += (Math.random() - 0.5) * 0.3;
      spore.velocityY += (Math.random() - 0.5) * 0.3;
    }

    spore.x = Math.max(0, Math.min(canvasWidth, spore.x));
    spore.y = Math.max(0, Math.min(canvasHeight, spore.y));

    spore.color = getSporeColor(spore.age, spore.maxAge, spore.baseColor);

    if (spore.age >= spore.maxAge) {
      spores.splice(i, 1);
    }
  }

  updateNeighbors();
}

function updateNeighbors(): void {
  const connectionDistance = 40;
  for (let i = 0; i < spores.length; i++) {
    spores[i].neighbors = [];
    for (let j = 0; j < spores.length; j++) {
      if (i === j) continue;
      const dx = spores[i].x - spores[j].x;
      const dy = spores[i].y - spores[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < connectionDistance) {
        spores[i].neighbors.push(spores[j]);
      }
    }
  }
}

export function renderSpores(ctx: CanvasRenderingContext2D): void {
  for (const spore of spores) {
    if (spore.absorbed) continue;

    for (const neighbor of spore.neighbors) {
      if (spore.id < neighbor.id) {
        const alpha = 1 - spore.age / spore.maxAge;
        ctx.beginPath();
        ctx.moveTo(spore.x, spore.y);
        ctx.lineTo(neighbor.x, neighbor.y);
        ctx.strokeStyle = `rgba(${spore.color.r}, ${spore.color.g}, ${spore.color.b}, ${alpha * 0.4})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }

  for (const spore of spores) {
    if (spore.absorbed) continue;

    const lifeRatio = 1 - spore.age / spore.maxAge;
    const fadeAlpha = spore.age > spore.maxAge * 0.8 ? (1 - (spore.age - spore.maxAge * 0.8) / (spore.maxAge * 0.2)) : 1;

    const haloColor = hexToRgb('#6B8F5C');
    const gradient = ctx.createRadialGradient(
      spore.x,
      spore.y,
      0,
      spore.x,
      spore.y,
      spore.radius * 2
    );
    gradient.addColorStop(0, `rgba(${spore.color.r}, ${spore.color.g}, ${spore.color.b}, ${0.8 * fadeAlpha})`);
    gradient.addColorStop(0.5, `rgba(${haloColor.r}, ${haloColor.g}, ${haloColor.b}, ${0.3 * fadeAlpha * lifeRatio})`);
    gradient.addColorStop(1, `rgba(${haloColor.r}, ${haloColor.g}, ${haloColor.b}, 0)`);

    ctx.beginPath();
    ctx.arc(spore.x, spore.y, spore.radius * 2, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(spore.x, spore.y, spore.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${spore.color.r}, ${spore.color.g}, ${spore.color.b}, ${fadeAlpha})`;
    ctx.fill();
  }
}

export function getSpores(): Spore[] {
  return spores;
}

export function getSporesInRadius(
  x: number,
  y: number,
  radius: number
): Spore[] {
  const result: Spore[] = [];
  for (const spore of spores) {
    const dx = spore.x - x;
    const dy = spore.y - y;
    if (dx * dx + dy * dy < radius * radius) {
      result.push(spore);
    }
  }
  return result;
}

export function absorbSpores(
  sporeIds: string[],
  absorberId: string,
  newBaseColor: { r: number; g: number; b: number }
): void {
  for (const spore of spores) {
    if (sporeIds.includes(spore.id)) {
      spore.absorbed = true;
      spore.absorbedBy = absorberId;
      spore.baseColor = { ...newBaseColor };
      spore.color = { ...newBaseColor };
    }
  }
}
