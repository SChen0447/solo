import { SpaceShip, LightSpot, Star, Ring } from './entities';
import { ParticleManager } from './effects';
import * as Tone from 'tone';
import gsap from 'gsap';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const timerEl = document.getElementById('timer')!;
const scoreEl = document.getElementById('score')!;
const comboEl = document.getElementById('combo')!;
const gameOverEl = document.getElementById('gameOver')!;
const finalScoreEl = document.getElementById('finalScore')!;
const maxComboEl = document.getElementById('maxCombo')!;
const restartBtn = document.getElementById('restartBtn')!;

let width = 0;
let height = 0;

let ship: SpaceShip;
let spots: LightSpot[] = [];
let stars: Star[] = [];
let rings: Ring[] = [];
let particles: ParticleManager;

let score = 0;
let combo = 0;
let maxCombo = 0;
let lastSpotTime = 0;
let spotSpawnTimer = 0;
const COMBO_TIMEOUT = 3;
const SPOT_SPAWN_MIN = 2;
const SPOT_SPAWN_MAX = 4;
const MAX_SPOTS = 5;

const GAME_DURATION = 60;
let timeLeft = GAME_DURATION;
let gameRunning = true;
let gameOver = false;

let mouseX = 0;
let mouseY = 0;

let synth: Tone.Synth | null = null;

let lastTime = 0;
let animationId: number;

const ringAbsorbed = new Set<number>();

function resize() {
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width;
  canvas.height = height;
}

function initStars() {
  stars = [];
  for (let i = 0; i < 150; i++) {
    stars.push(new Star(width, height));
  }
}

function initRings() {
  rings = [];
  for (let i = 0; i < 8; i++) {
    rings.push(new Ring(width, height));
  }
}

function initAudio() {
  if (!synth) {
    synth = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.01, decay: 0.3, sustain: 0, release: 0.1 }
    }).toDestination();
    synth.volume.value = -8;
  }
}

function playCollectSound() {
  if (!synth) return;
  const notes = [261.63, 293.66, 329.63];
  const note = notes[Math.floor(Math.random() * notes.length)];
  synth.triggerAttackRelease(note, '16n');
}

function playShieldSound() {
  if (!synth) return;
  synth.triggerAttackRelease(523.25, '8n');
}

function getComboMultiplier(comboCount: number): number {
  if (comboCount >= 5) return 3;
  if (comboCount >= 3) return 2;
  if (comboCount >= 2) return 1.5;
  return 1;
}

function updateScoreDisplay() {
  scoreEl.textContent = Math.floor(score).toString();
  gsap.to(scoreEl, {
    scale: 1.2,
    duration: 0.15,
    ease: 'power2.out',
    yoyo: true,
    repeat: 1
  });
}

function updateComboDisplay() {
  if (combo > 1) {
    comboEl.textContent = `x${combo} 连击`;
    comboEl.classList.add('visible');
    gsap.to(comboEl, {
      scale: 1.5,
      duration: 0.15,
      ease: 'power2.out',
      yoyo: true,
      repeat: 1
    });
  } else {
    comboEl.classList.remove('visible');
  }
}

function spawnSpot() {
  if (spots.length < MAX_SPOTS) {
    spots.push(new LightSpot(width, height));
  }
}

function checkCollisions() {
  const shipRadius = ship.getRadius();

  for (let i = spots.length - 1; i >= 0; i--) {
    const spot = spots[i];
    const dx = ship.x - spot.x;
    const dy = ship.y - spot.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const collisionDist = shipRadius + spot.getRadius();

    if (distance < collisionDist) {
      spots.splice(i, 1);
      particles.addBurst(spot.x, spot.y, spot.color);
      ship.flash();

      const now = performance.now() / 1000;
      if (now - lastSpotTime < COMBO_TIMEOUT) {
        combo++;
      } else {
        combo = 1;
      }
      lastSpotTime = now;

      if (combo > maxCombo) {
        maxCombo = combo;
      }

      const multiplier = getComboMultiplier(combo);
      const points = Math.floor(10 * multiplier);
      score += points;

      if (combo === 5) {
        ship.activateShield();
        playShieldSound();
      }

      playCollectSound();
      updateScoreDisplay();
      updateComboDisplay();
    }
  }

  if (ship.shieldActive) {
    for (let i = 0; i < rings.length; i++) {
      if (ringAbsorbed.has(i)) continue;
      const ring = rings[i];
      const dx = ship.x - ring.x;
      const dy = ship.y - ring.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const ringWidth = 20;
      if (Math.abs(distance - ring.getRadius()) < ringWidth) {
        ringAbsorbed.add(i);
        score += 5;
        updateScoreDisplay();
        particles.addBurst(ship.x, ship.y, ring.color);
        setTimeout(() => ringAbsorbed.delete(i), 1000);
      }
    }
  }
}

