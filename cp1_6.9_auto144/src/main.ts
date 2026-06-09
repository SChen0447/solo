import p5 from 'p5';
import { GameLogic, PotionColor, BASE_COLORS, COLOR_NAMES, RECIPES, TEST_TUBE_CAPACITY } from './gameLogic';
import { VisualEffects } from './visualEffects';

interface Dropper {
  x: number;
  y: number;
  width: number;
  height: number;
  color: PotionColor;
  hovered: boolean;
}

interface Button {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  pressed: boolean;
}

const TEST_TUBE_HEIGHT = 250;
const TEST_TUBE_WIDTH = 80;
const DROPPER_WIDTH = 60;
const DROPPER_HEIGHT = 120;

const sketch = (p: p5) => {
  let gameLogic: GameLogic;
  let visualEffects: VisualEffects;

  let droppers: Dropper[] = [];
  let testTubeX: number = 0;
  let testTubeY: number = 0;

  let synthesizeBtn: Button;
  let clearBtn: Button;

  let draggingDropper: number | null = null;
  let dragX: number = 0;
  let dragY: number = 0;

  let shakeOffset: number = 0;
  let shakeFrames: number = 0;

  let glowIntensity: number = 0;
  let glowFrames: number = 0;

  let message: string = '';
  let messageAlpha: number = 0;

  let liquidAnimProgress: number = 1;
  let isClearing: boolean = false;
  let clearStartLayer: number = 0;

  p.setup = () => {
    const canvas = p.createCanvas(p.windowWidth, p.windowHeight);
    canvas.parent('app');

    gameLogic = new GameLogic();
    visualEffects = new VisualEffects(p);

    initUI();

    p.textFont('sans-serif');
  };

  const initUI = () => {
    const centerX = p.width / 2;
    const centerY = p.height / 2;

    testTubeX = centerX + 150;
    testTubeY = centerY - TEST_TUBE_HEIGHT / 2;

    const dropperStartX = centerX - 300;
    const dropperSpacing = 100;
    droppers = BASE_COLORS.map((color, i) => ({
      x: dropperStartX + i * dropperSpacing,
      y: centerY - DROPPER_HEIGHT / 2,
      width: DROPPER_WIDTH,
      height: DROPPER_HEIGHT,
      color,
      hovered: false
    }));

    synthesizeBtn = {
      x: testTubeX - 60,
      y: testTubeY + TEST_TUBE_HEIGHT + 30,
      width: 120,
      height: 40,
      label: '合成',
      pressed: false
    };

    clearBtn = {
      x: testTubeX - 60,
      y: synthesizeBtn.y + 60,
      width: 120,
      height: 40,
      label: '清空试管',
      pressed: false
    };
  };

  p.windowResized = () => {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
    initUI();
  };

  p.draw = () => {
    drawBackground();
    updateAnimations();

    visualEffects.update();

    drawTestTube();
    drawDroppers();
    drawButtons();
    drawRecipePanel();
    drawMessage();

    if (draggingDropper !== null) {
      drawDraggingDropper();
    }

    visualEffects.render();
  };

  const drawBackground = () => {
    const gradient = p.drawingContext.createRadialGradient(
      p.width / 2, p.height / 2, 0,
      p.width / 2, p.height / 2, p.max(p.width, p.height) / 1.5
    );
    gradient.addColorStop(0, '#0f0a1a');
    gradient.addColorStop(1, '#050308');
    p.drawingContext.fillStyle = gradient;
    p.rect(0, 0, p.width, p.height);
  };

  const updateAnimations = () => {
    if (shakeFrames > 0) {
      shakeFrames--;
      shakeOffset = (Math.random() - 0.5) * 8;
      if (shakeFrames === 0) shakeOffset = 0;
    }

    if (glowFrames > 0) {
      glowFrames--;
      glowIntensity = glowFrames / 30;
    }

    if (messageAlpha > 0) {
      messageAlpha -= 2;
      if (messageAlpha < 0) messageAlpha = 0;
    }

    if (isClearing) {
      liquidAnimProgress -= 1 / 30;
      if (liquidAnimProgress <= 0) {
        liquidAnimProgress = 0;
        isClearing = false;
        clearStartLayer++;
        if (clearStartLayer >= gameLogic.getLayers().length) {
          gameLogic.clearTube();
          clearStartLayer = 0;
          liquidAnimProgress = 1;
        } else {
          liquidAnimProgress = 1;
        }
      }
    }
  };

  const drawDroppers = () => {
    for (let i = 0; i < droppers.length; i++) {
      if (draggingDropper === i) continue;
      const d = droppers[i];
      drawSingleDropper(d.x, d.y, d.color, d.hovered);
      p.fill('#b0c4de');
      p.textSize(12);
      p.textAlign(p.CENTER, p.TOP);
      p.text(COLOR_NAMES[d.color], d.x + d.width / 2, d.y + d.height + 8);
    }
  };

  const drawSingleDropper = (x: number, y: number, color: PotionColor, hovered: boolean) => {
    const scale = hovered ? 1.1 : 1.0;
    const cx = x + DROPPER_WIDTH / 2;
    const cy = y + DROPPER_HEIGHT / 2;

    p.push();
    p.translate(cx, cy);
    p.scale(scale);

    if (hovered) {
      p.drawingContext.shadowColor = color;
      p.drawingContext.shadowBlur = 20;
    }

    p.noStroke();
    p.fill(180, 200, 220, 180);
    p.rect(-15, -50, 30, 60, 5);

    p.fill(color);
    p.rect(-12, -30, 24, 35, 3);

    p.fill(150, 170, 190, 200);
    p.rect(-20, -58, 40, 12, 3);

    p.fill(180, 200, 220, 180);
    p.beginShape();
    p.vertex(-10, 10);
    p.vertex(10, 10);
    p.vertex(5, 45);
    p.vertex(-5, 45);
    p.endShape(p.CLOSE);

    p.fill(color);
    p.ellipse(0, 50, 10, 6);

    p.pop();
    p.drawingContext.shadowBlur = 0;
  };

  const drawDraggingDropper = () => {
    if (draggingDropper === null) return;
    const d = droppers[draggingDropper];
    drawSingleDropper(dragX - DROPPER_WIDTH / 2, dragY - DROPPER_HEIGHT / 2, d.color, true);
  };

  const drawTestTube = () => {
    const x = testTubeX + shakeOffset;
    const y = testTubeY;
    const w = TEST_TUBE_WIDTH;
    const h = TEST_TUBE_HEIGHT;
    const r = 20;

    if (glowIntensity > 0) {
      p.drawingContext.shadowColor = '#ffffff';
      p.drawingContext.shadowBlur = 40 * glowIntensity;
    }

    p.noStroke();
    p.fill(180, 200, 220, 50);
    p.beginShape();
    p.vertex(x, y);
    p.vertex(x + w, y);
    p.vertex(x + w, y + h - r);
    p.quadraticVertex(x + w, y + h, x + w - r, y + h);
    p.vertex(x + r, y + h);
    p.quadraticVertex(x, y + h, x, y + h - r);
    p.endShape(p.CLOSE);

    drawLiquidLayers(x, y, w, h, r);

    p.noFill();
    p.stroke(200, 220, 240, 120);
    p.strokeWeight(2);
    p.beginShape();
    p.vertex(x, y);
    p.vertex(x + w, y);
    p.vertex(x + w, y + h - r);
    p.quadraticVertex(x + w, y + h, x + w - r, y + h);
    p.vertex(x + r, y + h);
    p.quadraticVertex(x, y + h, x, y + h - r);
    p.endShape(p.CLOSE);

    p.noStroke();
    p.fill(255, 255, 255, 40);
    p.rect(x + 8, y + 10, 6, h - 30, 3);

    p.drawingContext.shadowBlur = 0;
  };

  const drawLiquidLayers = (x: number, y: number, w: number, h: number, r: number) => {
    const layers = gameLogic.getLayers();
    let currentY = y + h;

    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      const layerHeight = (layer.volume / TEST_TUBE_CAPACITY) * (h - r);
      let displayHeight = layerHeight;

      if (isClearing && i >= clearStartLayer) {
        displayHeight = layerHeight * Math.max(0, liquidAnimProgress);
      }

      if (displayHeight <= 0) continue;

      const layerY = currentY - displayHeight;

      p.noStroke();
      p.drawingContext.shadowColor = layer.color;
      p.drawingContext.shadowBlur = 10;
      p.fill(layer.color);

      if (i === layers.length - 1 || (isClearing && i === clearStartLayer)) {
        p.beginShape();
        p.vertex(x + 2, layerY);
        p.vertex(x + w - 2, layerY);
        p.vertex(x + w - 2, currentY - 2);
        if (currentY >= y + h - 2) {
          p.quadraticVertex(x + w - 2, y + h - 2, x + w - r, y + h - 2);
          p.vertex(x + r, y + h - 2);
          p.quadraticVertex(x + 2, y + h - 2, x + 2, currentY - 2);
        } else {
          p.vertex(x + 2, currentY - 2);
        }
        p.endShape(p.CLOSE);
      } else {
        p.rect(x + 2, layerY, w - 4, displayHeight);
      }

      p.drawingContext.shadowBlur = 0;

      if (i > 0 && displayHeight > 2) {
        p.stroke(255, 255, 255, 180);
        p.strokeWeight(1);
        p.line(x + 3, layerY, x + w - 3, layerY);
      }

      currentY = layerY;
    }
  };

  const drawButtons = () => {
    drawButton(synthesizeBtn);
    drawButton(clearBtn);
  };

  const drawButton = (btn: Button) => {
    p.push();
    if (btn.pressed) {
      p.translate(0, 2);
    }

    p.fill(20, 15, 35, 200);
    p.stroke('#b0c4de');
    p.strokeWeight(1.5);
    p.rect(btn.x, btn.y, btn.width, btn.height, 6);

    p.noStroke();
    p.fill('#b0c4de');
    p.textSize(14);
    p.textAlign(p.CENTER, p.CENTER);
    p.text(btn.label, btn.x + btn.width / 2, btn.y + btn.height / 2);

    p.pop();
  };

  const drawRecipePanel = () => {
    const panelX = p.width / 2 - 200;
    const panelY = p.height - 100;
    const panelW = 400;
    const panelH = 70;

    p.fill(15, 10, 25, 180);
    p.stroke('#b0c4de');
    p.strokeWeight(1);
    p.rect(panelX, panelY, panelW, panelH, 8);

    p.noStroke();
    p.fill('#b0c4de');
    p.textSize(13);
    p.textAlign(p.LEFT, p.TOP);
    p.text('配方进度', panelX + 15, panelY + 10);

    const iconSize = 28;
    const startX = panelX + 30;
    const iconY = panelY + 35;
    const spacing = 120;

    for (let i = 0; i < RECIPES.length; i++) {
      const recipe = RECIPES[i];
      const unlocked = gameLogic.isPotionUnlocked(recipe.id);
      const ix = startX + i * spacing;

      if (unlocked) {
        drawKeyIcon(ix, iconY, iconSize, recipe.glowColor);
      } else {
        drawLockIcon(ix, iconY, iconSize);
      }

      p.fill('#b0c4de');
      p.textSize(11);
      p.textAlign(p.CENTER, p.TOP);
      p.text(recipe.name, ix + iconSize / 2, iconY + iconSize + 3);
    }
  };

  const drawLockIcon = (x: number, y: number, size: number) => {
    p.stroke('#b0c4de');
    p.strokeWeight(2);
    p.noFill();

    const bodySize = size * 0.7;
    const bodyX = x + (size - bodySize) / 2;
    const bodyY = y + size * 0.35;
    p.rect(bodyX, bodyY, bodySize, size * 0.55, 3);

    p.arc(x + size / 2, y + size * 0.4, size * 0.45, size * 0.4, p.PI, 0);

    p.noStroke();
    p.fill('#b0c4de');
    p.ellipse(x + size / 2, y + size * 0.6, 3, 5);
  };

  const drawKeyIcon = (x: number, y: number, size: number, color: string) => {
    p.drawingContext.shadowColor = color;
    p.drawingContext.shadowBlur = 10;
    p.stroke(color);
    p.strokeWeight(2.5);
    p.noFill();

    p.arc(x + size * 0.3, y + size * 0.5, size * 0.35, size * 0.35, 0, p.TWO_PI);

    p.line(x + size * 0.5, y + size * 0.5, x + size * 0.95, y + size * 0.5);

    p.line(x + size * 0.75, y + size * 0.5, x + size * 0.75, y + size * 0.7);
    p.line(x + size * 0.9, y + size * 0.5, x + size * 0.9, y + size * 0.65);

    p.drawingContext.shadowBlur = 0;
  };

  const drawMessage = () => {
    if (messageAlpha <= 0) return;
    p.fill(176, 196, 222, messageAlpha);
    p.textSize(18);
    p.textAlign(p.CENTER, p.CENTER);
    p.text(message, p.width / 2, testTubeY - 40);
  };

  const showMessage = (msg: string) => {
    message = msg;
    messageAlpha = 255;
  };

  const isPointInRect = (px: number, py: number, rx: number, ry: number, rw: number, rh: number): boolean => {
    return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
  };

  const isPointInTestTube = (px: number, py: number): boolean => {
    return px >= testTubeX && px <= testTubeX + TEST_TUBE_WIDTH &&
           py >= testTubeY && py <= testTubeY + TEST_TUBE_HEIGHT + 30;
  };

  p.mousePressed = () => {
    for (let i = 0; i < droppers.length; i++) {
      const d = droppers[i];
      if (isPointInRect(p.mouseX, p.mouseY, d.x, d.y, d.width, d.height)) {
        draggingDropper = i;
        dragX = p.mouseX;
        dragY = p.mouseY;
        return;
      }
    }

    if (isPointInRect(p.mouseX, p.mouseY, synthesizeBtn.x, synthesizeBtn.y, synthesizeBtn.width, synthesizeBtn.height)) {
      synthesizeBtn.pressed = true;
    }

    if (isPointInRect(p.mouseX, p.mouseY, clearBtn.x, clearBtn.y, clearBtn.width, clearBtn.height)) {
      clearBtn.pressed = true;
    }
  };

  p.mouseDragged = () => {
    if (draggingDropper !== null) {
      dragX = p.mouseX;
      dragY = p.mouseY;
    }

    for (const d of droppers) {
      d.hovered = isPointInRect(p.mouseX, p.mouseY, d.x, d.y, d.width, d.height);
    }
  };

  p.mouseReleased = () => {
    if (draggingDropper !== null) {
      if (isPointInTestTube(dragX, dragY)) {
        const d = droppers[draggingDropper];
        const injected = gameLogic.injectLiquid(d.color);
        if (!injected) {
          showMessage('试管已满');
        }
      }
      draggingDropper = null;
    }

    if (synthesizeBtn.pressed) {
      synthesizeBtn.pressed = false;
      if (isPointInRect(p.mouseX, p.mouseY, synthesizeBtn.x, synthesizeBtn.y, synthesizeBtn.width, synthesizeBtn.height)) {
        handleSynthesize();
      }
    }

    if (clearBtn.pressed) {
      clearBtn.pressed = false;
      if (isPointInRect(p.mouseX, p.mouseY, clearBtn.x, clearBtn.y, clearBtn.width, clearBtn.height)) {
        handleClear();
      }
    }

    for (const d of droppers) {
      d.hovered = false;
    }
  };

  const handleSynthesize = () => {
    const result = gameLogic.synthesize();
    if (result.success && result.particleColors && result.glowColor) {
      glowFrames = 30;
      setTimeout(() => {
        visualEffects.triggerExplosion({
          x: testTubeX + TEST_TUBE_WIDTH / 2,
          y: testTubeY + TEST_TUBE_HEIGHT / 2,
          particleColors: result.particleColors!,
          glowColor: result.glowColor!
        });
        showMessage(`合成成功：${result.potionName}`);
        gameLogic.clearTube();
      }, 300);
    } else {
      shakeFrames = 20;
      showMessage(result.message || '配方不匹配');
    }
  };

  const handleClear = () => {
    if (gameLogic.getLayers().length > 0 && !isClearing) {
      isClearing = true;
      clearStartLayer = 0;
      liquidAnimProgress = 1;
    }
  };

  p.mouseMoved = () => {
    for (const d of droppers) {
      d.hovered = isPointInRect(p.mouseX, p.mouseY, d.x, d.y, d.width, d.height);
    }
  };
};

new p5(sketch);
