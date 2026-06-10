import { Renderer } from './renderer';
import { Asteroid, Ore } from './asteroid';
import { Player, Bullet } from './player';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

let audioCtx: AudioContext | null = null;

function initAudio(): void {
  try {
    audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  } catch (_e) {
    audioCtx = null;
  }
}

function playBeep(freq: number, duration: number, volume = 0.1): void {
  if (!audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;
    gain.gain.value = volume;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration / 1000);
    osc.stop(audioCtx.currentTime + duration / 1000);
  } catch (_e) {
  }
}

let width = window.innerWidth;
let height = window.innerHeight;

function resizeCanvas(): void {
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width;
  canvas.height = height;
  if (renderer) {
    renderer.resize(width, height);
  }
  if (player && !player.isDead) {
    player.y = height - 60;
    if (player.x > width - 16) player.x = width - 16;
    if (player.x < 16) player.x = 16;
  }
}

window.addEventListener('resize', resizeCanvas);
canvas.width = width;
canvas.height = height;

let renderer: Renderer = new Renderer(ctx, width, height);
let player: Player = new Player(width, height);
let asteroids: Asteroid[] = [];
let bullets: Bullet[] = [];
let ores: Ore[] = [];
let oreCount = 0;
let asteroidSpawnTimer = 0;
let triggeredUpgrades: Set<number> = new Set();
let mouseX: number | null = null;
let keys: Record<string, boolean> = {};
let spacePressed = false;

window.addEventListener('keydown', (e) => {
  keys[e.key.toLowerCase()] = true;
  if (e.key === ' ' || e.code === 'Space') {
    spacePressed = true;
    e.preventDefault();
  }
  if (!audioCtx) initAudio();
});

window.addEventListener('keyup', (e) => {
  keys[e.key.toLowerCase()] = false;
  if (e.key === ' ' || e.code === 'Space') {
    spacePressed = false;
  }
});

canvas.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  if (!audioCtx) initAudio();
});

canvas.addEventListener('mouseleave', () => {
  mouseX = null;
});

canvas.addEventListener('mousedown', () => {
  spacePressed = true;
  if (!audioCtx) initAudio();
});

canvas.addEventListener('mouseup', () => {
  spacePressed = false;
});

canvas.addEventListener('touchmove', (e) => {
  if (e.touches.length > 0) {
    mouseX = e.touches[0].clientX;
  }
  e.preventDefault();
});

canvas.addEventListener('touchstart', (e) => {
  if (e.touches.length > 0) {
    mouseX = e.touches[0].clientX;
  }
  spacePressed = true;
  if (!audioCtx) initAudio();
  e.preventDefault();
});

canvas.addEventListener('touchend', () => {
  spacePressed = false;
});

function checkCircleCollision(
  x1: number,
  y1: number,
  r1: number,
  x2: number,
  y2: number,
  r2: number
): boolean {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return dx * dx + dy * dy < (r1 + r2) * (r1 + r2);
}

function getCurrentAsteroidSpeed(): number {
  const tiers = Math.floor(oreCount / 10);
  return Math.min(2 + tiers * 0.3, 8);
}

function getCurrentSpawnInterval(): number {
  const tiers = Math.floor(oreCount / 10);
  return Math.max(60 - tiers * 5, 20);
}

function checkUpgrade(): void {
  const upgrades: Array<{ threshold: number; type: 'weapon' | 'shield' }> = [
    { threshold: 10, type: 'weapon' },
    { threshold: 30, type: 'shield' },
    { threshold: 60, type: 'weapon' },
  ];
  for (const up of upgrades) {
    if (oreCount >= up.threshold && !triggeredUpgrades.has(up.threshold)) {
      triggeredUpgrades.add(up.threshold);
      if (up.type === 'weapon') {
        player.upgradeWeapon();
        renderer.addUpgradeText('武器升级');
        playBeep(880, 300, 0.15);
      } else {
        player.upgradeShield();
        renderer.addUpgradeText('护盾升级');
        playBeep(660, 300, 0.15);
      }
    }
  }
}

function resetGame(): void {
  player = new Player(width, height);
  asteroids = [];
  bullets = [];
  ores = [];
  oreCount = 0;
  asteroidSpawnTimer = 0;
  triggeredUpgrades = new Set();
  renderer = new Renderer(ctx, width, height);
}

