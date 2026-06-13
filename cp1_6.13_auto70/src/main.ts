import { Spider } from './spider';
import { Crystal, generateCrystals } from './crystal';
import { Terrain } from './terrain';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

let isMobile = window.innerWidth < 768;

let viewportWidth = window.innerWidth;
let viewportHeight = window.innerHeight;
let terrainWidth = 0;
let terrainHeight = 0;

let spider: Spider;
let crystals: Crystal[] = [];
let terrain: Terrain;

let cameraY = 0;
let gameStartTime = 0;
let gameTime = 0;
let gameState: 'playing' | 'gameover' | 'victory' = 'playing';

let lastTime = 0;
let fps = 60;
let fpsUpdateTimer = 0;
let frameCount = 0;
let particleReduction = false;

let collectedCrystals = 0;
let maxHeight = 0;
let gateOpened = false;

const CRYSTAL_COUNT_DESKTOP = 12;
const CRYSTAL_COUNT_MOBILE = 8;
const ROPE_COOLDOWN_DESKTOP = 5;
const ROPE_COOLDOWN_MOBILE = 4;

function resize(): void {
  viewportWidth = window.innerWidth;
  viewportHeight = window.innerHeight;
  canvas.width = viewportWidth;
  canvas.height = viewportHeight;
  
  isMobile = viewportWidth < 768;
  
  terrainWidth = Math.min(viewportWidth, 800);
  terrainHeight = isMobile ? viewportHeight * 1.5 : viewportHeight * 2;
  
  if (terrain) {
    terrain.resize(terrainWidth, terrainHeight);
  }
  
  if (spider) {
    spider.ropeCooldownTime = isMobile ? ROPE_COOLDOWN_MOBILE : ROPE_COOLDOWN_DESKTOP;
  }
  
  regenerateCrystals();
}

function regenerateCrystals(): void {
  const crystalCount = isMobile ? CRYSTAL_COUNT_MOBILE : CRYSTAL_COUNT_DESKTOP;
  crystals = generateCrystals(crystalCount, terrainWidth, terrainHeight);
}

function init(): void {
  resize();
  
  terrain = new Terrain(terrainWidth, terrainHeight);
  
  const startX = terrainWidth / 2;
  const startY = terrainHeight - 100;
  spider = new Spider(startX, startY);
  spider.ropeCooldownTime = isMobile ? ROPE_COOLDOWN_MOBILE : ROPE_COOLDOWN_DESKTOP;
  
  regenerateCrystals();
  
  gameStartTime = performance.now();
  lastTime = gameStartTime;
  
  const loadingScreen = document.getElementById('loading-screen');
  if (loadingScreen) {
    loadingScreen.classList.add('hidden');
    setTimeout(() => {
      loadingScreen.style.display = 'none';
    }, 500);
  }
  
  requestAnimationFrame(gameLoop);
}

function gameLoop(currentTime: number): void {
  const dt = Math.min((currentTime - lastTime) / 1000, 1 / 30);
  lastTime = currentTime;
  
  frameCount++;
  fpsUpdateTimer += dt;
  if (fpsUpdateTimer >= 1) {
    fps = frameCount;
    frameCount = 0;
    fpsUpdateTimer = 0;
    
    if (fps < 30 && !particleReduction) {
      particleReduction = true;
    } else if (fps >= 55 && particleReduction) {
      particleReduction = false;
    }
  }
  
  if (gameState === 'playing') {
    update(dt);
  }
  
  render();
  
  requestAnimationFrame(gameLoop);
}

function update(dt: number): void {
  gameTime += dt;
  
  spider.update(dt, terrainHeight);
  
  const targetCameraY = spider.y - viewportHeight * 0.6;
  cameraY += (targetCameraY - cameraY) * dt * 4;
  cameraY = Math.max(0, Math.min(cameraY, terrainHeight - viewportHeight));
  
  const height = terrainHeight - spider.y;
  if (height > maxHeight) {
    maxHeight = height;
  }
  
  terrain.update(dt);
  
  for (const crystal of crystals) {
    crystal.update(dt);
    
    if (!crystal.collected && !crystal.collecting) {
      const dx = spider.x - crystal.x;
      const dy = spider.y - crystal.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < crystal.getCollectRadius() + spider.bodyRadius) {
        crystal.startCollect();
        spider.collectCrystal();
        collectedCrystals++;
        
        if (collectedCrystals >= 10 && !gateOpened) {
          gateOpened = true;
          terrain.openGate();
        }
      }
    }
  }
  
  if (collectedCrystals >= 5 && !spider.jumpUnlocked) {
    spider.jumpUnlocked = true;
    spider.hasJump = true;
    spider.energyCoreActive = true;
  }
  
  if (spider.isFalling && spider.fallStartY - spider.y > spider.bodyRadius * 4) {
    if (spider.y >= terrain.getBottomY() - spider.bodyRadius - 10) {
      if (spider.takeDamage()) {
        gameOver();
      } else {
        showDamageFlash();
      }
    }
  }
  
  if (gateOpened && terrain.isAtGate(spider.y)) {
    victory();
  }
  
  if (spider.health <= 0) {
    gameOver();
  }
}

