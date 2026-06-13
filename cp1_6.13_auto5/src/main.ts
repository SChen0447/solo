import type { NodeData } from './nodes';
import { createNode, selectNode, deselectNode, drawNode, hitTestNode } from './nodes';
import type { ConnectionData } from './connector';
import { createConnection, drawConnection, drawPreviewCurve, hitTestConnection, updateConnection } from './connector';
import { initUI, updateStats, hideLoading, closeMobileToolbar } from './ui';

interface HistoryState {
  nodes: NodeData[];
  connections: ConnectionData[];
}

const canvas = document.getElementById('main-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const container = document.getElementById('canvas-container')!;

let nodes: NodeData[] = [];
let connections: ConnectionData[] = [];
let history: HistoryState[] = [];
let historyIndex = -1;

let scale = 1;
let offsetX = 0;
let offsetY = 0;

let selectedNode: NodeData | null = null;
let draggingFromNode: NodeData | null = null;
let mouseX = 0;
let mouseY = 0;
let isDraggingConnection = false;
let isPanning = false;
let panStartX = 0;
let panStartY = 0;
let panOffsetStartX = 0;
let panOffsetStartY = 0;

let lastTime = 0;
let animationId = 0;

let canvasWidth = 0;
let canvasHeight = 0;
let isDesktopLayout = true;

function saveHistory(): void {
  const state: HistoryState = {
    nodes: JSON.parse(JSON.stringify(nodes)),
    connections: JSON.parse(JSON.stringify(connections)),
  };

  if (historyIndex < history.length - 1) {
    history = history.slice(0, historyIndex + 1);
  }

  history.push(state);
  historyIndex = history.length - 1;

  if (history.length > 100) {
    history.shift();
    historyIndex--;
  }
}

function undo(): void {
  if (historyIndex <= 0) return;

  historyIndex--;
  const state = history[historyIndex];
  nodes = JSON.parse(JSON.stringify(state.nodes));
  connections = JSON.parse(JSON.stringify(state.connections));
  selectedNode = null;
}

function resetCanvas(): void {
  if (nodes.length === 0 && connections.length === 0) return;

  saveHistory();
  nodes = [];
  connections = [];
  selectedNode = null;
  offsetX = 0;
  offsetY = 0;
  scale = 1;
}

function exportPNG(): void {
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  const tempCtx = tempCanvas.getContext('2d')!;

  tempCtx.fillStyle = '#0f0f1a';
  tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

  tempCtx.save();
  tempCtx.translate(canvas.width / 2 + offsetX, canvas.height / 2 + offsetY);
  tempCtx.scale(scale, scale);

  for (const conn of connections) {
    drawConnection(tempCtx, conn, nodes, performance.now(), 1);
  }

  for (const node of nodes) {
    drawNode(tempCtx, node, performance.now(), 1);
  }

  tempCtx.restore();

  const link = document.createElement('a');
  link.download = `geometry-art-${Date.now()}.png`;
  link.href = tempCanvas.toDataURL('image/png');
  link.click();
}

function resizeCanvas(): void {
  const dpr = window.devicePixelRatio || 1;

  isDesktopLayout = window.innerWidth > 768;

  if (isDesktopLayout) {
    const maxWidth = Math.min(window.innerWidth - 120, 1600);
    const maxHeight = Math.min(window.innerHeight - 80, 1000);
    canvasWidth = maxWidth;
    canvasHeight = maxHeight;
  } else {
    canvasWidth = window.innerWidth;
    canvasHeight = window.innerHeight;
  }

  canvas.style.width = `${canvasWidth}px`;
  canvas.style.height = `${canvasHeight}px`;
  canvas.width = Math.floor(canvasWidth * dpr);
  canvas.height = Math.floor(canvasHeight * dpr);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function screenToWorld(sx: number, sy: number): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const x = (sx - rect.left - canvasWidth / 2 - offsetX) / scale;
  const y = (sy - rect.top - canvasHeight / 2 - offsetY) / scale;
  return { x, y };
}

function getNodeAtPosition(x: number, y: number): NodeData | null {
  const world = screenToWorld(x, y);
  for (let i = nodes.length - 1; i >= 0; i--) {
    if (hitTestNode(nodes[i], world.x, world.y, 1)) {
      return nodes[i];
    }
  }
  return null;
}

function getConnectionAtPosition(x: number, y: number): ConnectionData | null {
  const world = screenToWorld(x, y);
  for (let i = connections.length - 1; i >= 0; i--) {
    if (hitTestConnection(connections[i], nodes, world.x, world.y, 1)) {
      return connections[i];
    }
  }
  return null;
}

function handleClick(e: MouseEvent): void {
  if (e.button !== 0) return;

  const clickedNode = getNodeAtPosition(e.clientX, e.clientY);

  if (draggingFromNode && clickedNode && clickedNode.id !== draggingFromNode.id) {
    const exists = connections.some(
      (c) =>
        (c.fromId === draggingFromNode!.id && c.toId === clickedNode.id) ||
        (c.fromId === clickedNode.id && c.toId === draggingFromNode!.id)
    );

    if (!exists) {
      saveHistory();
      const conn = createConnection(draggingFromNode.id, clickedNode.id);
      connections.push(conn);
    }
  } else if (!clickedNode && !isPanning) {
    const world = screenToWorld(e.clientX, e.clientY);

    if (selectedNode) {
      deselectNode(selectedNode);
      selectedNode = null;
    }

    saveHistory();
    const newNode = createNode(world.x, world.y);
    nodes.push(newNode);
  } else if (clickedNode) {
    if (selectedNode && selectedNode.id !== clickedNode.id) {
      deselectNode(selectedNode);
    }
    selectNode(clickedNode);
    selectedNode = clickedNode;
  }

  draggingFromNode = null;
  isDraggingConnection = false;
}

function handleMouseDown(e: MouseEvent): void {
  if (e.button === 2) {
    e.preventDefault();
    return;
  }

  const clickedNode = getNodeAtPosition(e.clientX, e.clientY);

  if (clickedNode) {
    draggingFromNode = clickedNode;
    isDraggingConnection = true;
    mouseX = e.clientX;
    mouseY = e.clientY;
  } else {
    isPanning = true;
    panStartX = e.clientX;
    panStartY = e.clientY;
    panOffsetStartX = offsetX;
    panOffsetStartY = offsetY;

    if (selectedNode) {
      deselectNode(selectedNode);
      selectedNode = null;
    }
  }

  closeMobileToolbar();
}

function handleMouseMove(e: MouseEvent): void {
  mouseX = e.clientX;
  mouseY = e.clientY;

  if (isPanning) {
    offsetX = panOffsetStartX + (e.clientX - panStartX);
    offsetY = panOffsetStartY + (e.clientY - panStartY);
  }
}

function handleMouseUp(e: MouseEvent): void {
  if (isDraggingConnection) {
    handleClick(e);
  }

  isDraggingConnection = false;
  isPanning = false;
  draggingFromNode = null;
}

function handleContextMenu(e: MouseEvent): void {
  e.preventDefault();

  const conn = getConnectionAtPosition(e.clientX, e.clientY);
  if (conn) {
    saveHistory();
    connections = connections.filter((c) => c.id !== conn.id);
  }
}

function handleWheel(e: WheelEvent): void {
  e.preventDefault();

  const delta = e.deltaY > 0 ? 0.9 : 1.1;
  const newScale = Math.max(0.2, Math.min(5, scale * delta));

  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left - canvasWidth / 2;
  const my = e.clientY - rect.top - canvasHeight / 2;

  const scaleRatio = newScale / scale;
  offsetX = mx - (mx - offsetX) * scaleRatio;
  offsetY = my - (my - offsetY) * scaleRatio;

  scale = newScale;
}

function handleTouchStart(e: TouchEvent): void {
  if (e.touches.length === 1) {
    const touch = e.touches[0];
    handleMouseDown({
      clientX: touch.clientX,
      clientY: touch.clientY,
      button: 0,
      preventDefault: () => {},
    } as MouseEvent);
  }
}

function handleTouchMove(e: TouchEvent): void {
  e.preventDefault();
  if (e.touches.length === 1) {
    const touch = e.touches[0];
    handleMouseMove({
      clientX: touch.clientX,
      clientY: touch.clientY,
    } as MouseEvent);
  }
}

function handleTouchEnd(e: TouchEvent): void {
  const touch = e.changedTouches[0];
  handleMouseUp({
    clientX: touch.clientX,
    clientY: touch.clientY,
    button: 0,
  } as MouseEvent);
}

function drawGlowBorder(): void {
  const gradient = ctx.createLinearGradient(0, 0, canvasWidth, 0);
  gradient.addColorStop(0, 'rgba(0, 212, 255, 0.3)');
  gradient.addColorStop(0.5, 'rgba(179, 0, 255, 0.3)');
  gradient.addColorStop(1, 'rgba(0, 212, 255, 0.3)');

  ctx.strokeStyle = gradient;
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, canvasWidth - 1, canvasHeight - 1);

  const innerGradient = ctx.createRadialGradient(
    canvasWidth / 2,
    canvasHeight / 2,
    Math.min(canvasWidth, canvasHeight) * 0.3,
    canvasWidth / 2,
    canvasHeight / 2,
    Math.max(canvasWidth, canvasHeight) * 0.7
  );
  innerGradient.addColorStop(0, 'rgba(0, 212, 255, 0)');
  innerGradient.addColorStop(1, 'rgba(15, 15, 26, 0.4)');
  ctx.fillStyle = innerGradient;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
}

