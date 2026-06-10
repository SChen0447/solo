import { Ecosystem } from './ecosystem';
import { StatsPanel } from './stats';

const TARGET_FPS = 60;
const FRAME_INTERVAL = 1000 / TARGET_FPS;
const STATS_UPDATE_INTERVAL = 1000 / 5;

const gameCanvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const statsPanelEl = document.getElementById('stats-panel') as HTMLElement;
const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;

let ecosystem = new Ecosystem(gameCanvas);
let statsPanel = new StatsPanel(statsPanelEl);

let isPaused = false;
let lastFrameTime = 0;
let lastStatsTime = 0;
let animationId: number | null = null;

function gameLoop(currentTime: number): void {
  const elapsed = currentTime - lastFrameTime;
  lastFrameTime = currentTime;

  if (!isPaused) {
    ecosystem.update(elapsed);
  }

  ecosystem.render(currentTime, isPaused);

  if (currentTime - lastStatsTime >= STATS_UPDATE_INTERVAL) {
    lastStatsTime = currentTime;
    const pop = {
      herbivores: 0,
      carnivores: 0,
      plants: 0
    };
    (ecosystem as any).allCreatures.forEach((c: any) => {
      if (c.type === 'herbivore') pop.herbivores++;
      else if (c.type === 'carnivore') pop.carnivores++;
      else if (c.type === 'plant') pop.plants++;
    });
    statsPanel.update(pop.herbivores, pop.carnivores, pop.plants);
  }

  animationId = requestAnimationFrame(gameLoop);
}

function getCanvasCoords(e: MouseEvent): { x: number; y: number } {
  const rect = gameCanvas.getBoundingClientRect();
  const scaleX = gameCanvas.width / rect.width;
  const scaleY = gameCanvas.height / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY
  };
}

gameCanvas.addEventListener('mousemove', (e) => {
  const { x, y } = getCanvasCoords(e);
  ecosystem.hoveredCreature = ecosystem.getCreatureAt(x, y);
  gameCanvas.style.cursor = ecosystem.hoveredCreature ? 'pointer' : 'default';
});

gameCanvas.addEventListener('mouseleave', () => {
  ecosystem.hoveredCreature = null;
});

gameCanvas.addEventListener('click', (e) => {
  const { x, y } = getCanvasCoords(e);
  const clicked = ecosystem.getCreatureAt(x, y);
  if (clicked) {
    if (ecosystem.highlightedCreature === clicked) {
      ecosystem.highlightedCreature = null;
    } else {
      ecosystem.highlightedCreature = clicked;
    }
  } else {
    ecosystem.highlightedCreature = null;
  }
});

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    isPaused = !isPaused;
  }
});

resetBtn.addEventListener('click', () => {
  ecosystem.initialize();
  statsPanel.reset();
  const pop = {
    herbivores: 0,
    carnivores: 0,
    plants: 0
  };
  (ecosystem as any).allCreatures.forEach((c: any) => {
    if (c.type === 'herbivore') pop.herbivores++;
    else if (c.type === 'carnivore') pop.carnivores++;
    else if (c.type === 'plant') pop.plants++;
  });
  statsPanel.update(pop.herbivores, pop.carnivores, pop.plants);
});

lastFrameTime = performance.now();
lastStatsTime = lastFrameTime;
animationId = requestAnimationFrame(gameLoop);