function checkComboTimeout() {
  const now = performance.now() / 1000;
  if (combo > 0 && now - lastSpotTime > COMBO_TIMEOUT) {
    combo = 0;
    updateComboDisplay();
  }
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#130f40');
  gradient.addColorStop(1, '#1b1464');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

function gameLoop(timestamp: number) {
  if (!lastTime) lastTime = timestamp;
  const deltaTime = Math.min((timestamp - lastTime) / 1000, 0.1);
  lastTime = timestamp;

  if (gameRunning && !gameOver) {
    update(deltaTime);
  }

  draw();

  animationId = requestAnimationFrame(gameLoop);
}

function update(deltaTime: number) {
  timeLeft -= deltaTime;
  if (timeLeft <= 0) {
    timeLeft = 0;
    endGame();
  }
  timerEl.textContent = Math.ceil(timeLeft).toString();

  ship.update(deltaTime, mouseX, mouseY, width, height);

  for (const star of stars) {
    star.update(deltaTime);
  }

  for (const ring of rings) {
    ring.update(deltaTime);
  }

  for (const spot of spots) {
    spot.update(deltaTime, width, height);
  }

  spotSpawnTimer -= deltaTime;
  if (spotSpawnTimer <= 0) {
    spawnSpot();
    spotSpawnTimer = SPOT_SPAWN_MIN + Math.random() * (SPOT_SPAWN_MAX - SPOT_SPAWN_MIN);
  }

  particles.update(deltaTime, ship.x, ship.y, ship.angle, ship.boostActive);

  checkCollisions();
  checkComboTimeout();
}

function draw() {
  drawBackground();

  for (const star of stars) {
    star.draw(ctx);
  }

  for (const ring of rings) {
    ring.draw(ctx);
  }

  for (const spot of spots) {
    spot.draw(ctx);
  }

  particles.draw(ctx);

  ship.draw(ctx);
}

function endGame() {
  gameOver = true;
  gameRunning = false;
  finalScoreEl.textContent = Math.floor(score).toString();
  maxComboEl.textContent = `最高连击: ${maxCombo}`;
  gameOverEl.style.display = 'block';
  if (animationId) {
    cancelAnimationFrame(animationId);
  }
}

function resetGame() {
  score = 0;
  combo = 0;
  maxCombo = 0;
  timeLeft = GAME_DURATION;
  gameOver = false;
  gameRunning = true;
  lastSpotTime = 0;
  spotSpawnTimer = 1;
  lastTime = 0;

  spots = [];
  particles.clear();
  ringAbsorbed.clear();

  ship = new SpaceShip(width / 2, height / 2);
  mouseX = width / 2;
  mouseY = height / 2;

  updateScoreDisplay();
  updateComboDisplay();
  gameOverEl.style.display = 'none';

  animationId = requestAnimationFrame(gameLoop);
}

function handleMouseMove(e: MouseEvent) {
  mouseX = e.clientX;
  mouseY = e.clientY;
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.code === 'Space') {
    e.preventDefault();
    initAudio();
    if (gameRunning && !gameOver) {
      ship.boost();
    }
  }
}

async function init() {
  resize();

  ship = new SpaceShip(width / 2, height / 2);
  mouseX = width / 2;
  mouseY = height / 2;

  particles = new ParticleManager();

  initStars();
  initRings();

  spotSpawnTimer = 1;

  window.addEventListener('resize', () => {
    resize();
    initStars();
    initRings();
  });

  canvas.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('keydown', handleKeyDown);

  canvas.addEventListener('click', () => {
    initAudio();
  });

  restartBtn.addEventListener('click', resetGame);

  updateScoreDisplay();

  animateScoreGlow();

  animationId = requestAnimationFrame(gameLoop);
}

function animateScoreGlow() {
  gsap.to({}, {
    duration: 2,
    repeat: -1,
    yoyo: true,
    ease: 'sine.inOut',
    onUpdate: function() {
      const progress = this.progress();
      const opacity = 0.7 + 0.3 * Math.sin(progress * Math.PI * 2);
      scoreEl.style.opacity = opacity.toString();
    }
  });
}

init();
