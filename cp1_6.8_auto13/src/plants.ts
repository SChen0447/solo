import {
  Genotype,
  Phenotype,
  BasePlantDef,
  calculatePhenotype,
  genotypeToString,
  EnvironmentChallenge
} from './genes';

export interface PlantInstance {
  id: string;
  name: string;
  emoji: string;
  genotype: Genotype;
  phenotype: Phenotype;
  isBase: boolean;
  survived: boolean | null;
  animProgress: number;
  animDelay: number;
}

export interface PlantCard {
  x: number;
  y: number;
  width: number;
  height: number;
  plant: PlantInstance;
}

export interface UIState {
  cards: PlantCard[];
  selectedCards: string[];
  hoveredCardId: string | null;
  crossButtonRect: { x: number; y: number; width: number; height: number } | null;
  crossButtonHovered: boolean;
  nextRoundButtonRect: { x: number; y: number; width: number; height: number } | null;
  nextRoundButtonHovered: boolean;
  crossProgress: number;
  isCrossAnimating: boolean;
  crossAnimProgress: number;
  dnaParticles: DnaParticle[];
  starParticles: StarParticle[];
  popupText: string | null;
  popupTimer: number;
}

interface DnaParticle {
  angle: number;
  radius: number;
  yOffset: number;
  speed: number;
  size: number;
  color: string;
  strand: number;
}

interface StarParticle {
  x: number;
  y: number;
  size: number;
  brightness: number;
  twinkleSpeed: number;
  twinkleOffset: number;
}

const CARD_WIDTH = 180;
const CARD_HEIGHT = 200;
const CARD_GAP = 20;
const GRID_COLS = 3;
const GRID_COLS_MOBILE = 2;
const STATUS_BAR_HEIGHT = 56;
const CROSS_BUTTON_HEIGHT = 50;
const BOTTOM_PADDING = 30;
const GARDEN_TOP_OFFSET = 80;

export function createPlantFromDef(def: BasePlantDef, index: number): PlantInstance {
  return {
    id: `base-${def.id}-${index}`,
    name: def.name,
    emoji: def.emoji,
    genotype: JSON.parse(JSON.stringify(def.genotype)),
    phenotype: calculatePhenotype(def.genotype),
    isBase: true,
    survived: null,
    animProgress: 0,
    animDelay: index * 0.08
  };
}

export function createOffspringPlant(
  genotype: Genotype,
  parent1Name: string,
  parent2Name: string,
  index: number
): PlantInstance {
  const phenotype = calculatePhenotype(genotype);
  return {
    id: `offspring-${Date.now()}-${index}`,
    name: `${parent1Name}×${parent2Name}`,
    emoji: '🌱',
    genotype,
    phenotype,
    isBase: false,
    survived: null,
    animProgress: 0,
    animDelay: 0
  };
}

export function createUIState(): UIState {
  return {
    cards: [],
    selectedCards: [],
    hoveredCardId: null,
    crossButtonRect: null,
    crossButtonHovered: false,
    nextRoundButtonRect: null,
    nextRoundButtonHovered: false,
    crossProgress: 0,
    isCrossAnimating: false,
    crossAnimProgress: 0,
    dnaParticles: [],
    starParticles: [],
    popupText: null,
    popupTimer: 0
  };
}

export function initStarParticles(count: number, width: number, height: number): StarParticle[] {
  const particles: StarParticle[] = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2 + 1,
      brightness: Math.random(),
      twinkleSpeed: Math.random() * 2 + 1,
      twinkleOffset: Math.random() * Math.PI * 2
    });
  }
  return particles;
}

export function initDnaParticles(): DnaParticle[] {
  const particles: DnaParticle[] = [];
  const colors = ['#4a7c59', '#6b9b7a', '#8bc34a', '#cddc39', '#ffeb3b'];

  for (let i = 0; i < 40; i++) {
    particles.push({
      angle: (i / 40) * Math.PI * 8,
      radius: 40,
      yOffset: -150 + (i / 40) * 300,
      speed: 0.02 + Math.random() * 0.01,
      size: Math.random() * 4 + 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      strand: i % 2
    });
  }
  return particles;
}

