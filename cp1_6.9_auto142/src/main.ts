import p5 from 'p5';
import { Particle } from './particle';
import { AudioManager, SCALES } from './audio';
import { Renderer, Glow, Meteor } from './renderer';
import { checkAllCollisions, checkOverlap, mixColors, CollisionInfo } from './collision';

const BOTTLE_WIDTH = 400;
const BOTTLE_HEIGHT = 600;
const MAX_PARTICLES = 50;
const MAX_COLLISION_CHECKS = 200;
const SHAKE_SPEED_THRESHOLD = 100;
const SHAKE_FRAME_DISTANCE = 10;
const SHAKE_REQUIRED_FRAMES = 5;

const sketch = (p: p5) => {
  let particles: Particle[] = [];
  let glows: Glow[] = [];
  let meteors: Meteor[] = [];
  let renderer: Renderer;
  let audioManager: AudioManager;
  let currentScaleIndex = 0;
  let lastMouseX = 0;
  let lastMouseY = 0;
  let shakeFrameCount = 0;
  let isShaking = false;
  let shakeCooldown = 0;
  let isButtonHovered = false;
  let lastTime = 0;
  let audioPlayedThisFrame = false;

  p.setup = () => {
    const canvas = p.createCanvas(p.windowWidth, p.windowHeight);
    canvas.parent('app');

    const bottleX = (p.width - BOTTLE_WIDTH) / 2;
    const bottleY = (p.height - BOTTLE_HEIGHT) / 2;

    renderer = new Renderer(p, bottleX, bottleY, BOTTLE_WIDTH, BOTTLE_HEIGHT);
    audioManager = new AudioManager();

    lastMouseX = p.mouseX;
    lastMouseY = p.mouseY;
    lastTime = p.millis();
  };

  p.windowResized = () => {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
    if (!renderer) return;
    const bottleX = (p.width - BOTTLE_WIDTH) / 2;
    const bottleY = (p.height - BOTTLE_HEIGHT) / 2;
    renderer.setBottlePosition(bottleX, bottleY);
    renderer.stars = [];
    const starCount = 150;
    for (let i = 0; i < starCount; i++) {
      renderer.stars.push({
        x: Math.random() * p.width,
        y: Math.random() * p.height,
        size: 1 + Math.random(),
        alpha: 0.3 + Math.random() * 0.5
      });
    }
  };

  p.draw = () => {
    const now = p.millis();
    const deltaTime = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    p.clear();

    renderer.drawBackground();
    renderer.drawMeteors(meteors);
    renderer.drawBottle(now);

    updateShakeState(deltaTime);
    updateParticles(deltaTime);
    handleCollisions();
    updateGlows(deltaTime);
    updateMeteors(deltaTime);

    particles = particles.filter(p => p.isAlive());
    glows = glows.filter(g => g.life < 1);
    meteors = meteors.filter(m => m.progress < 1);

    isButtonHovered = renderer.isPointInButton(p.mouseX, p.mouseY);
    const bottleHovered = renderer.isPointInBottle(p.mouseX, p.mouseY);
    renderer.setHovering(bottleHovered);

    renderer.drawGlows(glows);
    renderer.drawParticles(particles);
    renderer.drawUI(particles.length, isButtonHovered);

    lastMouseX = p.mouseX;
    lastMouseY = p.mouseY;
    audioPlayedThisFrame = false;
  };

  const updateShakeState = (deltaTime: number) => {
    if (shakeCooldown > 0) {
      shakeCooldown -= deltaTime;
      if (shakeCooldown <= 0) {
        isShaking = false;
      }
      return;
    }

    const dx = p.mouseX - lastMouseX;
    const dy = p.mouseY - lastMouseY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const speed = distance / deltaTime;

    const inBottle = renderer.isPointInBottle(p.mouseX, p.mouseY);

    if (inBottle && speed > SHAKE_SPEED_THRESHOLD && distance > SHAKE_FRAME_DISTANCE) {
      shakeFrameCount++;
      if (shakeFrameCount >= SHAKE_REQUIRED_FRAMES && !isShaking) {
        isShaking = true;
        triggerAllJumps();
        shakeCooldown = 1.5;
        shakeFrameCount = 0;
      }
    } else {
      shakeFrameCount = Math.max(0, shakeFrameCount - 1);
    }
  };

  const triggerAllJumps = () => {
    for (const particle of particles) {
      if (!particle.exploding && Math.random() < 0.7) {
        particle.startJump();
      }
    }
  };

  const updateParticles = (deltaTime: number) => {
    for (const particle of particles) {
      particle.update(deltaTime);
    }

    if (isShaking && shakeCooldown > 0.5) {
      for (const particle of particles) {
        if (!particle.isJumping && !particle.exploding && Math.random() < 0.03) {
          particle.startJump();
        }
      }
    }
  };

  const handleCollisions = () => {
    const collisions: CollisionInfo[] = checkAllCollisions(particles, MAX_COLLISION_CHECKS);

    for (const collision of collisions) {
      const mixedColor = mixColors(collision.p1.color, collision.p2.color);

      glows.push({
        x: collision.x,
        y: collision.y,
        color: mixedColor,
        maxRadius: 30,
        life: 0
      });

      if (!audioPlayedThisFrame) {
        const scaleIndex = Math.random() < 0.5 ? collision.p1.scaleIndex : collision.p2.scaleIndex;
        audioManager.playScaleNote(scaleIndex);
        audioPlayedThisFrame = true;
      }
    }
  };

  const updateGlows = (deltaTime: number) => {
    for (const glow of glows) {
      glow.life += deltaTime / 0.3;
      if (glow.life > 1) glow.life = 1;
    }
  };

  const updateMeteors = (deltaTime: number) => {
    for (const meteor of meteors) {
      meteor.progress += deltaTime * 2;
      if (meteor.progress > 1) meteor.progress = 1;
    }
  };

  p.mousePressed = () => {
    audioManager.init();

    if (isButtonHovered) {
      for (const particle of particles) {
        particle.startExplode();
      }
      return;
    }

    const inBottle = renderer.isPointInBottle(p.mouseX, p.mouseY);

    if (!inBottle) {
      meteors.push({
        x: p.mouseX,
        y: p.mouseY,
        angle: Math.PI / 4 + (Math.random() - 0.5) * 0.5,
        length: 80 + Math.random() * 60,
        progress: 0
      });
      return;
    }

    tryPlaceParticle(p.mouseX, p.mouseY);
  };

  p.mouseDragged = () => {
    const inBottle = renderer.isPointInBottle(p.mouseX, p.mouseY);
    if (inBottle && p.frameCount % 5 === 0) {
      tryPlaceParticle(p.mouseX, p.mouseY);
    }
  };

  const tryPlaceParticle = (x: number, y: number) => {
    if (particles.length >= MAX_PARTICLES) return;

    const testRadius = 10;
    if (checkOverlap(x, y, testRadius, particles)) return;

    const particle = new Particle({
      x,
      y,
      scaleIndex: currentScaleIndex
    });

    particles.push(particle);
    currentScaleIndex = (currentScaleIndex + 1) % SCALES.length;
  };
};

new p5(sketch);