function render(time: number): void {
  const deltaTime = time - lastTime;
  lastTime = time;

  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  ctx.fillStyle = '#0f0f1a';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  drawGrid();

  ctx.save();
  ctx.translate(canvasWidth / 2 + offsetX, canvasHeight / 2 + offsetY);

  for (const conn of connections) {
    updateConnection(conn, deltaTime);
    drawConnection(ctx, conn, nodes, time, scale);
  }

  if (isDraggingConnection && draggingFromNode) {
    const world = screenToWorld(mouseX, mouseY);
    const previewNode = { ...draggingFromNode };
    drawPreviewCurve(ctx, previewNode, world.x * scale, world.y * scale, scale);
  }

  for (const node of nodes) {
    drawNode(ctx, node, time, scale);
  }

  ctx.restore();

  drawGlowBorder();

  updateStats({
    nodeCount: nodes.length,
    connectionCount: connections.length,
    zoomPercent: scale * 100,
  });

  animationId = requestAnimationFrame(render);
}

function drawGrid(): void {
  const gridSize = 60 * scale;
  const startX = (offsetX % gridSize + canvasWidth / 2) % gridSize - gridSize;
  const startY = (offsetY % gridSize + canvasHeight / 2) % gridSize - gridSize;

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
  ctx.lineWidth = 1;

  for (let x = startX; x < canvasWidth + gridSize; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvasHeight);
    ctx.stroke();
  }

  for (let y = startY; y < canvasHeight + gridSize; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvasWidth, y);
    ctx.stroke();
  }
}

function handleResize(): void {
  resizeCanvas();
}

function init(): void {
  resizeCanvas();

  initUI({
    onReset: resetCanvas,
    onUndo: undo,
    onExport: exportPNG,
  });

  saveHistory();

  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseup', handleMouseUp);
  canvas.addEventListener('mouseleave', handleMouseUp);
  canvas.addEventListener('contextmenu', handleContextMenu);
  canvas.addEventListener('wheel', handleWheel, { passive: false });

  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
  canvas.addEventListener('touchend', handleTouchEnd);

  window.addEventListener('resize', handleResize);

  hideLoading();

  animationId = requestAnimationFrame(render);
}

init();