export function updateCardPositions(
  state: UIState,
  plants: PlantInstance[],
  canvasWidth: number,
  canvasHeight: number,
  isMobile: boolean
): void {
  const cols = isMobile ? GRID_COLS_MOBILE : GRID_COLS;
  const cardWidth = isMobile ? CARD_WIDTH * 0.85 : CARD_WIDTH;
  const cardHeight = isMobile ? CARD_HEIGHT * 0.85 : CARD_HEIGHT;
  const gap = isMobile ? CARD_GAP * 0.7 : CARD_GAP;

  const totalWidth = cols * cardWidth + (cols - 1) * gap;
  const startX = (canvasWidth - totalWidth) / 2;
  const startY = STATUS_BAR_HEIGHT + GARDEN_TOP_OFFSET;

  state.cards = plants.map((plant, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    return {
      x: startX + col * (cardWidth + gap),
      y: startY + row * (cardHeight + gap),
      width: cardWidth,
      height: cardHeight,
      plant
    };
  });

  const buttonY = startY + Math.ceil(plants.length / cols) * (cardHeight + gap) + 30;
  const totalButtonWidth = 220 + 120 + 20;
  const buttonStartX = canvasWidth / 2 - totalButtonWidth / 2;

  state.crossButtonRect = {
    x: buttonStartX,
    y: buttonY,
    width: 220,
    height: CROSS_BUTTON_HEIGHT
  };

  state.nextRoundButtonRect = {
    x: buttonStartX + 220 + 20,
    y: buttonY,
    width: 120,
    height: CROSS_BUTTON_HEIGHT
  };
}

export function handleMouseMove(
  state: UIState,
  mouseX: number,
  mouseY: number
): void {
  state.hoveredCardId = null;

  for (const card of state.cards) {
    if (
      mouseX >= card.x &&
      mouseX <= card.x + card.width &&
      mouseY >= card.y &&
      mouseY <= card.y + card.height
    ) {
      state.hoveredCardId = card.plant.id;
      break;
    }
  }

  if (state.crossButtonRect) {
    const btn = state.crossButtonRect;
    state.crossButtonHovered =
      mouseX >= btn.x &&
      mouseX <= btn.x + btn.width &&
      mouseY >= btn.y &&
      mouseY <= btn.y + btn.height;
  }

  if (state.nextRoundButtonRect) {
    const btn = state.nextRoundButtonRect;
    state.nextRoundButtonHovered =
      mouseX >= btn.x &&
      mouseX <= btn.x + btn.width &&
      mouseY >= btn.y &&
      mouseY <= btn.y + btn.height;
  }
}

export function handleClick(
  state: UIState,
  mouseX: number,
  mouseY: number
): 'cross' | 'nextRound' | 'select' | null {
  if (state.crossButtonRect) {
    const btn = state.crossButtonRect;
    if (
      mouseX >= btn.x &&
      mouseX <= btn.x + btn.width &&
      mouseY >= btn.y &&
      mouseY <= btn.y + btn.height
    ) {
      if (state.selectedCards.length === 2 && !state.isCrossAnimating) {
        return 'cross';
      }
    }
  }

  if (state.nextRoundButtonRect) {
    const btn = state.nextRoundButtonRect;
    if (
      mouseX >= btn.x &&
      mouseX <= btn.x + btn.width &&
      mouseY >= btn.y &&
      mouseY <= btn.y + btn.height
    ) {
      if (!state.isCrossAnimating) {
        return 'nextRound';
      }
    }
  }

  for (const card of state.cards) {
    if (
      mouseX >= card.x &&
      mouseX <= card.x + card.width &&
      mouseY >= card.y &&
      mouseY <= card.y + card.height
    ) {
      const plantId = card.plant.id;
      const idx = state.selectedCards.indexOf(plantId);

      if (idx >= 0) {
        state.selectedCards.splice(idx, 1);
      } else if (state.selectedCards.length < 2 && !state.isCrossAnimating) {
        state.selectedCards.push(plantId);
      }
      return 'select';
    }
  }

  return null;
}

export function getSelectedPlants(state: UIState): PlantInstance[] {
  return state.selectedCards
    .map(id => state.cards.find(c => c.plant.id === id)?.plant)
    .filter((p): p is PlantInstance => p !== undefined);
}

