<template>
  <div 
    class="puzzle-grid-container"
    ref="containerRef"
    @wheel="handleWheel"
    @mousedown="handleMouseDown"
    @mousemove="handleMouseMove"
    @mouseup="handleMouseUp"
    @mouseleave="handleMouseUp"
    @dblclick="handleDoubleClick"
    @contextmenu.prevent
  >
    <canvas 
      ref="canvasRef" 
      class="puzzle-canvas"
      :style="canvasStyle"
    ></canvas>
    <div 
      v-if="showCellInfo && selectedCell" 
      class="cell-info-popup"
      :style="popupStyle"
    >
      <div class="cell-info-title">像素信息</div>
      <div class="cell-info-row">
        <span class="label">坐标:</span>
        <span class="value">({{ selectedCell.x }}, {{ selectedCell.y }})</span>
      </div>
      <div class="cell-info-row">
        <span class="label">参考色:</span>
        <span class="color-swatch" :style="{ backgroundColor: selectedCell.referenceColor }"></span>
        <span class="value">{{ selectedCell.referenceColor }}</span>
      </div>
      <div class="cell-info-row">
        <span class="label">填充色:</span>
        <span class="color-swatch" :style="{ backgroundColor: selectedCell.filledColor || 'transparent' }"></span>
        <span class="value">{{ selectedCell.filledColor || '未填充' }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { usePuzzleStore } from '@/stores/puzzleStore';
import type { PixelCell } from '@/stores/puzzleStore';
const store = usePuzzleStore();
const containerRef = ref<HTMLDivElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const cellSize = ref(20);
const isDragging = ref(false);
const isPanning = ref(false);
const lastMousePos = ref({ x: 0, y: 0 });
const lastPan = ref({ x: 0, y: 0 });
const showCellInfo = ref(false);
const popupPosition = ref({ x: 0, y: 0 });
let rafId: number | null = null;
let lastFilledCells = new Set<string>();
const canvasStyle = computed(() => ({
 transform: `translate(${store.panX}px, ${store.panY}px) scale(${store.zoom})`,
 transformOrigin: '0 0'
}));
const selectedCell = computed<PixelCell | null>(() => {
 if (!store.selectedCellInfo)
 return null;
 const { x, y } = store.selectedCellInfo;
 return store.grid[y]?.[x] || null;
});
const popupStyle = computed(() => ({
 left: `${popupPosition.value.x}px`,
 top: `${popupPosition.value.y}px`
}));
function getGridLineColor(): string {
 return getComputedStyle(document.documentElement).getPropertyValue('--grid-line').trim() || '#CCCCCC';
}
function render() {
 const canvas = canvasRef.value;
 const ctx = canvas?.getContext('2d');
 if (!canvas || !ctx)
 return;
 const size = store.gridSize;
 const cs = cellSize.value;
 const totalSize = size * cs;
 canvas.width = totalSize;
 canvas.height = totalSize;
 ctx.clearRect(0, 0, totalSize, totalSize);
 ctx.fillStyle = '#FFFFFF';
 ctx.fillRect(0, 0, totalSize, totalSize);
 const checkerSize = cs;
 for (let y = 0; y < size; y++) {
 for (let x = 0; x < size; x++) {
 if ((x + y) % 2 === 0) {
 ctx.fillStyle = 'rgba(0, 0, 0, 0.02)';
 ctx.fillRect(x * cs, y * cs, checkerSize, checkerSize);
 }
 }
 }
 for (let y = 0; y < size; y++) {
 for (let x = 0; x < size; x++) {
 const cell = store.grid[y]?.[x];
 if (!cell)
 continue;
 const px = x * cs;
 const py = y * cs;
 if (cell.isFilled && cell.filledColor) {
 ctx.fillStyle = cell.filledColor;
 }
 else {
 ctx.fillStyle = cell.referenceColor;
 ctx.globalAlpha = 0.3;
 }
 if (cell.isAnimating) {
 const padding = cs * 0.1;
 ctx.fillRect(px + padding, py + padding, cs - padding * 2, cs - padding * 2);
 }
 else {
 ctx.fillRect(px, py, cs, cs);
 }
 ctx.globalAlpha = 1;
 }
 }
 ctx.strokeStyle = getGridLineColor();
 ctx.lineWidth = 1 / store.zoom;
 for (let i = 0; i <= size; i++) {
 const pos = i * cs;
 ctx.beginPath();
 ctx.moveTo(pos, 0);
 ctx.lineTo(pos, totalSize);
 ctx.stroke();
 ctx.beginPath();
 ctx.moveTo(0, pos);
 ctx.lineTo(totalSize, pos);
 ctx.stroke();
 }
 if (store.hoveredCell) {
 const { x, y } = store.hoveredCell;
 ctx.strokeStyle = '#3498DB';
 ctx.lineWidth = 2 / store.zoom;
 ctx.strokeRect(x * cs + 1, y * cs + 1, cs - 2, cs - 2);
 }
}
function scheduleRender() {
 if (rafId !== null)
 return;
 rafId = requestAnimationFrame(() => {
 rafId = null;
 render();
 });
}
function getCellFromEvent(e: MouseEvent): {
 x: number;
 y: number;
} | null {
 const canvas = canvasRef.value;
 if (!canvas)
 return null;
 const rect = canvas.getBoundingClientRect();
 const x = (e.clientX - rect.left) / store.zoom;
 const y = (e.clientY - rect.top) / store.zoom;
 const cellX = Math.floor(x / cellSize.value);
 const cellY = Math.floor(y / cellSize.value);
 if (cellX >= 0 && cellX < store.gridSize && cellY >= 0 && cellY < store.gridSize) {
 return { x: cellX, y: cellY };
 }
 return null;
}
function handleMouseDown(e: MouseEvent) {
 if (e.button === 1 || (e.button === 0 && store.isSpacePressed)) {
 isPanning.value = true;
 lastMousePos.value = { x: e.clientX, y: e.clientY };
 lastPan.value = { x: store.panX, y: store.panY };
 return;
 }
 if (e.button !== 0)
 return;
 if (!store.selectedColor) {
 store.setStatusMessage('请先选择一种颜色');
 return;
 }
 const cell = getCellFromEvent(e);
 if (cell) {
 isDragging.value = true;
 lastFilledCells.clear();
 tryFillCell(cell.x, cell.y);
 }
}
function handleMouseMove(e: MouseEvent) {
 if (isPanning.value) {
 const dx = e.clientX - lastMousePos.value.x;
 const dy = e.clientY - lastMousePos.value.y;
 store.setPan(lastPan.value.x + dx, lastPan.value.y + dy);
 return;
 }
 const cell = getCellFromEvent(e);
 store.setHoveredCell(cell);
 if (isDragging.value && store.selectedColor && cell) {
 tryFillCell(cell.x, cell.y);
 }
}
function handleMouseUp() {
 isDragging.value = false;
 isPanning.value = false;
 lastFilledCells.clear();
}
function handleWheel(e: WheelEvent) {
 e.preventDefault();
 const delta = e.deltaY > 0 ? -0.1 : 0.1;
 const newZoom = Math.max(0.5, Math.min(4, store.zoom + delta));
 const canvas = canvasRef.value;
 if (canvas) {
 const rect = canvas.getBoundingClientRect();
 const mouseX = e.clientX - rect.left;
 const mouseY = e.clientY - rect.top;
 const scaleRatio = newZoom / store.zoom;
 const newX = store.panX - (mouseX * (scaleRatio - 1));
 const newY = store.panY - (mouseY * (scaleRatio - 1));
 store.setZoom(newZoom);
 store.setPan(newX, newY);
 }
 else {
 store.setZoom(newZoom);
 }
 scheduleRender();
}
function handleDoubleClick(e: MouseEvent) {
 const cell = getCellFromEvent(e);
 if (cell) {
 store.setSelectedCellInfo(cell);
 showCellInfo.value = true;
 const container = containerRef.value;
 if (container) {
 const rect = container.getBoundingClientRect();
 popupPosition.value = {
 x: e.clientX - rect.left + 15,
 y: e.clientY - rect.top + 15
 };
 }
 focusOnCell(cell.x, cell.y);
 setTimeout(() => {
 showCellInfo.value = false;
 }, 3000);
 }
}
function focusOnCell(x: number, y: number) {
 const container = containerRef.value;
 if (!container)
 return;
 const containerRect = container.getBoundingClientRect();
 const targetZoom = Math.min(4, store.zoom * 1.5);
 const cs = cellSize.value;
 const cellCenterX = (x + 0.5) * cs * targetZoom;
 const cellCenterY = (y + 0.5) * cs * targetZoom;
 const newPanX = containerRect.width / 2 - cellCenterX;
 const newPanY = containerRect.height / 2 - cellCenterY;
 store.setZoom(targetZoom);
 store.setPan(newPanX, newPanY);
 scheduleRender();
}
function tryFillCell(x: number, y: number) {
 const key = `${x},${y}`;
 if (lastFilledCells.has(key))
 return;
 if (!store.selectedColor)
 return;
 const cell = store.grid[y]?.[x];
 if (!cell)
 return;
 if (cell.filledColor === store.selectedColor) {
 store.playBeep();
 return;
 }
 store.fillCell(x, y, store.selectedColor);
 lastFilledCells.add(key);
 scheduleRender();
}
function handleKeyDown(e: KeyboardEvent) {
 if (e.code === 'Space' && !store.isSpacePressed) {
 store.isSpacePressed = true;
 document.body.style.cursor = 'grab';
 }
 if (e.ctrlKey || e.metaKey) {
 if (e.key === 'z' && !e.shiftKey) {
 e.preventDefault();
 store.undo();
 scheduleRender();
 }
 if (e.key === 'z' && e.shiftKey) {
 e.preventDefault();
 store.redo();
 scheduleRender();
 }
 if (e.key === 'y') {
 e.preventDefault();
 store.redo();
 scheduleRender();
 }
 }
}
function handleKeyUp(e: KeyboardEvent) {
 if (e.code === 'Space') {
 store.isSpacePressed = false;
 document.body.style.cursor = '';
 }
}
function updateCellSize() {
 if (!store.gridSize)
 return;
 const container = containerRef.value;
 if (!container)
 return;
 const minDim = Math.min(container.clientWidth, container.clientHeight);
 const idealSize = Math.floor(minDim / store.gridSize * 0.8);
 cellSize.value = Math.max(5, Math.min(50, idealSize));
}
onMounted(() => {
 nextTick(() => {
 updateCellSize();
 scheduleRender();
 });
 window.addEventListener('keydown', handleKeyDown);
 window.addEventListener('keyup', handleKeyUp);
 window.addEventListener('resize', () => {
 updateCellSize();
 scheduleRender();
 });
});
onUnmounted(() => {
 if (rafId !== null) {
 cancelAnimationFrame(rafId);
 }
 window.removeEventListener('keydown', handleKeyDown);
 window.removeEventListener('keyup', handleKeyUp);
});
watch(() => store.grid, () => {
 scheduleRender();
}, { deep: true });
watch(() => store.zoom, () => {
 scheduleRender();
});
watch(() => [store.panX, store.panY], () => {
 scheduleRender();
});
watch(() => store.hoveredCell, () => {
 scheduleRender();
});
watch(() => store.theme, () => {
 scheduleRender();
});
</script>

<style scoped>
.puzzle-grid-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: var(--bg-secondary);
  background-image: 
    linear-gradient(45deg, var(--border-color) 25%, transparent 25%),
    linear-gradient(-45deg, var(--border-color) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, var(--border-color) 75%),
    linear-gradient(-45deg, transparent 75%, var(--border-color) 75%);
  background-size: 20px 20px;
  background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
  border-radius: var(--radius-md);
  cursor: crosshair;
  user-select: none;
}

.puzzle-canvas {
  position: absolute;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  will-change: transform;
  box-shadow: var(--shadow-lg);
}

.cell-info-popup {
  position: absolute;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 12px 16px;
  box-shadow: var(--shadow-lg);
  z-index: 100;
  pointer-events: none;
  animation: fade-in 0.2s ease;
  min-width: 180px;
}

.cell-info-title {
  font-weight: 600;
  font-size: 13px;
  color: var(--text-primary);
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border-color);
}

.cell-info-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  padding: 4px 0;
}

.cell-info-row .label {
  color: var(--text-secondary);
  min-width: 50px;
}

.cell-info-row .value {
  color: var(--text-primary);
  font-family: monospace;
}

.color-swatch {
  width: 16px;
  height: 16px;
  border: 1px solid var(--border-color);
  border-radius: 3px;
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