function render(): void {
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, viewportWidth, viewportHeight);
  
  const offsetX = (viewportWidth - terrainWidth) / 2;
  
  ctx.save();
  ctx.translate(offsetX, 0);
  
  terrain.draw(ctx, cameraY);
  
  for (const crystal of crystals) {
    crystal.draw(ctx, cameraY);
  }
  
  spider.draw(ctx, cameraY);
  
  ctx.restore();
  
  drawUI();
}

function drawUI(): void {
  drawRopeGauge();
  drawHealthBar();
  drawStats();
  drawJumpIndicator();
  
  if (fps < 40) {
    ctx.fillStyle = 'rgba(255, 100, 100, 0.5)';
    ctx.font = '12px monospace';
    ctx.fillText(`FPS: ${Math.round(fps)}`, viewportWidth - 70, 30);
  }
}

function drawRopeGauge(): void {
  const cx = 60;
  const cy = 60;
  const radius = 35;
  const startAngle = Math.PI * 0.75;
  const endAngle = Math.PI * 2.25;
  
  ctx.strokeStyle = 'rgba(15, 52, 96, 0.3)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, startAngle, endAngle);
  ctx.stroke();
  
  const totalRopes = spider.maxRopes;
  const angleRange = endAngle - startAngle;
  const angleStep = angleRange / totalRopes;
  
  for (let i = 0; i < totalRopes; i++) {
    const angle = startAngle + angleStep * (i + 0.5);
    const isUsed = i >= spider.ropeCount;
    
    const innerR = radius - 8;
    const outerR = radius + 8;
    
    const x1 = cx + Math.cos(angle) * innerR;
    const y1 = cy + Math.sin(angle) * innerR;
    const x2 = cx + Math.cos(angle) * outerR;
    const y2 = cy + Math.sin(angle) * outerR;
    
    if (isUsed) {
      ctx.strokeStyle = 'rgba(100, 100, 100, 0.5)';
      ctx.shadowBlur = 0;
    } else {
      ctx.strokeStyle = '#0f3460';
      ctx.shadowColor = '#0f3460';
      ctx.shadowBlur = 10;
    }
    
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  
  ctx.shadowBlur = 0;
  
  if (spider.ropeCount < spider.maxRopes && spider.ropeCooldown > 0) {
    const progress = 1 - spider.ropeCooldown / spider.ropeCooldownTime;
    
    ctx.strokeStyle = '#e94560';
    ctx.shadowColor = '#e94560';
    ctx.shadowBlur = 8;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 12, startAngle, startAngle + angleRange * progress);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
  
  ctx.fillStyle = '#0f3460';
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'center';
  ctx.shadowColor = '#0f3460';
  ctx.shadowBlur = 5;
  ctx.fillText(`${spider.ropeCount}/${spider.maxRopes}`, cx, cy + 5);
  ctx.shadowBlur = 0;
  
  ctx.fillStyle = 'rgba(15, 52, 96, 0.6)';
  ctx.font = '10px monospace';
  ctx.fillText('ROPE', cx, cy + 28);
}

function drawHealthBar(): void {
  const startX = viewportWidth - 100;
  const y = 50;
  
  ctx.fillStyle = 'rgba(15, 52, 96, 0.4)';
  ctx.font = '10px monospace';
  ctx.textAlign = 'right';
  ctx.fillText('HP', startX + 30, y - 15);
  
  for (let i = 0; i < spider.maxHealth; i++) {
    const x = startX - i * 25;
    const size = 18;
    
    if (i < spider.health) {
      ctx.fillStyle = '#e94560';
      ctx.shadowColor = '#e94560';
      ctx.shadowBlur = 10;
    } else {
      ctx.fillStyle = 'rgba(100, 100, 100, 0.3)';
      ctx.shadowBlur = 0;
    }
    
    ctx.beginPath();
    ctx.moveTo(x, y - size / 2);
    ctx.lineTo(x + size / 2, y);
    ctx.lineTo(x, y + size / 2);
    ctx.lineTo(x - size / 2, y);
    ctx.closePath();
    ctx.fill();
  }
  
  ctx.shadowBlur = 0;
}

function drawStats(): void {
  const x = 20;
  const startY = 110;
  const lineHeight = 22;
  
  ctx.fillStyle = '#0f3460';
  ctx.font = '12px monospace';
  ctx.textAlign = 'left';
  ctx.shadowColor = '#0f3460';
  ctx.shadowBlur = 5;
  
  const height = Math.floor(maxHeight / 10);
  ctx.fillText(`高度: ${height}m`, x, startY);
  ctx.fillText(`水晶: ${collectedCrystals}`, x, startY + lineHeight);
  
  const timeStr = formatTime(gameTime);
  ctx.fillText(`时间: ${timeStr}`, x, startY + lineHeight * 2);
  
  ctx.shadowBlur = 0;
  
  const crystalCount = isMobile ? CRYSTAL_COUNT_MOBILE : CRYSTAL_COUNT_DESKTOP;
  const progress = Math.min(collectedCrystals / crystalCount, 1);
  const barWidth = 100;
  const barHeight = 6;
  const barY = startY + lineHeight * 3 + 5;
  
  ctx.fillStyle = 'rgba(15, 52, 96, 0.3)';
  ctx.fillRect(x, barY, barWidth, barHeight);
  
  const gradient = ctx.createLinearGradient(x, barY, x + barWidth, barY);
  gradient.addColorStop(0, '#00ffcc');
  gradient.addColorStop(1, '#00aaff');
  ctx.fillStyle = gradient;
  ctx.shadowColor = '#00ffcc';
  ctx.shadowBlur = 8;
  ctx.fillRect(x, barY, barWidth * progress, barHeight);
  ctx.shadowBlur = 0;
}

function drawJumpIndicator(): void {
  if (!spider.jumpUnlocked) return;
  
  const x = viewportWidth / 2;
  const y = viewportHeight - 40;
  
  ctx.fillStyle = spider.hasJump ? '#ffaa00' : 'rgba(100, 100, 100, 0.5)';
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'center';
  
  if (spider.hasJump) {
    ctx.shadowColor = '#ffaa00';
    ctx.shadowBlur = 10;
  }
  
  ctx.fillText('[SPACE] 跳跃', x, y);
  ctx.shadowBlur = 0;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function showDamageFlash(): void {
  const flash = document.getElementById('damage-flash');
  if (flash) {
    flash.classList.remove('active');
    void flash.offsetWidth;
    flash.classList.add('active');
  }
}

function gameOver(): void {
  gameState = 'gameover';
  
  const panel = document.getElementById('game-over-panel');
  if (panel) {
    panel.style.display = 'block';
    
    const crystalEl = document.getElementById('final-crystals');
    if (crystalEl) crystalEl.textContent = collectedCrystals.toString();
    
    const heightEl = document.getElementById('final-height');
    if (heightEl) heightEl.textContent = Math.floor(maxHeight / 10).toString();
    
    const timeEl = document.getElementById('final-time');
    if (timeEl) timeEl.textContent = Math.floor(gameTime).toString();
  }
}

function victory(): void {
  gameState = 'victory';
  
  const panel = document.getElementById('victory-panel');
  if (panel) {
    panel.style.display = 'block';
    
    const crystalEl = document.getElementById('victory-crystals');
    if (crystalEl) crystalEl.textContent = collectedCrystals.toString();
    
    const heightEl = document.getElementById('victory-height');
    if (heightEl) heightEl.textContent = Math.floor(maxHeight / 10).toString();
    
    const timeEl = document.getElementById('victory-time');
    if (timeEl) timeEl.textContent = Math.floor(gameTime).toString();
  }
}

canvas.addEventListener('click', (e: MouseEvent) => {
  if (gameState !== 'playing') return;
  
  const rect = canvas.getBoundingClientRect();
  const clickX = e.clientX - rect.left - (viewportWidth - terrainWidth) / 2;
  const clickY = e.clientY - rect.top + cameraY;
  
  if (clickX < 0 || clickX > terrainWidth) return;
  
  if (spider.rope?.active) {
    spider.releaseRope();
  } else {
    spider.shootRope(clickX, clickY);
  }
});

canvas.addEventListener('contextmenu', (e: MouseEvent) => {
  e.preventDefault();
  if (gameState !== 'playing') return;
  spider.releaseRope();
});

document.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.code === 'Space') {
    e.preventDefault();
    if (gameState === 'playing') {
      spider.jump();
    }
  }
});

window.addEventListener('resize', resize);

window.addEventListener('load', () => {
  setTimeout(init, 500);
});
