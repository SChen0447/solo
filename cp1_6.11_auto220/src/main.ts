import { Organism, Jellyfish, Krill, Siphonophore } from './organisms';
import { InteractionManager } from './interaction';
import { Renderer } from './renderer';

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let organisms: Organism[] = [];
let renderer: Renderer;
let interactionManager: InteractionManager;
let currentDepth: number = 0;
let lastTime: number = 0;
let isDaytime: boolean = true;

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function createOrganisms(width: number, height: number): Organism[] {
  const result: Organism[] = [];
  const colLeft = width * 0.15 + 30;
  const colRight = width * 0.85 - 30;

  for (let i = 0; i < 15; i++) {
    const x = rand(colLeft, colRight);
    const y = rand(40, height - 40);
    result.push(new Jellyfish(x, y, width, height));
  }
  for (let i = 0; i < 15; i++) {
    const x = rand(colLeft, colRight);
    const y = rand(40, height - 40);
    result.push(new Krill(x, y, width, height));
  }
  for (let i = 0; i < 15; i++) {
    const x = rand(colLeft, colRight);
    const y = rand(40, height - 40);
    result.push(new Siphonophore(x, y, width, height));
  }
  return result;
}

function migrateOrganisms(depth: number, time: number): void {
  const h = canvas.height;
  const colLeft = canvas.width * 0.15 + 30;
  const colRight = canvas.width * 0.85 - 30;

  for (const org of organisms) {
    let targetY: number;
    const offset = rand(-60, 60);

    if (isDaytime) {
      if (org.type === 'jellyfish') {
        targetY = (200 / 1000) * h + (depth / 1000) * h * 0.4 + offset;
      } else if (org.type === 'krill') {
        targetY = (150 / 1000) * h + (depth / 1000) * h * 0.3 + offset;
      } else {
        targetY = (300 / 1000) * h + (depth / 1000) * h * 0.5 + offset;
      }
    } else {
      if (org.type === 'jellyfish') {
        targetY = (50 / 1000) * h + (depth / 1000) * h * 0.15 + offset;
      } else if (org.type === 'krill') {
        targetY = (30 / 1000) * h + (depth / 1000) * h * 0.1 + offset;
      } else {
        targetY = (100 / 1000) * h + (depth / 1000) * h * 0.2 + offset;
      }
    }

    targetY = Math.max(30, Math.min(h - 30, targetY));
    org.startMigration(targetY, time, 2000);
  }
}

function resetMigration(): void {
  const h = canvas.height;
  const colLeft = canvas.width * 0.15 + 30;
  const colRight = canvas.width * 0.85 - 30;
  const time = performance.now();

  for (const org of organisms) {
    const x = rand(colLeft, colRight);
    const y = rand(40, h - 40);
    org.x = x;
    org.y = y;
    org.baseY = y;
    org.migration = null;
  }
}

function resizeCanvas(): void {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  renderer.resize(canvas.width, canvas.height);
  for (const org of organisms) {
    org.resize(canvas.width, canvas.height);
  }
}

function gameLoop(timestamp: number): void {
  if (!lastTime) lastTime = timestamp;
  const dt = Math.min(timestamp - lastTime, 50);
  lastTime = timestamp;

  renderer.clear();
  renderer.drawBackground(timestamp);

  for (const org of organisms) {
    org.update(timestamp, dt);
  }

  renderer.drawOrganisms(organisms, timestamp);
  interactionManager.updateLightSpots(timestamp);
  interactionManager.drawLightSpots(renderer.getCtx(), timestamp);

  renderer.drawDepthSlider();
  renderer.drawInfoPanel(organisms);

  requestAnimationFrame(gameLoop);
}

function init(): void {
  canvas = document.getElementById('canvas') as HTMLCanvasElement;
  if (!canvas) {
    throw new Error('Canvas element not found');
  }
  ctx = canvas.getContext('2d')!;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  renderer = new Renderer(canvas);

  organisms = createOrganisms(canvas.width, canvas.height);

  interactionManager = new InteractionManager(
    canvas,
    organisms,
    (depth: number) => {
      currentDepth = depth;
      renderer.setDepth(depth);
      migrateOrganisms(depth, performance.now());
    },
    () => {
      resetMigration();
    }
  );

  renderer.setInteractionManager(interactionManager);

  window.addEventListener('resize', () => {
    resizeCanvas();
  });

  const hour = new Date().getHours();
  isDaytime = hour >= 6 && hour < 18;

  requestAnimationFrame(gameLoop);
}

export { canvas, currentDepth };

init();
