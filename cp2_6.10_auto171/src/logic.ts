import { v4 as uuidv4 } from 'uuid';
import { BaseElement, ELEMENT_CONFIGS } from './elements';

export interface LogicNode {
  id: string;
  type: 'condition' | 'result';
  label: string;
  elementId?: string;
  x: number;
  y: number;
}

export interface LogicEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
}

export interface LogicState {
  nodes: LogicNode[];
  edges: LogicEdge[];
}

export function createState(): LogicState {
  return { nodes: [], edges: [] };
}

export function buildNodesFromElements(elements: BaseElement[], existingNodes: LogicNode[]): LogicNode[] {
  const nodes: LogicNode[] = [];
  const conditionElements = elements.filter((e) => e.type === 'pressurePlate' || e.type === 'laserReceiver');
  const resultElements = elements.filter((e) => e.type === 'door' || e.type === 'laserEmitter');

  let xOffset = 40;
  for (const el of conditionElements) {
    const existing = existingNodes.find((n) => n.elementId === el.id);
    const label =
      el.type === 'pressurePlate' ? '箱子压住压力板' : '激光照射接收器';
    nodes.push({
      id: existing?.id || uuidv4(),
      type: 'condition',
      label,
      elementId: el.id,
      x: existing?.x ?? xOffset,
      y: existing?.y ?? 40,
    });
    xOffset += 110;
  }

  xOffset = 40;
  for (const el of resultElements) {
    const existing = existingNodes.find((n) => n.elementId === el.id);
    const label = el.type === 'door' ? '门打开' : '激光点亮';
    nodes.push({
      id: existing?.id || uuidv4(),
      type: 'result',
      label,
      elementId: el.id,
      x: existing?.x ?? xOffset,
      y: existing?.y ?? 100,
    });
    xOffset += 110;
  }

  return nodes;
}

export function addEdge(state: LogicState, fromNodeId: string, toNodeId: string): LogicEdge | null {
  const from = state.nodes.find((n) => n.id === fromNodeId);
  const to = state.nodes.find((n) => n.id === toNodeId);
  if (!from || !to) return null;
  if (from.type !== 'condition' || to.type !== 'result') return null;
  const exists = state.edges.some((e) => e.fromNodeId === fromNodeId && e.toNodeId === toNodeId);
  if (exists) return null;
  const edge: LogicEdge = { id: uuidv4(), fromNodeId, toNodeId };
  state.edges.push(edge);
  return edge;
}

export function removeEdge(state: LogicState, edgeId: string): void {
  state.edges = state.edges.filter((e) => e.id !== edgeId);
}

export function evaluateLogic(elements: BaseElement[], state: LogicState): void {
  const resultNodeIds = new Set<string>();
  for (const edge of state.edges) {
    const fromNode = state.nodes.find((n) => n.id === edge.fromNodeId);
    const toNode = state.nodes.find((n) => n.id === edge.toNodeId);
    if (!fromNode || !toNode) continue;
    const fromEl = elements.find((e) => e.id === fromNode.elementId);
    if (fromEl && fromEl.isActive) {
      resultNodeIds.add(toNode.id);
    }
  }

  for (const node of state.nodes) {
    if (node.type === 'result' && resultNodeIds.has(node.id)) {
      const el = elements.find((e) => e.id === node.elementId);
      if (el && el.type === 'door') {
        el.isOpen = true;
      }
      if (el && el.type === 'laserEmitter') {
        el.isActive = true;
      }
    } else if (node.type === 'result' && !resultNodeIds.has(node.id)) {
      const el = elements.find((e) => e.id === node.elementId);
      if (el && el.type === 'door') {
        const anyActive = state.edges.some((e) => {
          if (e.toNodeId !== node.id) return false;
          const fn = state.nodes.find((n) => n.id === e.fromNodeId);
          if (!fn) return false;
          const fe = elements.find((x) => x.id === fn.elementId);
          return fe?.isActive;
        });
        if (!anyActive) el.isOpen = false;
      }
    }
  }

  const doors = elements.filter((e) => e.type === 'door');
  for (const door of doors) {
    const hasEdge = state.edges.some((e) => {
      const tn = state.nodes.find((n) => n.id === e.toNodeId);
      return tn?.elementId === door.id;
    });
    if (!hasEdge) {
      const anyConditionActive = elements.some(
        (e) => (e.type === 'pressurePlate' || e.type === 'laserReceiver') && e.isActive,
      );
      if (anyConditionActive) door.isOpen = true;
    }
  }
}

