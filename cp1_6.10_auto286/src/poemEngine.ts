import { Particle, RGBAColor } from './particle';

export interface PoemData {
  text: string;
  charColors: RGBAColor[];
  isFiveChar: boolean;
}

export interface PoemTriggerResult {
  triggered: boolean;
  particles: Particle[];
  centerX: number;
  centerY: number;
  poem: PoemData;
}

export interface ActivePoem {
  poem: PoemData;
  particles: Particle[];
  centerX: number;
  centerY: number;
  startTime: number;
  duration: number;
  phase: 'forming' | 'displaying' | 'dissolving';
}

const POEMS: PoemData[] = [
  {
    text: '大漠孤烟直',
    isFiveChar: true,
    charColors: [
      { r: 44, g: 95, b: 90, a: 0.9 },
      { r: 212, g: 168, b: 75, a: 0.9 },
      { r: 240, g: 240, b: 232, a: 0.9 },
      { r: 200, g: 215, b: 217, a: 0.9 },
      { r: 57, g: 75, b: 110, a: 0.9 }
    ]
  },
  {
    text: '长河落日圆',
    isFiveChar: true,
    charColors: [
      { r: 57, g: 75, b: 110, a: 0.9 },
      { r: 44, g: 95, b: 90, a: 0.9 },
      { r: 196, g: 74, b: 77, a: 0.9 },
      { r: 212, g: 168, b: 75, a: 0.9 },
      { r: 200, g: 215, b: 217, a: 0.9 }
    ]
  },
  {
    text: '明月松间照',
    isFiveChar: true,
    charColors: [
      { r: 200, g: 215, b: 217, a: 0.9 },
      { r: 240, g: 240, b: 232, a: 0.9 },
      { r: 107, g: 124, b: 58, a: 0.9 },
      { r: 44, g: 95, b: 90, a: 0.9 },
      { r: 212, g: 168, b: 75, a: 0.9 }
    ]
  },
  {
    text: '清泉石上流',
    isFiveChar: true,
    charColors: [
      { r: 200, g: 215, b: 217, a: 0.9 },
      { r: 240, g: 240, b: 232, a: 0.9 },
      { r: 57, g: 75, b: 110, a: 0.9 },
      { r: 44, g: 95, b: 90, a: 0.9 },
      { r: 107, g: 124, b: 58, a: 0.9 }
    ]
  },
  {
    text: '千山鸟飞绝',
    isFiveChar: true,
    charColors: [
      { r: 57, g: 75, b: 110, a: 0.9 },
      { r: 44, g: 95, b: 90, a: 0.9 },
      { r: 155, g: 122, b: 181, a: 0.9 },
      { r: 240, g: 240, b: 232, a: 0.9 },
      { r: 200, g: 215, b: 217, a: 0.9 }
    ]
  },
  {
    text: '月落乌啼霜满天',
    isFiveChar: false,
    charColors: [
      { r: 200, g: 215, b: 217, a: 0.9 },
      { r: 57, g: 75, b: 110, a: 0.9 },
      { r: 44, g: 95, b: 90, a: 0.9 },
      { r: 107, g: 124, b: 58, a: 0.9 },
      { r: 240, g: 240, b: 232, a: 0.9 },
      { r: 212, g: 168, b: 75, a: 0.9 },
      { r: 57, g: 75, b: 110, a: 0.9 }
    ]
  },
  {
    text: '江枫渔火对愁眠',
    isFiveChar: false,
    charColors: [
      { r: 44, g: 95, b: 90, a: 0.9 },
      { r: 107, g: 124, b: 58, a: 0.9 },
      { r: 212, g: 168, b: 75, a: 0.9 },
      { r: 196, g: 74, b: 77, a: 0.9 },
      { r: 57, g: 75, b: 110, a: 0.9 },
      { r: 155, g: 122, b: 181, a: 0.9 },
      { r: 240, g: 240, b: 232, a: 0.9 }
    ]
  },
  {
    text: '春风又绿江南岸',
    isFiveChar: false,
    charColors: [
      { r: 240, g: 240, b: 232, a: 0.9 },
      { r: 107, g: 124, b: 58, a: 0.9 },
      { r: 57, g: 75, b: 110, a: 0.9 },
      { r: 44, g: 95, b: 90, a: 0.9 },
      { r: 44, g: 95, b: 90, a: 0.9 },
      { r: 107, g: 124, b: 58, a: 0.9 },
      { r: 57, g: 75, b: 110, a: 0.9 }
    ]
  },
  {
    text: '明月何时照我还',
    isFiveChar: false,
    charColors: [
      { r: 200, g: 215, b: 217, a: 0.9 },
      { r: 240, g: 240, b: 232, a: 0.9 },
      { r: 57, g: 75, b: 110, a: 0.9 },
      { r: 155, g: 122, b: 181, a: 0.9 },
      { r: 212, g: 168, b: 75, a: 0.9 },
      { r: 196, g: 74, b: 77, a: 0.9 },
      { r: 44, g: 95, b: 90, a: 0.9 }
    ]
  },
  {
    text: '两个黄鹂鸣翠柳',
    isFiveChar: false,
    charColors: [
      { r: 57, g: 75, b: 110, a: 0.9 },
      { r: 200, g: 215, b: 217, a: 0.9 },
      { r: 212, g: 168, b: 75, a: 0.9 },
      { r: 212, g: 168, b: 75, a: 0.9 },
      { r: 155, g: 122, b: 181, a: 0.9 },
      { r: 44, g: 95, b: 90, a: 0.9 },
      { r: 107, g: 124, b: 58, a: 0.9 }
    ]
  }
];