export function updateUI(
  state: UIState,
  deltaTime: number,
  plants: PlantInstance[]
): void {
  for (const plant of plants) {
    if (plant.animProgress < 1) {
      plant.animProgress = Math.min(1, plant.animProgress + deltaTime * 2.5);
    }
  }

  if (state.isCrossAnimating) {
    state.crossAnimProgress = Math.min(1, state.crossAnimProgress + deltaTime / 3);

    for (const p of state.dnaParticles) {
      p.angle += p.speed;
    }
  }

  const time = performance.now() / 1000;
  for (const star of state.starParticles) {
    star.brightness = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(time * star.twinkleSpeed + star.twinkleOffset));
  }

  if (state.popupTimer > 0) {
    state.popupTimer -= deltaTime;
    if (state.popupTimer <= 0) {
      state.popupText = null;
    }
  }
}

export function renderGarden(
  ctx: CanvasRenderingContext2D,
  state: UIState,
  width: number,
  height: number,
  environment: EnvironmentChallenge,
  isMobile: boolean
): void {
  ctx.clearRect(0, 0, width, height);

  drawBackground(ctx, width, height, state, environment);

  if (state.isCrossAnimating) {
    drawDnaAnimation(ctx, state, width / 2, height / 2 - 50);
    drawCrossProgress(ctx, state, width / 2, height / 2 + 120);
  }

  for (const card of state.cards) {
    drawPlantCard(ctx, card, state, isMobile);
  }

  if (state.crossButtonRect && !state.isCrossAnimating) {
    drawCrossButton(ctx, state, state.crossButtonRect);
  }

  if (state.nextRoundButtonRect && !state.isCrossAnimating) {
    drawNextRoundButton(ctx, state, state.nextRoundButtonRect);
  }

  if (state.popupText) {
    drawPopup(ctx, state.popupText, width / 2, STATUS_BAR_HEIGHT + 40);
  }

  if (state.hoveredCardId) {
    const card = state.cards.find(c => c.plant.id === state.hoveredCardId);
    if (card) {
      drawGeneTooltip(ctx, card);
    }
  }
}

function drawBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: UIState,
  environment: EnvironmentChallenge
): void {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);

  switch (environment.type) {
    case 'drought':
      gradient.addColorStop(0, '#fff5e6');
      gradient.addColorStop(1, '#ffd9a6');
      break;
    case 'cold':
      gradient.addColorStop(0, '#e6f3ff');
      gradient.addColorStop(1, '#b3d9ff');
      break;
    case 'pest':
      gradient.addColorStop(0, '#f0ffe6');
      gradient.addColorStop(1, '#d9ffb3');
      break;
    default:
      gradient.addColorStop(0, '#f5f0e1');
      gradient.addColorStop(1, '#e8dcc4');
  }

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.globalAlpha = 0.5;
  for (const star of state.starParticles) {
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness * 0.3})`;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawPlantCard(
  ctx: CanvasRenderingContext2D,
  card: PlantCard,
  state: UIState,
  isMobile: boolean
): void {
  const { x, y, width, height, plant } = card;
  const isSelected = state.selectedCards.includes(plant.id);
  const isHovered = state.hoveredCardId === plant.id;

  const scale = easeOutBounce(plant.animProgress);
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const drawWidth = width * scale;
  const drawHeight = height * scale;
  const drawX = centerX - drawWidth / 2;
  const drawY = centerY - drawHeight / 2;

  if (scale < 0.01) return;

  const radius = isMobile ? 12 : 16;

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
  ctx.shadowBlur = isHovered ? 18 : 10;
  ctx.shadowOffsetY = isHovered ? 5 : 3;

  const bgGradient = ctx.createLinearGradient(drawX, drawY, drawX, drawY + drawHeight);
  bgGradient.addColorStop(0, '#ffffff');
  bgGradient.addColorStop(1, '#f8f5e6');
  ctx.fillStyle = bgGradient;
  ctx.beginPath();
  roundRect(ctx, drawX, drawY, drawWidth, drawHeight, radius);
  ctx.fill();

  ctx.shadowColor = 'transparent';

  if (isSelected) {
    ctx.strokeStyle = '#ff9500';
    ctx.lineWidth = 3;
    ctx.beginPath();
    roundRect(ctx, drawX + 2, drawY + 2, drawWidth - 4, drawHeight - 4, radius - 2);
    ctx.stroke();
  }

  const iconSize = isMobile ? 28 : 32;
  const iconX = drawX + drawWidth / 2;
  const iconY = drawY + 32 * (drawHeight / height);

  drawPlantIcon(ctx, plant, iconX, iconY, iconSize);

  const radarSize = isMobile ? 45 : 60;
  const radarX = drawX + drawWidth / 2;
  const radarY = drawY + 80 * (drawHeight / height);
  drawRadarChart(ctx, plant.phenotype, radarX, radarY, radarSize);

  const fontSize = isMobile ? 11 : 13;
  ctx.font = `600 ${fontSize}px 'Segoe UI', 'Microsoft YaHei', sans-serif`;
  ctx.fillStyle = '#5d4e37';
  ctx.textAlign = 'center';
  ctx.fillText(plant.name, drawX + drawWidth / 2, drawY + 128 * (drawHeight / height));

  if (plant.survived !== null) {
    ctx.font = `bold ${fontSize}px 'Segoe UI', 'Microsoft YaHei', sans-serif`;
    ctx.fillStyle = plant.survived ? '#4a7c59' : '#c62828';
    const statusText = plant.survived ? '✓ 存活' : '✗ 枯萎';
    ctx.fillText(statusText, drawX + drawWidth / 2, drawY + 150 * (drawHeight / height));
  }

  const progressBarY = drawY + drawHeight - 16;
  const progressBarWidth = drawWidth - 24;
  const progress = state.selectedCards.indexOf(plant.id) >= 0 ? 1 : 0;

  ctx.fillStyle = '#e8e0cc';
  ctx.beginPath();
  roundRect(ctx, drawX + 12, progressBarY, progressBarWidth, 6, 3);
  ctx.fill();

  if (progress > 0) {
    const fillGradient = ctx.createLinearGradient(
      drawX + 12,
      progressBarY,
      drawX + 12,
      progressBarY + 6
    );
    fillGradient.addColorStop(0, '#7cb342');
    fillGradient.addColorStop(1, '#558b2f');
    ctx.fillStyle = fillGradient;
    ctx.beginPath();
    roundRect(ctx, drawX + 12, progressBarY, progressBarWidth * progress, 6, 3);
    ctx.fill();
  }

  ctx.restore();
}

function drawPlantIcon(
  ctx: CanvasRenderingContext2D,
  plant: PlantInstance,
  x: number,
  y: number,
  size: number
): void {
  ctx.save();
  ctx.font = `${size}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(plant.emoji, x, y);
  ctx.restore();
}

