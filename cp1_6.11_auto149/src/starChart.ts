import {
  CelestialBody,
  Aspect,
  ChartConfig,
  ZODIAC_SIGNS,
  HEAVENLY_STEMS,
  EARTHLY_BRANCHES,
  ASPECT_TYPES,
  PALACES,
  DOMAINS,
  DIRECTIONS,
  METAPHORS,
  ACTIONS,
  AVOIDS,
  PROPHECY_TEMPLATES,
} from './types';

const CHART_SIZE = 400;
const CENTER = CHART_SIZE / 2;
const OUTER_R = 180;
const INNER_R = 120;
const CORE_R = 50;

const HOUSE_COLORS = ['#d4af37', '#4a2875', '#8b0000'];

let chartAnimProgress = 0;
let chartAnimating = false;
let aspectAnimIndex = 0;
let chartConfig: ChartConfig | null = null;

function generateBirthChart(): string[] {
  const pillars: string[] = [];
  for (let i = 0; i < 4; i++) {
    const stem = HEAVENLY_STEMS[Math.floor(Math.random() * HEAVENLY_STEMS.length)];
    const branch = EARTHLY_BRANCHES[Math.floor(Math.random() * EARTHLY_BRANCHES.length)];
    pillars.push(stem + branch);
  }
  return pillars;
}

function generateAspects(bodies: CelestialBody[]): Aspect[] {
  const aspects: Aspect[] = [];
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const angleDiff = Math.abs(bodies[i].longitude - bodies[j].longitude);
      for (const at of ASPECT_TYPES) {
        if (Math.abs(angleDiff - at.angle) < 15) {
          aspects.push({
            type: at.type,
            source: bodies[i],
            target: bodies[j],
            color: at.color,
            label: at.label,
          });
          break;
        }
      }
    }
  }
  return aspects;
}

export function generateChartConfig(selectedStars: CelestialBody[]): ChartConfig {
  const aspects = generateAspects(selectedStars);
  const birthChart = generateBirthChart();
  chartConfig = { selectedStars, aspects, birthChart };
  chartAnimProgress = 0;
  aspectAnimIndex = 0;
  chartAnimating = true;
  return chartConfig;
}