const offscreenCanvas: HTMLCanvasElement | null = typeof document !== 'undefined' 
  ? document.createElement('canvas') 
  : null;
const offscreenCtx: CanvasRenderingContext2D | null = offscreenCanvas 
  ? offscreenCanvas.getContext('2d', { willReadFrequently: true }) 
  : null;

export function getCharParticlePositions(char: string, charSize: number, spacing: number): { x: number; y: number }[] {
  if (!offscreenCanvas || !offscreenCtx) return [];
  
  const canvasSize = charSize * 2;
  offscreenCanvas.width = canvasSize;
  offscreenCanvas.height = canvasSize;
  
  offscreenCtx.clearRect(0, 0, canvasSize, canvasSize);
  offscreenCtx.fillStyle = '#000';
  offscreenCtx.font = `bold ${charSize}px "KaiTi", "楷体", "STKaiti", serif`;
  offscreenCtx.textAlign = 'center';
  offscreenCtx.textBaseline = 'middle';
  offscreenCtx.fillText(char, canvasSize / 2, canvasSize / 2);
  
  const imageData = offscreenCtx.getImageData(0, 0, canvasSize, canvasSize);
  const positions: { x: number; y: number }[] = [];
  
  for (let y = 0; y < canvasSize; y += spacing) {
    for (let x = 0; x < canvasSize; x += spacing) {
      const idx = (y * canvasSize + x) * 4;
      if (imageData.data[idx + 3] > 128) {
        positions.push({
          x: x - canvasSize / 2,
          y: y - canvasSize / 2
        });
      }
    }
  }
  
  return positions;
}

export function checkPoemTrigger(
  particles: Particle[],
  canvasWidth: number,
  canvasHeight: number,
  activePoem: ActivePoem | null,
  lastTriggerTime: number
): PoemTriggerResult {
  if (activePoem) {
    return { triggered: false, particles: [], centerX: 0, centerY: 0, poem: POEMS[0] };
  }
  
  const now = Date.now();
  if (now - lastTriggerTime < 8000) {
    return { triggered: false, particles: [], centerX: 0, centerY: 0, poem: POEMS[0] };
  }
  
  const gridSize = 8;
  const cols = Math.ceil(canvasWidth / gridSize);
  const rows = Math.ceil(canvasHeight / gridSize);
  const grid: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0));
  const particleGrid: Particle[][][] = Array.from({ length: rows }, () => 
    Array.from({ length: cols }, () => [])
  );
  
  for (const p of particles) {
    if (p.isInPoem) continue;
    const col = Math.floor(p.x / gridSize);
    const row = Math.floor(p.y / gridSize);
    if (row >= 0 && row < rows && col >= 0 && col < cols) {
      grid[row][col]++;
      particleGrid[row][col].push(p);
    }
  }
  
  const windowSize = 3;
  let maxCount = 0;
  let bestCol = 0;
  let bestRow = 0;
  
  for (let r = 0; r <= rows - windowSize; r++) {
    for (let c = 0; c <= cols - windowSize; c++) {
      let count = 0;
      for (let dr = 0; dr < windowSize; dr++) {
        for (let dc = 0; dc < windowSize; dc++) {
          count += grid[r + dr][c + dc];
        }
      }
      if (count > maxCount) {
        maxCount = count;
        bestCol = c + Math.floor(windowSize / 2);
        bestRow = r + Math.floor(windowSize / 2);
      }
    }
  }
  
  if (maxCount >= 30) {
    const centerX = bestCol * gridSize + gridSize / 2;
    const centerY = bestRow * gridSize + gridSize / 2;
    
    const nearbyParticles: Particle[] = [];
    const searchRadius = 200;
    const searchRadiusSq = searchRadius * searchRadius;
    
    for (const p of particles) {
      if (p.isInPoem) continue;
      const dx = p.x - centerX;
      const dy = p.y - centerY;
      if (dx * dx + dy * dy < searchRadiusSq) {
        nearbyParticles.push(p);
      }
    }
    
    if (nearbyParticles.length >= 30) {
      const poem = POEMS[Math.floor(Math.random() * POEMS.length)];
      return {
        triggered: true,
        particles: nearbyParticles,
        centerX,
        centerY,
        poem
      };
    }
  }
  
  return { triggered: false, particles: [], centerX: 0, centerY: 0, poem: POEMS[0] };
}

