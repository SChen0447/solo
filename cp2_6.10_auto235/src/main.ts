import { GameEngine } from './GameEngine';
import { PlayerUI } from './PlayerUI';
import { WaterType, WATER_CONFIG } from './FishData';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;

const engine = new GameEngine();
const ui = new PlayerUI(canvas, engine);

let lastTime = performance.now();

engine.onFishCaught = (fish) => {
  ui.showCatchPopup(fish);
  ui.updateHUD();
};

engine.onFishEscaped = () => {
  ui.showEscapedBubble();
};

engine.onLevelUp = (level) => {
  console.log(`恭喜升级到 Lv.${level}!`);
  ui.updateHUD();
};

engine.onStateChange = () => {
  ui.updateHUD();
};

function gameLoop(currentTime: number) {
  const deltaTime = Math.min(100, currentTime - lastTime);
  lastTime = currentTime;

  engine.update(deltaTime);
  ui.render();
  ui.updateHUD();

  requestAnimationFrame(gameLoop);
}

function setupEventListeners() {
  let isMouseDown = false;
  let mouseX = 0;

  canvas.addEventListener('mousedown', (e: MouseEvent) => {
    e.preventDefault();
    if (e.button === 0) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      mouseX = (e.clientX - rect.left) * scaleX;
      isMouseDown = true;
      engine.startCharging(mouseX);
    }
  });

  canvas.addEventListener('mousemove', (e: MouseEvent) => {
    if (isMouseDown) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      mouseX = (e.clientX - rect.left) * scaleX;
    }
  });

  window.addEventListener('mouseup', (e: MouseEvent) => {
    if (isMouseDown && e.button === 0) {
      isMouseDown = false;
      engine.cast();
    }
  });

  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.code === 'Space') {
      if (engine.state.phase === 'biting') {
        e.preventDefault();
      }
      if (engine.state.phase === 'reeling') {
        e.preventDefault();
        engine.reel();
      }
    }
  });

  const waterButtons = document.querySelectorAll('.water-buttons .pixel-btn');
  waterButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const water = btn.getAttribute('data-water') as WaterType;
      if (water && engine.setWater(water)) {
        canvas.style.background = WATER_CONFIG[water].bgColor;
        ui.updateHUD();
      }
    });
  });
}

setupEventListeners();
canvas.style.background = WATER_CONFIG[engine.state.water].bgColor;
ui.updateHUD();

requestAnimationFrame(gameLoop);