export function renderChart(
  ctx: CanvasRenderingContext2D,
  deltaTime: number
): boolean {
  if (!chartConfig) return false;

  if (chartAnimating) {
    chartAnimProgress += deltaTime / 1500;
    if (chartAnimProgress >= 1) {
      chartAnimProgress = 1;
      chartAnimating = false;
    }
  }

  const progress = easeOutCubic(chartAnimProgress);

  ctx.clearRect(0, 0, CHART_SIZE, CHART_SIZE);
  ctx.save();
  ctx.translate(CENTER, CENTER);
  ctx.rotate(-progress * Math.PI * 2);

  const visibleArc = progress * Math.PI * 2;

  for (let i = 0; i < 12; i++) {
    const startAngle = (i * Math.PI * 2) / 12 - Math.PI / 2;
    const endAngle = startAngle + (Math.PI * 2) / 12;

    if (startAngle >= visibleArc) continue;

    const drawEnd = Math.min(endAngle, visibleArc);

    ctx.beginPath();
    ctx.arc(0, 0, OUTER_R, startAngle, drawEnd);
    ctx.arc(0, 0, INNER_R, drawEnd, startAngle, true);
    ctx.closePath();
    ctx.fillStyle = HOUSE_COLORS[i % 3] + 'cc';
    ctx.fill();

    ctx.strokeStyle = 'rgba(201, 168, 76, 0.4)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    const midAngle = (startAngle + drawEnd) / 2;
    const labelR = (OUTER_R + INNER_R) / 2;
    ctx.save();
    ctx.translate(Math.cos(midAngle) * labelR, Math.sin(midAngle) * labelR);
    ctx.rotate(midAngle + Math.PI / 2);
    ctx.fillStyle = 'rgba(255, 255, 240, 0.8)';
    ctx.font = '11px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (progress > 0.3) {
      ctx.fillText(ZODIAC_SIGNS[i].symbol, 0, 0);
    }
    ctx.restore();
  }

  ctx.restore();

  if (progress > 0.5) {
    const aspectProgress = (progress - 0.5) / 0.5;
    const totalAspects = chartConfig.aspects.length;
    const visibleAspects = Math.floor(aspectProgress * totalAspects / 0.15) * 0.15;
    const maxAspectIndex = Math.min(
      Math.floor(aspectProgress * (totalAspects + totalAspects * 0.15)),
      totalAspects
    );

    for (let i = 0; i < Math.min(maxAspectIndex, totalAspects); i++) {
      const aspect = chartConfig.aspects[i];
      const lineProgress = Math.min(1, (aspectProgress - i * 0.15) / 0.5);
      if (lineProgress <= 0) continue;

      const sx = Math.cos((aspect.source.longitude / 360) * Math.PI * 2 - Math.PI / 2) * INNER_R;
      const sy = Math.sin((aspect.source.longitude / 360) * Math.PI * 2 - Math.PI / 2) * INNER_R;
      const ex = Math.cos((aspect.target.longitude / 360) * Math.PI * 2 - Math.PI / 2) * INNER_R;
      const ey = Math.sin((aspect.target.longitude / 360) * Math.PI * 2 - Math.PI / 2) * INNER_R;

      const cx1 = sx + (ex - sx) * lineProgress;
      const cy1 = sy + (ey - sy) * lineProgress;

      ctx.beginPath();
      ctx.moveTo(sx + CENTER, sy + CENTER);
      ctx.lineTo(cx1 + CENTER, cy1 + CENTER);
      ctx.strokeStyle = aspect.color + 'aa';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    for (const body of chartConfig.selectedStars) {
      const bx = Math.cos((body.longitude / 360) * Math.PI * 2 - Math.PI / 2) * INNER_R;
      const by = Math.sin((body.longitude / 360) * Math.PI * 2 - Math.PI / 2) * INNER_R;

      ctx.beginPath();
      ctx.arc(bx + CENTER, by + CENTER, 4, 0, Math.PI * 2);
      ctx.fillStyle = body.color;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(bx + CENTER, by + CENTER, 7, 0, Math.PI * 2);
      ctx.strokeStyle = body.color + '66';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  if (progress > 0.7) {
    const coreAlpha = Math.min(1, (progress - 0.7) / 0.3);

    ctx.beginPath();
    ctx.arc(CENTER, CENTER, CORE_R, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(14, 20, 40, ${0.8 * coreAlpha})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(201, 168, 76, ${0.6 * coreAlpha})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    if (chartConfig.birthChart.length > 0) {
      ctx.fillStyle = `rgba(212, 175, 55, ${coreAlpha})`;
      ctx.font = 'bold 14px KaiTi, STKaiti, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const text = chartConfig.birthChart.join(' ');
      ctx.fillText(text, CENTER, CENTER);
    }
  }

  return chartAnimating;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function generateProphecy(config: ChartConfig): string {
  const template = PROPHECY_TEMPLATES[Math.floor(Math.random() * PROPHECY_TEMPLATES.length)];
  const palace = PALACES[Math.floor(Math.random() * PALACES.length)];
  const planet = config.selectedStars.length > 0
    ? config.selectedStars[Math.floor(Math.random() * config.selectedStars.length)].name
    : '岁星';
  const aspect = config.aspects.length > 0
    ? config.aspects[Math.floor(Math.random() * config.aspects.length)].label
    : '合';
  const comet = '彗星';
  const direction = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
  const stem = config.birthChart[0] ? config.birthChart[0][0] : '甲';
  const branch = config.birthChart[0] ? config.birthChart[0][1] : '子';
  const domain = DOMAINS[Math.floor(Math.random() * DOMAINS.length)];
  const metaphor = METAPHORS[Math.floor(Math.random() * METAPHORS.length)];
  const action = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
  const avoid = AVOIDS[Math.floor(Math.random() * AVOIDS.length)];

  return template
    .replace('{palace}', palace)
    .replace('{planet}', planet)
    .replace('{aspect}', aspect)
    .replace('{domain}', domain)
    .replace('{comet}', comet)
    .replace('{direction}', direction)
    .replace('{stem}', stem)
    .replace('{branch}', branch)
    .replace('{metaphor}', metaphor)
    .replace('{action}', action)
    .replace('{avoid}', avoid);
}

export function isChartAnimating(): boolean {
  return chartAnimating;
}

export function resetChart(): void {
  chartConfig = null;
  chartAnimProgress = 0;
  chartAnimating = false;
  aspectAnimIndex = 0;
}
