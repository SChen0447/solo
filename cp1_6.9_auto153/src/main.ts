import p5 from 'p5';
import { Crystal } from './Crystal';
import { Matrix, Slot } from './Matrix';
import { ResonanceSystem } from './ResonanceSystem';

const CRYSTAL_COLORS = [
  '#ff3366', '#ff9933', '#ffcc33', '#33cc66',
  '#3399ff', '#9933ff', '#ff33cc', '#88ffaa',
  '#ff88aa', '#aaff88', '#88aaff', '#ffaa88'
];

const STAR_COUNT = 150;

interface Star {
  x: number;
  y: number;
  size: number;
  alpha: number;
  phase: number;
  period: number;
}

let matrix: Matrix;
let resonance: ResonanceSystem;
let reserveCrystals: Crystal[] = [];
let draggedCrystal: Crystal | null = null;
let draggedCrystalSource: 'reserve' | 'matrix' = 'reserve';
let draggedCrystalOriginalSlot: Slot | null = null;
let hoveredReserveIndex: number = -1;
let stars: Star[] = [];
let rightMouseDown: boolean = false;
let rightMousePath: { x: number; y: number }[] = [];
let lastFrameTime: number = 0;

const MATRIX_RADIUS = 250;
const RESERVE_WIDTH = 80;
const RESERVE_HEIGHT = 400;
const RESERVE_ITEM_SPACING = 55;

