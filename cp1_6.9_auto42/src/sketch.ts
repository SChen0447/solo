import p5 from 'p5';
import { Raindrop } from './raindrop';
import { LightPool } from './lightpool';

interface Star {
  x: number;
  y: number;
  size: number;
  color: p5.Color;
  twinkleSpeed: number;
  phase: number;
}

interface ColorPalette {
  name: string;
  colors: string[];
}

const PALETTES: ColorPalette[] = [
  { name: '经典霓虹', colors: ['#ff0066', '#00ffcc', '#ffaa00', '#aa00ff', '#00ccff'] },
  { name: '赛博朋克', colors: ['#ff0066', '#ff3366', '#00ffff', '#ff00ff', '#ffff00'] },
  { name: '极光之夜', colors: ['#00ff88', '#00ccff', '#8800ff', '#00ffaa', '#4400ff'] },
  { name: '落日余晖', colors: ['#ff4400', '#ff8800', '#ffcc00', '#ff0044', '#ff6688'] },
  { name: '深海幽蓝', colors: ['#0088ff', '#0044ff', '#00ccaa', '#0066cc', '#4400ff'] }
];

const MAX_RAINDROPS = 200;
const MAX_LIGHTPOOLS = 15;
const STAR_COUNT = 150;

const sketch = (p: p5) => {
  let raindrops: Raindrop[] = [];
  let lightPools: LightPool[] = [];
  let stars: Star[] = [];

  let lastRaindropTime = 0;
  let raindropInterval = 75;
  let minInterval = 50;
  let maxInterval = 100;

  let lastFrameTime = 0;
  let fps = 60;
  let fpsSmooth = 60;

  let showPanel = true;
  let currentPaletteIndex = 0;
  let paletteNoticeTime = 0;
  const PALETTE_NOTICE_DURATION = 0.5;

  let lightningActive = false;
  let lightningTime = 0;
  const LIGHTNING_FLASH_DURATION = 0.1;
  const LIGHTNING_HIGHLIGHT_DURATION = 0.3;

  p.setup = () => {
    p.createCanvas(p.windowWidth, p.windowHeight);
    initStars();
    lastFrameTime = p.millis();
  };

  p.windowResized = () => {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
  };

  p.draw = () => {
    const now = p.millis();
    const dt = Math.min(0.05, (now - lastFrameTime) / 1000);
    lastFrameTime = now;

    fps = 1 / Math.max(dt, 0.001);
    fpsSmooth = fpsSmooth * 0.95 + fps * 0.05;

    updateRaindropInterval();
    drawBackground();
    drawStars(dt);

    spawnRaindrops(now);
    updateAndDrawRaindrops(dt);
    updateAndDrawLightPools(dt);
    handleRaindropPoolCollision();
    drawLightning(dt);
    drawPaletteNotice(dt);

    if (showPanel) {
      drawInfoPanel();
    }
  };

  p.mousePressed = () => {
    if (p.mouseButton === p.LEFT) {
      spawnLightPool(p.mouseX, p.mouseY);
    }
  };

  p.keyPressed = () => {
    if (p.key === ' ') {
      triggerLightning();
      return false;
    }
    if (p.key === 'h' || p.key === 'H') {
      showPanel = !showPanel;
    }
    if (p.key >= '1' && p.key <= '5') {
      const idx = parseInt(p.key) - 1;
      if (idx >= 0 && idx < PALETTES.length) {
        currentPaletteIndex = idx;
        paletteNoticeTime = PALETTE_NOTICE_DURATION;
      }
    }
  };

  function initStars() {
    stars = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      const col = p.lerpColor(p.color('#ffffff'), p.color('#aabbff'), p.random(0, 1));
      stars.push({
        x: p.random(0, p.width),
        y: p.random(0, p.height * 0.7),
        size: p.random(1, 3),
        color: col,
        twinkleSpeed: p.random(0.5, 1.5),
        phase: p.random(0, p.TWO_PI)
      });
    }
  }

  function drawBackground() {
    const gradient = p.drawingContext.createLinearGradient(0, 0, 0, p.height);
    gradient.addColorStop(0, '#0a0a2e');
    gradient.addColorStop(1, '#000005');
    p.drawingContext.fillStyle = gradient;
    p.rect(0, 0, p.width, p.height);
  }

  function drawStars(dt: number) {
    p.noStroke();
    for (const star of stars) {
      star.phase += dt * star.twinkleSpeed * p.TWO_PI;
      const twinkle = (p.sin(star.phase) + 1) / 2;
      const alpha = p.lerp(0.5, 1, twinkle);
      const r = p.red(star.color);
      const g = p.green(star.color);
      const b = p.blue(star.color);
      p.fill(r, g, b, alpha * 255);
      p.ellipse(star.x, star.y, star.size, star.size);
    }
    p.noStroke();
  }

  function updateRaindropInterval() {
    if (fpsSmooth < 45) {
      minInterval = 150;
      maxInterval = 200;
    } else {
      minInterval = 50;
      maxInterval = 100;
    }
  }

  function spawnRaindrops(now: number) {
    if (now - lastRaindropTime >= raindropInterval && raindrops.length < MAX_RAINDROPS) {
      raindrops.push(new Raindrop(p, p.width));
      lastRaindropTime = now;
      raindropInterval = p.random(minInterval, maxInterval);
    }
    while (raindrops.length > MAX_RAINDROPS) {
      raindrops.shift();
    }
  }

  function updateAndDrawRaindrops(dt: number) {
    const toRemove: number[] = [];
    for (let i = 0; i < raindrops.length; i++) {
      const drop = raindrops[i];
      const off = drop.update(dt, p.height);
      if (off) {
        toRemove.push(i);
      } else {
        drop.draw(p);
      }
    }
    for (let i = toRemove.length - 1; i >= 0; i--) {
      raindrops.splice(toRemove[i], 1);
    }
  }

  function spawnLightPool(x: number, y: number) {
    const palette = PALETTES[currentPaletteIndex].colors;
    const hex = palette[Math.floor(p.random(0, palette.length))];
    const col = p.color(hex);
    lightPools.push(new LightPool(p, x, y, col));
    while (lightPools.length > MAX_LIGHTPOOLS) {
      lightPools.shift();
    }
  }

  function updateAndDrawLightPools(dt: number) {
    const toRemove: number[] = [];
    for (let i = 0; i < lightPools.length; i++) {
      const pool = lightPools[i];
      pool.update(dt);
      if (pool.isDead()) {
        toRemove.push(i);
      } else {
        pool.draw(p);
      }
    }
    for (let i = toRemove.length - 1; i >= 0; i--) {
      lightPools.splice(toRemove[i], 1);
    }
  }

  function handleRaindropPoolCollision() {
    if (lightPools.length === 0) {
      for (const drop of raindrops) {
        drop.resetToDefault();
      }
      return;
    }

    for (const drop of raindrops) {
      let matchedPool: LightPool | null = null;
      let minDist = Infinity;
      for (const pool of lightPools) {
        if (pool.containsPoint(drop.x, drop.y)) {
          const d = p.dist(drop.x, drop.y, pool.x, pool.y);
          if (d < minDist) {
            minDist = d;
            matchedPool = pool;
          }
        }
      }
      if (matchedPool) {
        drop.setTargetColor(matchedPool.getColor());
      } else {
        drop.resetToDefault();
      }
    }
  }

  function triggerLightning() {
    lightningActive = true;
    lightningTime = 0;
    for (const drop of raindrops) {
      drop.setHighlight(true);
    }
    for (const pool of lightPools) {
      pool.setHighlight(true);
    }
  }

  function drawLightning(dt: number) {
    if (!lightningActive) return;

    lightningTime += dt;

    if (lightningTime <= LIGHTNING_FLASH_DURATION) {
      const alpha = p.lerp(0.8, 0, lightningTime / LIGHTNING_FLASH_DURATION);
      p.fill(255, 255, 255, alpha * 255);
      p.rect(0, 0, p.width, p.height);
      p.noFill();
    }

    if (lightningTime >= LIGHTNING_HIGHLIGHT_DURATION) {
      lightningActive = false;
      for (const drop of raindrops) {
        drop.setHighlight(false);
      }
      for (const pool of lightPools) {
        pool.setHighlight(false);
      }
    }
  }

  function drawPaletteNotice(dt: number) {
    if (paletteNoticeTime <= 0) return;

    paletteNoticeTime = Math.max(0, paletteNoticeTime - dt);
    const alpha = Math.min(1, paletteNoticeTime / 0.2);

    const noticeText = `色板 ${currentPaletteIndex + 1}: ${PALETTES[currentPaletteIndex].name}`;
    p.textSize(16);
    p.textAlign(p.CENTER, p.TOP);
    p.fill(17, 17, 34, alpha * 180);
    const textW = p.textWidth(noticeText) + 32;
    p.rect(p.width / 2 - textW / 2, 20, textW, 36, 8);
    p.fill(204, 204, 204, alpha * 255);
    p.text(noticeText, p.width / 2, 29);
    p.textAlign(p.LEFT, p.BASELINE);
  }

  function drawInfoPanel() {
    const panelX = p.width - 160;
    const panelY = 16;
    const panelW = 144;
    const panelH = 84;

    p.noStroke();
    p.fill(17, 17, 34, 180);
    p.rect(panelX, panelY, panelW, panelH, 8);

    p.fill(204, 204, 204);
    p.textSize(12);
    p.textAlign(p.LEFT, p.TOP);
    p.text(`雨滴: ${raindrops.length}`, panelX + 12, panelY + 12);
    p.text(`水洼: ${lightPools.length}`, panelX + 12, panelY + 32);
    p.text(`FPS: ${Math.round(fpsSmooth)}`, panelX + 12, panelY + 52);
    p.textAlign(p.LEFT, p.BASELINE);
    p.noFill();
  }
};

new p5(sketch);