export function setupPoemParticles(
  poem: PoemData,
  particles: Particle[],
  centerX: number,
  centerY: number
): ActivePoem {
  const charSize = 28;
  const spacing = 3;
  const charGap = 44;
  const totalWidth = poem.text.length * charGap;
  const startX = centerX - totalWidth / 2 + charGap / 2;
  
  let allTargets: { x: number; y: number; color: RGBAColor }[] = [];
  
  for (let i = 0; i < poem.text.length; i++) {
    const char = poem.text[i];
    const color = poem.charColors[i];
    const charX = startX + i * charGap;
    const charY = centerY;
    
    const positions = getCharParticlePositions(char, charSize, spacing);
    for (const pos of positions) {
      allTargets.push({
        x: charX + pos.x,
        y: charY + pos.y,
        color
      });
    }
  }
  
  const shuffled = [...particles].sort(() => Math.random() - 0.5);
  const usedCount = Math.min(shuffled.length, allTargets.length);
  
  for (let i = 0; i < usedCount; i++) {
    shuffled[i].setPoemTarget(allTargets[i].x, allTargets[i].y, allTargets[i].color);
  }
  
  return {
    poem,
    particles: shuffled.slice(0, usedCount),
    centerX,
    centerY,
    startTime: Date.now(),
    duration: 3000,
    phase: 'forming'
  };
}

export function updateActivePoem(activePoem: ActivePoem | null): ActivePoem | null {
  if (!activePoem) return null;
  
  const elapsed = Date.now() - activePoem.startTime;
  
  if (activePoem.phase === 'forming' && elapsed > 500) {
    activePoem.phase = 'displaying';
  }
  
  if (activePoem.phase === 'displaying' && elapsed > activePoem.duration) {
    activePoem.phase = 'dissolving';
    for (const p of activePoem.particles) {
      p.clearPoemTarget();
    }
    return null;
  }
  
  return activePoem;
}

export function renderPoemText(
  ctx: CanvasRenderingContext2D,
  activePoem: ActivePoem | null
): void {
  if (!activePoem || activePoem.phase !== 'displaying') return;
  
  const elapsed = Date.now() - activePoem.startTime;
  let glowAlpha = 0.1;
  
  if (elapsed < 700) {
    glowAlpha = (elapsed / 700) * 0.1;
  } else if (elapsed > activePoem.duration - 700) {
    glowAlpha = ((activePoem.duration - elapsed) / 700) * 0.1;
  }
  
  const gradient = ctx.createRadialGradient(
    activePoem.centerX, activePoem.centerY, 0,
    activePoem.centerX, activePoem.centerY, 250
  );
  gradient.addColorStop(0, `rgba(255, 215, 100, ${glowAlpha})`);
  gradient.addColorStop(0.5, `rgba(255, 200, 80, ${glowAlpha * 0.5})`);
  gradient.addColorStop(1, 'rgba(255, 200, 80, 0)');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(
    activePoem.centerX - 300,
    activePoem.centerY - 100,
    600,
    200
  );
}