function drawRadarChart(
  ctx: CanvasRenderingContext2D,
  phenotype: Phenotype,
  centerX: number,
  centerY: number,
  size: number
): void {
  const radius = size / 2;
  const dimensions = [
    { value: phenotype.droughtResistance, color: '#e74c3c', angle: -Math.PI / 2 },
    { value: phenotype.coldResistance, color: '#3498db', angle: 0 },
    { value: phenotype.fruitYield, color: '#f39c12', angle: Math.PI / 2 },
    { value: 0.8, color: '#9b59b6', angle: Math.PI }
  ];

  ctx.save();
  ctx.globalAlpha = 0.1;
  for (let i = 1; i <= 3; i++) {
    ctx.beginPath();
    ctx.arc(centerX, centerY, (radius * i) / 3, 0, Math.PI * 2);
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  ctx.beginPath();
  dimensions.forEach((dim, i) => {
    const r = radius * dim.value;
    const px = centerX + Math.cos(dim.angle) * r;
    const py = centerY + Math.sin(dim.angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.closePath();

  const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
  gradient.addColorStop(0, 'rgba(74, 124, 89, 0.4)');
  gradient.addColorStop(1, 'rgba(74, 124, 89, 0.1)');
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.strokeStyle = '#4a7c59';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  dimensions.forEach(dim => {
    const px = centerX + Math.cos(dim.angle) * radius;
    const py = centerY + Math.sin(dim.angle) * radius;
    ctx.beginPath();
    ctx.arc(px, py, 3, 0, Math.PI * 2);
    ctx.fillStyle = dim.color;
    ctx.fill();
  });

  ctx.restore();
}

function drawCrossButton(
  ctx: CanvasRenderingContext2D,
  state: UIState,
  rect: { x: number; y: number; width: number; height: number }
): void {
  const { x, y, width, height } = rect;
  const isHovered = state.crossButtonHovered;
  const isEnabled = state.selectedCards.length === 2;

  ctx.save();

  const scale = isHovered && isEnabled ? 1.1 : 1;
  const cx = x + width / 2;
  const cy = y + height / 2;
  const drawWidth = width * scale;
  const drawHeight = height * scale;
  const drawX = cx - drawWidth / 2;
  const drawY = cy - drawHeight / 2;

  ctx.shadowColor = isEnabled ? 'rgba(255, 149, 0, 0.4)' : 'rgba(0, 0, 0, 0.2)';
  ctx.shadowBlur = isHovered && isEnabled ? 20 : 10;
  ctx.shadowOffsetY = 3;

  const gradient = ctx.createLinearGradient(drawX, drawY, drawX, drawY + drawHeight);
  if (isEnabled) {
    gradient.addColorStop(0, '#ffb347');
    gradient.addColorStop(0.5, '#ff9500');
    gradient.addColorStop(1, '#ff7b00');
  } else {
    gradient.addColorStop(0, '#cccccc');
    gradient.addColorStop(1, '#999999');
  }

  ctx.beginPath();
  roundRect(ctx, drawX, drawY, drawWidth, drawHeight, drawHeight / 2);
  ctx.fillStyle = gradient;
  ctx.fill();

  if (isHovered && isEnabled) {
    ctx.save();
    ctx.beginPath();
    roundRect(ctx, drawX, drawY, drawWidth, drawHeight, drawHeight / 2);
    ctx.clip();

    const time = performance.now() / 500;
    const shineX = drawX + ((Math.sin(time) + 1) / 2) * drawWidth;
    const shineGradient = ctx.createLinearGradient(
      shineX - 30,
      drawY,
      shineX + 30,
      drawY
    );
    shineGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
    shineGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.4)');
    shineGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = shineGradient;
    ctx.fillRect(drawX, drawY, drawWidth, drawHeight);
    ctx.restore();
  }

  ctx.shadowColor = 'transparent';
  ctx.font = 'bold 18px "Segoe UI", "Microsoft YaHei", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🧬 杂交育种', cx, cy);

  if (!isEnabled) {
    ctx.font = '12px "Segoe UI", "Microsoft YaHei", sans-serif';
    ctx.fillText(`请选择 2 株植物 (${state.selectedCards.length}/2)`, cx, cy + 22);
  }

  ctx.restore();
}

function drawNextRoundButton(
  ctx: CanvasRenderingContext2D,
  state: UIState,
  rect: { x: number; y: number; width: number; height: number }
): void {
  const { x, y, width, height } = rect;
  const isHovered = state.nextRoundButtonHovered;

  ctx.save();

  const scale = isHovered ? 1.1 : 1;
  const cx = x + width / 2;
  const cy = y + height / 2;
  const drawWidth = width * scale;
  const drawHeight = height * scale;
  const drawX = cx - drawWidth / 2;
  const drawY = cy - drawHeight / 2;

  ctx.shadowColor = 'rgba(74, 124, 89, 0.4)';
  ctx.shadowBlur = isHovered ? 20 : 10;
  ctx.shadowOffsetY = 3;

  const gradient = ctx.createLinearGradient(drawX, drawY, drawX, drawY + drawHeight);
  gradient.addColorStop(0, '#7cb342');
  gradient.addColorStop(0.5, '#558b2f');
  gradient.addColorStop(1, '#33691e');

  ctx.beginPath();
  roundRect(ctx, drawX, drawY, drawWidth, drawHeight, drawHeight / 2);
  ctx.fillStyle = gradient;
  ctx.fill();

  if (isHovered) {
    ctx.save();
    ctx.beginPath();
    roundRect(ctx, drawX, drawY, drawWidth, drawHeight, drawHeight / 2);
    ctx.clip();

    const time = performance.now() / 500;
    const shineX = drawX + ((Math.sin(time) + 1) / 2) * drawWidth;
    const shineGradient = ctx.createLinearGradient(
      shineX - 20,
      drawY,
      shineX + 20,
      drawY
    );
    shineGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
    shineGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.3)');
    shineGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = shineGradient;
    ctx.fillRect(drawX, drawY, drawWidth, drawHeight);
    ctx.restore();
  }

  ctx.shadowColor = 'transparent';
  ctx.font = 'bold 14px "Segoe UI", "Microsoft YaHei", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('下一轮 →', cx, cy);

  ctx.restore();
}

function drawDnaAnimation(
  ctx: CanvasRenderingContext2D,
  state: UIState,
  centerX: number,
  centerY: number
): void {
  ctx.save();

  const time = state.crossAnimProgress;

  const bgGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 200);
  bgGradient.addColorStop(0, 'rgba(74, 124, 89, 0.15)');
  bgGradient.addColorStop(1, 'rgba(74, 124, 89, 0)');
  ctx.fillStyle = bgGradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, 200, 0, Math.PI * 2);
  ctx.fill();

  for (const p of state.dnaParticles) {
    const strandOffset = p.strand === 0 ? 0 : Math.PI;
    const x = centerX + Math.cos(p.angle + strandOffset) * p.radius * (0.5 + time * 0.5);
    const y = centerY + p.yOffset * (0.5 + time * 0.5);
    const alpha = Math.min(1, time * 2) * (p.strand === 0 ? 1 : 0.8);

    ctx.beginPath();
    ctx.arc(x, y, p.size * (0.5 + time * 0.5), 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.globalAlpha = alpha;
    ctx.fill();

    if (p.strand === 0) {
      const x2 = centerX + Math.cos(p.angle + Math.PI) * p.radius * (0.5 + time * 0.5);
      const y2 = centerY + p.yOffset * (0.5 + time * 0.5);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = 'rgba(74, 124, 89, 0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawCrossProgress(
  ctx: CanvasRenderingContext2D,
  state: UIState,
  x: number,
  y: number
): void {
  ctx.save();
  ctx.font = '16px "Segoe UI", "Microsoft YaHei", sans-serif';
  ctx.fillStyle = '#4a7c59';
  ctx.textAlign = 'center';
  ctx.fillText('基因重组中...', x, y);

  const barWidth = 200;
  const barHeight = 8;
  const barX = x - barWidth / 2;
  const barY = y + 15;

  ctx.fillStyle = '#e0e0e0';
  ctx.beginPath();
  roundRect(ctx, barX, barY, barWidth, barHeight, 4);
  ctx.fill();

  const progress = state.crossAnimProgress;
  const fillGradient = ctx.createLinearGradient(barX, barY, barX, barY + barHeight);
  fillGradient.addColorStop(0, '#6b9b7a');
  fillGradient.addColorStop(1, '#4a7c59');
  ctx.fillStyle = fillGradient;
  ctx.beginPath();
  roundRect(ctx, barX, barY, barWidth * progress, barHeight, 4);
  ctx.fill();

  ctx.restore();
}

function drawPopup(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number
): void {
  ctx.save();
  ctx.font = 'bold 16px "Segoe UI", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';

  const padding = 12;
  const textWidth = ctx.measureText(text).width;
  const boxWidth = textWidth + padding * 2;
  const boxHeight = 36;

  const boxX = x - boxWidth / 2;
  const boxY = y - boxHeight / 2;

  ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 2;

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  roundRect(ctx, boxX, boxY, boxWidth, boxHeight, 8);
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#4a7c59';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);

  ctx.restore();
}

function drawGeneTooltip(ctx: CanvasRenderingContext2D, card: PlantCard): void {
  const { x, y, width, height, plant } = card;
  const tooltipX = x + width + 10;
  const tooltipY = y;

  const text = genotypeToString(plant.genotype);
  const lines = text.split(' | ');

  ctx.save();
  ctx.font = '12px "Consolas", monospace';
  const padding = 10;
  const lineHeight = 18;
  const boxWidth = 180;
  const boxHeight = lines.length * lineHeight + padding * 2;

  ctx.fillStyle = 'rgba(50, 50, 50, 0.9)';
  ctx.beginPath();
  roundRect(ctx, tooltipX, tooltipY, boxWidth, boxHeight, 6);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  lines.forEach((line, i) => {
    ctx.fillText(line, tooltipX + padding, tooltipY + padding + i * lineHeight);
  });

  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function easeOutBounce(t: number): number {
  const n1 = 7.5625;
  const d1 = 2.75;

  if (t < 1 / d1) {
    return n1 * t * t;
  } else if (t < 2 / d1) {
    return n1 * (t -= 1.5 / d1) * t + 0.75;
  } else if (t < 2.5 / d1) {
    return n1 * (t -= 2.25 / d1) * t + 0.9375;
  } else {
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  }
}

export function showPopup(state: UIState, text: string, duration: number = 2): void {
  state.popupText = text;
  state.popupTimer = duration;
}