export function renderLogicFlow(
  ctx: CanvasRenderingContext2D,
  state: LogicState,
  elements: BaseElement[],
  width: number,
  height: number,
  hoverEdgeId: string | null,
): void {
  ctx.fillStyle = '#1e1f30';
  ctx.fillRect(0, 0, width, height);

  for (const edge of state.edges) {
    const from = state.nodes.find((n) => n.id === edge.fromNodeId);
    const to = state.nodes.find((n) => n.id === edge.toNodeId);
    if (!from || !to) continue;
    const fromX = from.type === 'condition' ? from.x + 25 : from.x + 40;
    const fromY = from.y + 25;
    const toX = to.type === 'result' ? to.x + 40 : to.x + 25;
    const toY = to.y + 25;

    ctx.strokeStyle = hoverEdgeId === edge.id ? '#ff6b6b' : '#ffffff';
    ctx.lineWidth = hoverEdgeId === edge.id ? 2.5 : 1.5;
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    const midX = (fromX + toX) / 2;
    ctx.bezierCurveTo(midX, fromY, midX, toY, toX, toY);
    ctx.stroke();

    const angle = Math.atan2(toY - fromY, toX - fromX);
    ctx.fillStyle = hoverEdgeId === edge.id ? '#ff6b6b' : '#ffffff';
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - 8 * Math.cos(angle - Math.PI / 6), toY - 8 * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(toX - 8 * Math.cos(angle + Math.PI / 6), toY - 8 * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();

    if (hoverEdgeId === edge.id) {
      const mx = (fromX + toX) / 2;
      const my = (fromY + toY) / 2;
      ctx.fillStyle = '#e74c3c';
      ctx.beginPath();
      ctx.arc(mx, my - 12, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('×', mx, my - 12);
    }
  }

  for (const node of state.nodes) {
    const el = elements.find((e) => e.id === node.elementId);
    const active = el?.isActive || (el?.type === 'door' && el.isOpen);

    if (node.type === 'condition') {
      const grad = ctx.createRadialGradient(node.x + 20, node.y + 20, 4, node.x + 25, node.y + 25, 25);
      grad.addColorStop(0, active ? '#f5b041' : '#f39c12');
      grad.addColorStop(1, active ? '#d68910' : '#b9770e');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(node.x + 25, node.y + 25, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = active ? '#00ff00' : '#7d6608';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.label.slice(0, 4), node.x + 25, node.y + 20);
      ctx.fillText(node.label.slice(4), node.x + 25, node.y + 32);
    } else {
      const grad = ctx.createLinearGradient(node.x, node.y, node.x + 80, node.y + 50);
      grad.addColorStop(0, active ? '#5dade2' : '#3498db');
      grad.addColorStop(1, active ? '#2e86c1' : '#1f618d');
      ctx.fillStyle = grad;
      ctx.beginPath();
      const r = 6;
      ctx.moveTo(node.x + r, node.y);
      ctx.lineTo(node.x + 80 - r, node.y);
      ctx.quadraticCurveTo(node.x + 80, node.y, node.x + 80, node.y + r);
      ctx.lineTo(node.x + 80, node.y + 50 - r);
      ctx.quadraticCurveTo(node.x + 80, node.y + 50, node.x + 80 - r, node.y + 50);
      ctx.lineTo(node.x + r, node.y + 50);
      ctx.quadraticCurveTo(node.x, node.y + 50, node.x, node.y + 50 - r);
      ctx.lineTo(node.x, node.y + r);
      ctx.quadraticCurveTo(node.x, node.y, node.x + r, node.y);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = active ? '#00ff00' : '#1a5276';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.label, node.x + 40, node.y + 25);
    }
  }
}

export function findEdgeAt(
  state: LogicState,
  x: number,
  y: number,
): string | null {
  for (const edge of state.edges) {
    const from = state.nodes.find((n) => n.id === edge.fromNodeId);
    const to = state.nodes.find((n) => n.id === edge.toNodeId);
    if (!from || !to) continue;
    const mx = ((from.type === 'condition' ? from.x + 25 : from.x + 40) + (to.type === 'result' ? to.x + 40 : to.x + 25)) / 2;
    const my = ((from.y + 25) + (to.y + 25)) / 2;
    const dx = x - mx;
    const dy = y - (my - 12);
    if (dx * dx + dy * dy < 14 * 14) {
      return edge.id;
    }
  }
  return null;
}

export function findNodeAt(state: LogicState, x: number, y: number): LogicNode | null {
  for (const node of state.nodes) {
    if (node.type === 'condition') {
      const dx = x - (node.x + 25);
      const dy = y - (node.y + 25);
      if (dx * dx + dy * dy < 25 * 25) return node;
    } else {
      if (x >= node.x && x <= node.x + 80 && y >= node.y && y <= node.y + 50) return node;
    }
  }
  return null;
}
