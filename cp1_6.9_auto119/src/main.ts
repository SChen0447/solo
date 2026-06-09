import p5 from 'p5';
import { Branch } from './branch';
import { ColorManager } from './colorManager';

const MAX_WIDTH = 1200;
const ASPECT_RATIO = 16 / 9;
const HINT_INTERVAL = 10000;
const PULSE_PERIOD = 500;
const FLASH_DURATION = 200;

let branches: Branch[] = [];
let currentBranch: Branch | null = null;
let colorManager: ColorManager;
let isResetting = false;
let resetStartTime = 0;
let hintVisible = true;
let lastHintToggle = 0;
let lastFlashTime = 0;
let canvasWidth = 0;
let canvasHeight = 0;
let resetButton: { x: number; y: number; w: number; h: number; hovered: boolean; pressed: boolean } | null = null;

const sketch = (p: p5) => {
  colorManager = new ColorManager();

  p.setup = () => {
    updateCanvasSize(p);
    const canvas = p.createCanvas(canvasWidth, canvasHeight);
    canvas.parent('app');
    p.frameRate(60);
    lastHintToggle = p.millis();
  };

  p.windowResized = () => {
    updateCanvasSize(p);
    p.resizeCanvas(canvasWidth, canvasHeight);
  };

  p.draw = () => {
    if (isResetting) {
      const elapsed = p.millis() - resetStartTime;
      if (elapsed >= 1000) {
        branches = [];
        isResetting = false;
        Branch.clearAlphaCache();
      }
    }

    const now = p.millis();
    if (now - lastHintToggle >= HINT_INTERVAL) {
      hintVisible = !hintVisible;
      lastHintToggle = now;
    }

    p.background(0, 0, 0);

    p.push();
    p.noFill();
    p.stroke(51, 51, 51);
    p.strokeWeight(2);
    p.rect(1, 1, p.width - 2, p.height - 2);
    p.pop();

    for (const branch of branches) {
      branch.update();
      branch.draw();
    }

    if (currentBranch) {
      currentBranch.update();
      currentBranch.draw();
    }

    if (isResetting) {
      branches = branches.filter(b => !b.isFullyFaded());
    }

    drawEnergyRing(p);

    if (now - lastFlashTime < FLASH_DURATION) {
      const t = (now - lastFlashTime) / FLASH_DURATION;
      const brightness = 0.1 * (1 - Math.abs(t * 2 - 1));
      p.noStroke();
      p.fill(255, 255, 255, Math.floor(brightness * 255));
      p.rect(0, 0, p.width, p.height);
    }

    drawControlPanel(p);
    drawHint(p);
  };

  p.mousePressed = () => {
    if (!isInCanvas(p)) return;
    if (resetButton && isPointInRect(p.mouseX, p.mouseY, resetButton)) {
      resetButton.pressed = true;
      resetBranches(p);
      return;
    }
    if (p.mouseButton === p.LEFT && !isResetting) {
      currentBranch = new Branch(p, colorManager, p.mouseX, p.mouseY);
      currentBranch.extendTo(p.mouseX, p.mouseY);
    }
  };

  p.mouseDragged = () => {
    if (currentBranch && !isResetting) {
      currentBranch.extendTo(p.mouseX, p.mouseY);
    }
  };

  p.mouseReleased = () => {
    if (resetButton) {
      resetButton.pressed = false;
    }
    if (currentBranch) {
      currentBranch.complete();
      branches.push(currentBranch);
      checkPulseAndFlash(p);
      currentBranch = null;
    }
  };

  p.mouseMoved = () => {
    if (resetButton) {
      resetButton.hovered = isPointInRect(p.mouseX, p.mouseY, resetButton);
    }
  };

  p.keyPressed = () => {
    if (p.keyCode === 32) {
      resetBranches(p);
      return false;
    }
  };

  function updateCanvasSize(p: p5): void {
    const maxW = Math.min(window.innerWidth - 40, MAX_WIDTH);
    canvasWidth = maxW;
    canvasHeight = maxW / ASPECT_RATIO;
    if (canvasHeight > window.innerHeight - 40) {
      canvasHeight = window.innerHeight - 40;
      canvasWidth = canvasHeight * ASPECT_RATIO;
    }
  }

  function isInCanvas(p: p5): boolean {
    return p.mouseX >= 0 && p.mouseX <= p.width && p.mouseY >= 0 && p.mouseY <= p.height;
  }

  function isPointInRect(px: number, py: number, rect: { x: number; y: number; w: number; h: number }): boolean {
    return px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h;
  }

  function getTotalBranchCount(): number {
    let total = 0;
    for (const branch of branches) {
      total += branch.getBranchCount();
    }
    return total;
  }

  function getMaxDepth(): number {
    let max = 0;
    for (const branch of branches) {
      max = Math.max(max, branch.getMaxDepth());
    }
    return max;
  }

  function checkPulseAndFlash(p: p5): void {
    const count = getTotalBranchCount();
    if (count > 50) {
      lastFlashTime = p.millis();
    }
  }

  function drawEnergyRing(p: p5): void {
    const cx = p.width / 2;
    const cy = p.height / 2;
    const baseDiameter = 100;
    let scale = 1;

    const count = getTotalBranchCount();
    if (count > 50) {
      const t = (p.millis() % PULSE_PERIOD) / PULSE_PERIOD;
      scale = 1 + 0.05 * Math.sin(t * Math.PI * 2) + 0.05;
    }

    const diameter = baseDiameter * scale;
    const currentColor = colorManager.getCurrentColor();

    p.push();
    p.noFill();
    p.stroke(currentColor.r, currentColor.g, currentColor.b, 180);
    p.strokeWeight(2);
    p.ellipse(cx, cy, diameter, diameter);

    p.fill(255, 255, 255, 200);
    p.textAlign(p.CENTER, p.CENTER);
    p.textSize(14);
    p.text(`分支: ${count}`, cx, cy - 10);
    p.text(`深度: ${getMaxDepth()}`, cx, cy + 10);
    p.pop();
  }

  function drawControlPanel(p: p5): void {
    const panelX = 20;
    const panelY = 20;
    const panelW = 180;
    const panelH = 120;
    const btnW = 80;
    const btnH = 32;
    const btnX = panelX + 20;
    const btnY = panelY + 20;

    resetButton = { x: btnX, y: btnY, w: btnW, h: btnH, hovered: resetButton?.hovered ?? false, pressed: resetButton?.pressed ?? false };

    p.push();
    p.noStroke();
    p.fill(26, 26, 26, 178);
    p.rect(panelX, panelY, panelW, panelH, 8);

    const btnColor = resetButton.hovered ? '#ff5588' : '#ff3366';
    const btnScale = resetButton.pressed ? 0.95 : 1;
    const scaledW = btnW * btnScale;
    const scaledH = btnH * btnScale;
    const scaledX = btnX + (btnW - scaledW) / 2;
    const scaledY = btnY + (btnH - scaledH) / 2;

    p.fill(btnColor);
    p.rect(scaledX, scaledY, scaledW, scaledH, 4);

    p.fill(255, 255, 255);
    p.textAlign(p.CENTER, p.CENTER);
    p.textSize(14);
    p.text('重置', btnX + btnW / 2, btnY + btnH / 2);

    p.fill(255, 255, 255, 220);
    p.textAlign(p.LEFT, p.TOP);
    p.textSize(13);
    p.text(`分支数量: ${getTotalBranchCount()}`, panelX + 20, panelY + 65);
    p.text(`最大深度: ${getMaxDepth()}`, panelX + 20, panelY + 88);
    p.pop();
  }

  function drawHint(p: p5): void {
    if (!hintVisible) return;
    const now = p.millis();
    const timeSinceToggle = now - lastHintToggle;
    let alpha = 1;
    const fadeTime = 500;
    if (timeSinceToggle < fadeTime) {
      alpha = timeSinceToggle / fadeTime;
    } else if (timeSinceToggle > HINT_INTERVAL - fadeTime) {
      alpha = (HINT_INTERVAL - timeSinceToggle) / fadeTime;
    }
    alpha = Math.max(0, Math.min(1, alpha));

    p.push();
    p.fill(136, 136, 136, Math.floor(alpha * 255));
    p.textAlign(p.RIGHT, p.BOTTOM);
    p.textSize(14);
    p.text('按住鼠标拖拽绘制光幕 | 空格重置', p.width - 20, p.height - 20);
    p.pop();
  }

  function resetBranches(p: p5): void {
    if (isResetting || branches.length === 0) return;
    isResetting = true;
    resetStartTime = p.millis();
    for (const branch of branches) {
      branch.startFade();
    }
    colorManager.reset();
  }
};

new p5(sketch);