const sketch = (p: p5) => {
  p.setup = () => {
    const canvas = p.createCanvas(p.windowWidth, p.windowHeight);
    canvas.parent('app');
    p.frameRate(60);
    p.textFont('sans-serif');
    p.noStroke();

    initStars(p);

    const matrixAreaWidth = p.width * 0.7;
    const matrixCenterX = matrixAreaWidth / 2;
    const matrixCenterY = p.height / 2;

    matrix = new Matrix(matrixCenterX, matrixCenterY, MATRIX_RADIUS);
    resonance = new ResonanceSystem(matrix);

    initReserveCrystals(p);

    lastFrameTime = performance.now();
  };

  p.windowResized = () => {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
    const matrixAreaWidth = p.width * 0.7;
    matrix.centerX = matrixAreaWidth / 2;
    matrix.centerY = p.height / 2;

    for (let row = 0; row < matrix.gridSize; row++) {
      for (let col = 0; col < matrix.gridSize; col++) {
        const slot = matrix.slots[row][col];
        slot.x = matrix.centerX + (col - (matrix.gridSize - 1) / 2) * matrix.slotSpacing;
        slot.y = matrix.centerY + (row - (matrix.gridSize - 1) / 2) * matrix.slotSpacing;
        if (slot.crystal) {
          slot.crystal.x = slot.x;
          slot.crystal.y = slot.y;
          slot.crystal.originalX = slot.x;
          slot.crystal.originalY = slot.y;
        }
      }
    }

    initStars(p);
    initReserveCrystals(p);
  };

  p.draw = () => {
    const currentTime = performance.now();
    const deltaTime = Math.min((currentTime - lastFrameTime) / 1000, 0.05);
    lastFrameTime = currentTime;

    p.clear();
    drawBackgroundGradient(p);
    drawStars(p, currentTime);

    matrix.update(deltaTime, currentTime);
    resonance.update(deltaTime, currentTime);

    if (draggedCrystal) {
      draggedCrystal.updateDrag(p.mouseX, p.mouseY);
    }

    matrix.updateHover(p.mouseX, p.mouseY);
    updateReserveHover(p);

    matrix.draw(p);
    resonance.draw(p, currentTime);

    if (draggedCrystal) {
      draggedCrystal.draw(p);
    }

    drawReservePanel(p, currentTime);
    drawInfoPanel(p);

    if (rightMouseDown && rightMousePath.length > 1) {
      drawRightMousePath(p);
    }
  };

  p.mousePressed = (event: MouseEvent) => {
    if (event.button === 0) {
      handleLeftMousePressed(p);
    } else if (event.button === 2) {
      handleRightMousePressed(p);
    }
  };

  p.mouseDragged = (event: MouseEvent) => {
    if (event.button === 0 && draggedCrystal) {
      draggedCrystal.updateDrag(p.mouseX, p.mouseY);
    } else if (event.button === 2 && rightMouseDown) {
      rightMousePath.push({ x: p.mouseX, y: p.mouseY });
    }
  };

  p.mouseReleased = (event: MouseEvent) => {
    if (event.button === 0) {
      handleLeftMouseReleased(p);
    } else if (event.button === 2) {
      handleRightMouseReleased(p);
    }
  };

  p.mouseClicked = (event: MouseEvent) => {
    if (event.button === 0) {
      handleMouseClick(p);
    }
  };

  const initStars = (p: p5) => {
    stars = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push({
        x: Math.random() * p.width,
        y: Math.random() * p.height,
        size: 1 + Math.random(),
        alpha: 50 + Math.random() * 150,
        phase: Math.random() * Math.PI * 2,
        period: 1 + Math.random() * 3,
      });
    }
  };

  const initReserveCrystals = (p: p5) => {
    reserveCrystals = [];
    const reserveX = p.width - RESERVE_WIDTH / 2 - 10;
    const reserveStartY = 120;
    for (let i = 0; i < CRYSTAL_COLORS.length; i++) {
      const y = reserveStartY + i * RESERVE_ITEM_SPACING;
      reserveCrystals.push(new Crystal(CRYSTAL_COLORS[i], reserveX, y));
    }
  };

  const drawBackgroundGradient = (p: p5) => {
    const gradient = p.drawingContext.createRadialGradient(
      p.width / 2, p.height / 2, 0,
      p.width / 2, p.height / 2, Math.max(p.width, p.height) / 1.5
    );
    gradient.addColorStop(0, '#08041a');
    gradient.addColorStop(1, '#0f0830');
    p.drawingContext.fillStyle = gradient;
    p.rect(0, 0, p.width, p.height);
  };

  const drawStars = (p: p5, currentTime: number) => {
    p.noStroke();
    for (const star of stars) {
      const t = (currentTime / 1000) / star.period * Math.PI * 2 + star.phase;
      const flicker = 0.5 + 0.5 * Math.sin(t);
      p.fill(255, 255, 255, star.alpha * flicker);
      p.ellipse(star.x, star.y, star.size, star.size);
    }
  };

  const drawReservePanel = (p: p5, currentTime: number) => {
    const panelX = p.width - RESERVE_WIDTH - 20;
    const panelY = 100;

    p.push();
    p.noStroke();
    p.fill(10, 5, 21, 200);
    p.rect(panelX, panelY, RESERVE_WIDTH, RESERVE_HEIGHT, 8);

    p.stroke(136, 170, 255, 100);
    p.strokeWeight(1);
    p.noFill();
    p.rect(panelX, panelY, RESERVE_WIDTH, RESERVE_HEIGHT, 8);

    p.fill(200, 200, 255);
    p.noStroke();
    p.textSize(14);
    p.textAlign(p.CENTER, p.TOP);
    p.text('晶片储备', panelX + RESERVE_WIDTH / 2, panelY + 10);
    p.pop();

    for (let i = 0; i < reserveCrystals.length; i++) {
      const crystal = reserveCrystals[i];
      const isHovered = i === hoveredReserveIndex;
      const isDragging = draggedCrystal === crystal;
      if (!isDragging) {
        crystal.update(currentTime);
        crystal.drawInReserve(p, crystal.x, crystal.y, isHovered);
      }
    }
  };

  const drawInfoPanel = (p: p5) => {
    const panelX = p.width - RESERVE_WIDTH - 20;
    const panelY = 100 + RESERVE_HEIGHT + 20;
    const panelHeight = 160;

    p.push();
    p.noStroke();
    p.fill(10, 5, 21, 200);
    p.rect(panelX, panelY, RESERVE_WIDTH, panelHeight, 8);

    p.stroke(136, 170, 255, 100);
    p.strokeWeight(1);
    p.noFill();
    p.rect(panelX, panelY, RESERVE_WIDTH, panelHeight, 8);

    p.fill(200, 200, 255);
    p.textSize(14);
    p.textAlign(p.LEFT, p.TOP);
    p.text('游戏信息', panelX + 12, panelY + 10);

    p.textSize(12);
    p.fill(180, 180, 220);
    const y1 = panelY + 40;
    p.text(`脉冲次数: ${resonance.pulseCount}`, panelX + 12, y1);

    const y2 = panelY + 65;
    p.text(`已放晶片: ${matrix.getPlacedCrystalCount()}`, panelX + 12, y2);

    const y3 = panelY + 90;
    p.text(`最高效率: ${(matrix.maxEfficiency * 100).toFixed(0)}%`, panelX + 12, y3);

    const y4 = panelY + 120;
    if (resonance.canTriggerUltimate()) {
      p.fill(255, 200, 100);
      p.text('右键画圆可触发!', panelX + 12, y4);
    } else {
      p.fill(120, 120, 160);
      p.text(`终极共振: ${resonance.pulseCount}/${ResonanceSystem.ULTIMATE_THRESHOLD}`, panelX + 12, y4);
    }
    p.pop();

    const counterX = matrix.centerX + MATRIX_RADIUS - 60;
    const counterY = matrix.centerY - MATRIX_RADIUS + 10;
    p.push();
    p.noStroke();
    p.fill(255, 200, 100, 220);
    p.textSize(14);
    p.textAlign(p.RIGHT, p.TOP);
    p.text(`脉冲: ${resonance.pulseCount}`, counterX, counterY);
    p.pop();
  };

  const drawRightMousePath = (p: p5) => {
    p.push();
    p.noFill();
    p.stroke(255, 200, 100, 150);
    p.strokeWeight(2);
    p.beginShape();
    for (const pt of rightMousePath) {
      p.vertex(pt.x, pt.y);
    }
    p.endShape();
    p.pop();
  };

  const updateReserveHover = (p: p5) => {
    hoveredReserveIndex = -1;
    if (draggedCrystal) return;
    for (let i = 0; i < reserveCrystals.length; i++) {
      if (reserveCrystals[i].isInside(p.mouseX, p.mouseY)) {
        hoveredReserveIndex = i;
        break;
      }
    }
  };

  const isInReserveArea = (x: number, y: number): boolean => {
    const panelX = p.width - RESERVE_WIDTH - 20;
    const panelY = 100;
    return x >= panelX && x <= panelX + RESERVE_WIDTH &&
           y >= panelY && y <= panelY + RESERVE_HEIGHT;
  };

  const handleLeftMousePressed = (p: p5) => {
    const matrixCrystal = matrix.getCrystalAt(p.mouseX, p.mouseY);
    if (matrixCrystal) {
      draggedCrystal = matrixCrystal;
      draggedCrystalSource = 'matrix';
      for (let row = 0; row < matrix.gridSize; row++) {
        for (let col = 0; col < matrix.gridSize; col++) {
          if (matrix.slots[row][col].crystal === matrixCrystal) {
            draggedCrystalOriginalSlot = matrix.slots[row][col];
            matrix.slots[row][col].crystal = null;
            break;
          }
        }
      }
      matrix.updateConnections();
      draggedCrystal.startDrag(p.mouseX, p.mouseY);
      return;
    }

    if (hoveredReserveIndex >= 0) {
      const original = reserveCrystals[hoveredReserveIndex];
      const clone = original.clone();
      clone.x = original.x;
      clone.y = original.y;
      clone.originalX = original.x;
      clone.originalY = original.y;
      draggedCrystal = clone;
      draggedCrystalSource = 'reserve';
      draggedCrystalOriginalSlot = null;
      draggedCrystal.startDrag(p.mouseX, p.mouseY);
    }
  };

  const handleLeftMouseReleased = (p: p5) => {
    if (!draggedCrystal) return;

    const slot = matrix.getSlotAt(p.mouseX, p.mouseY);
    if (slot && !slot.crystal && matrix.isInsideMatrix(p.mouseX, p.mouseY)) {
      matrix.placeCrystal(draggedCrystal, slot);
    } else {
      if (draggedCrystalSource === 'matrix' && draggedCrystalOriginalSlot) {
        if (!draggedCrystalOriginalSlot.crystal) {
          matrix.placeCrystal(draggedCrystal, draggedCrystalOriginalSlot);
        } else {
          draggedCrystal.startReturnAnimation(draggedCrystalOriginalSlot.x, draggedCrystalOriginalSlot.y);
        }
      } else {
        draggedCrystal.startReturnAnimation(draggedCrystal.originalX, draggedCrystal.originalY);
      }
    }

    draggedCrystal.endDrag(draggedCrystal.x, draggedCrystal.y);
    draggedCrystal = null;
    draggedCrystalOriginalSlot = null;
  };

  const handleMouseClick = (p: p5) => {
    if (draggedCrystal) return;
    const crystal = matrix.getCrystalAt(p.mouseX, p.mouseY);
    if (crystal) {
      crystal.rotate();
      setTimeout(() => {
        matrix.updateConnections();
      }, Crystal.ROTATION_DURATION + 10);
    }
  };

  const handleRightMousePressed = (p: p5) => {
    rightMouseDown = true;
    rightMousePath = [{ x: p.mouseX, y: p.mouseY }];
  };

  const handleRightMouseReleased = (p: p5) => {
    rightMouseDown = false;
    if (resonance.isCircleGesture(rightMousePath)) {
      resonance.triggerUltimateResonance(performance.now());
    }
    rightMousePath = [];
  };

  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });
};

new p5(sketch);
