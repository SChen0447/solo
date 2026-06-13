export interface NodeData {
  id: string;
  x: number;
  y: number;
  radius: number;
  selected: boolean;
  colorIndex: number;
  phase: number;
  pulseSpeed: number;
  pulseRange: number;
}

const COLORS = [
  { r: 0, g: 212, b: 255 },
  { r: 179, g: 0, b: 255 },
];

let nodeIdCounter = 0;

export function createNode(x: number, y: number): NodeData {
  nodeIdCounter++;
  return {
    id: `node-${nodeIdCounter}`,
    x,
    y,
    radius: 14,
    selected: false,
    colorIndex: nodeIdCounter % 2,
    phase: Math.random() * Math.PI * 2,
    pulseSpeed: 1.5 + Math.random() * 0.8,
    pulseRange: 2,
  };
}

export function selectNode(node: NodeData): void {
  node.selected = true;
}

export function deselectNode(node: NodeData): void {
  node.selected = false;
}

export function getNodeColor(node: NodeData): { r: number; g: number; b: number } {
  return COLORS[node.colorIndex % COLORS.length];
}

export function getPulseRadius(node: NodeData, time: number): number {
  const pulse = Math.sin(time * node.pulseSpeed * 0.001 + node.phase) * node.pulseRange;
  return node.radius + pulse;
}

export function hitTestNode(node: NodeData, x: number, y: number, scale: number = 1): boolean {
  const dx = node.x - x;
  const dy = node.y - y;
  const hitRadius = node.radius + 6;
  return dx * dx + dy * dy <= hitRadius * hitRadius;
}

export function drawNode(
  ctx: CanvasRenderingContext2D,
  node: NodeData,
  time: number,
  scale: number
): void {
  const color = getNodeColor(node);
  const pulseRadius = getPulseRadius(node, time);
  const baseRadius = pulseRadius * scale;
  const x = node.x * scale;
  const y = node.y * scale;

  if (node.selected) {
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, baseRadius * 3);
    gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, 0.35)`);
    gradient.addColorStop(0.5, `rgba(${color.r}, ${color.g}, ${color.b}, 0.1)`);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, baseRadius * 3, 0, Math.PI * 2);
    ctx.fill();
  }

  const glowRadius = baseRadius * 1.6;
  const glowGradient = ctx.createRadialGradient(x, y, baseRadius * 0.5, x, y, glowRadius);
  const glowAlpha = node.selected ? 0.6 : 0.3;
  glowGradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${glowAlpha})`);
  glowGradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);
  ctx.fillStyle = glowGradient;
  ctx.beginPath();
  ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
  ctx.fill();

  const innerGradient = ctx.createRadialGradient(
    x - baseRadius * 0.3,
    y - baseRadius * 0.3,
    0,
    x,
    y,
    baseRadius
  );
  if (node.selected) {
    innerGradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, 1)`);
    innerGradient.addColorStop(0.7, `rgba(${color.r}, ${color.g}, ${color.b}, 0.85)`);
    innerGradient.addColorStop(1, `rgba(${Math.floor(color.r * 0.6)}, ${Math.floor(color.g * 0.6)}, ${Math.floor(color.b * 0.6)}, 0.9)`);
  } else {
    innerGradient.addColorStop(0, 'rgba(200, 200, 220, 0.5)');
    innerGradient.addColorStop(0.6, 'rgba(140, 140, 170, 0.35)');
    innerGradient.addColorStop(1, 'rgba(100, 100, 130, 0.25)');
  }
  ctx.fillStyle = innerGradient;
  ctx.beginPath();
  ctx.arc(x, y, baseRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = node.selected
    ? `rgba(255, 255, 255, 0.9)`
    : `rgba(200, 200, 230, 0.3)`;
  ctx.lineWidth = node.selected ? 2 : 1;
  ctx.beginPath();
  ctx.arc(x, y, baseRadius, 0, Math.PI * 2);
  ctx.stroke();
}