let lastTime = 0;

function gameLoop(time: number): void {
  const _dt = time - lastTime;
  lastTime = time;

  renderer.drawBackground(time);

  if (!player.isDead) {
    if (keys['a'] || keys['arrowleft']) {
      player.moveLeft();
    }
    if (keys['d'] || keys['arrowright']) {
      player.moveRight(width);
    }
    if (mouseX !== null) {
      player.moveTo(mouseX, width);
    }

    if (spacePressed) {
      player.tryShoot(bullets);
    }

    asteroidSpawnTimer++;
    if (asteroidSpawnTimer >= getCurrentSpawnInterval()) {
      asteroids.push(Asteroid.generate(width, getCurrentAsteroidSpeed()));
      asteroidSpawnTimer = 0;
    }

    for (let i = asteroids.length - 1; i >= 0; i--) {
      const a = asteroids[i];
      const offscreen = a.update(height);
      if (offscreen) {
        asteroids.splice(i, 1);
      }
    }

    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.y += b.vy;
      if (b.y < -20) {
        bullets.splice(i, 1);
      }
    }

    for (let i = ores.length - 1; i >= 0; i--) {
      const o = ores[i];
      o.y += o.vy;
      if (o.y > height + 20) {
        ores.splice(i, 1);
      }
    }

    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      const bulletW = player.weaponUpgraded ? 8 : 4;
      let bulletHit = false;
      for (let j = asteroids.length - 1; j >= 0; j--) {
        const a = asteroids[j];
        if (checkCircleCollision(b.x, b.y, bulletW / 2, a.x, a.y, a.radius)) {
          a.hit();
          renderer.addShockWave(b.x, b.y);
          bulletHit = true;
          if (!a.isFragment && a.radius > 12) {
            const frags = a.split(getCurrentAsteroidSpeed());
            const dropped = a.dropOre();
            asteroids.splice(j, 1);
            for (const f of frags) asteroids.push(f);
            for (const o of dropped) ores.push(o);
            playBeep(220, 100, 0.12);
          } else if (a.isFragment) {
            const dropped = a.dropOre();
            asteroids.splice(j, 1);
            for (const o of dropped) ores.push(o);
            playBeep(330, 80, 0.1);
          } else {
            asteroids.splice(j, 1);
            playBeep(220, 100, 0.12);
          }
          break;
        }
      }
      if (bulletHit) {
        bullets.splice(i, 1);
      }
    }

    for (let i = ores.length - 1; i >= 0; i--) {
      const o = ores[i];
      if (checkCircleCollision(o.x, o.y, 6, player.x, player.y, 18)) {
        ores.splice(i, 1);
        oreCount++;
        renderer.triggerOrePulse();
        checkUpgrade();
        playBeep(1200, 60, 0.08);
      }
    }

    for (let i = asteroids.length - 1; i >= 0; i--) {
      const a = asteroids[i];
      if (checkCircleCollision(a.x, a.y, a.radius, player.x, player.y, 14)) {
        if (player.hasShield) {
          player.consumeShield();
          renderer.triggerFlash();
          asteroids.splice(i, 1);
          playBeep(150, 300, 0.15);
        } else {
          player.die();
          renderer.spawnExplosion(player.x, player.y);
          playBeep(80, 500, 0.2);
          break;
        }
      }
    }

    player.updateShieldBlink();
  } else {
    if (player.updateDeath()) {
      window.location.reload();
      return;
    }
  }

  for (const a of asteroids) {
    renderer.drawAsteroid(a.x, a.y, a.radius, a.getRotatedVertices(), a.flashTime);
  }

  for (const o of ores) {
    renderer.drawOre(o.x, o.y);
  }

  for (const b of bullets) {
    renderer.drawBullet(b.x, b.y, player.weaponUpgraded);
    renderer.drawBulletTrail(b.x, b.y, player.weaponUpgraded);
  }

  if (!player.isDead) {
    renderer.drawPlayer(player.x, player.y, player.hasShield, player.shieldBlink);
  }

  renderer.drawOreCounter(oreCount);
  renderer.updateAndDrawEffects();

  requestAnimationFrame(gameLoop);
}

resizeCanvas();
initAudio();
requestAnimationFrame(gameLoop);
