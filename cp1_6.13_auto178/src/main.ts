import { InputHandler, type InteractionData } from './input';
import { WeaveSystem } from './weave';
import { Renderer } from './renderer';

const canvas = document.getElementById('tapestry-canvas') as HTMLCanvasElement;
const container = document.getElementById('tapestry-container') as HTMLDivElement;
const colorValue = document.getElementById('color-value') as HTMLSpanElement;
const colorPreview = document.getElementById('color-preview') as HTMLSpanElement;
const speedValue = document.getElementById('speed-value') as HTMLSpanElement;

if (!canvas || !container) {
  throw new Error('Required DOM elements not found');
}

const rect = canvas.getBoundingClientRect();
const width = rect.width;
const height = rect.height;

const inputHandler = new InputHandler(canvas);
const weaveSystem = new WeaveSystem(width, height);
const renderer = new Renderer(canvas);

let currentInteraction: InteractionData = {
  mouseX: 0,
  mouseY: 0,
  prevMouseX: 0,
  prevMouseY: 0,
  velocity: 0,
  isDragging: false,
  clickX: null,
  clickY: null,
  nearestColor: '#ff6b6b'
};

inputHandler.onInteraction((data: InteractionData) => {
  currentInteraction = data;
});

function getInteraction(): InteractionData {
  return currentInteraction;
}

function updateUI(interaction: InteractionData): void {
  if (colorValue && colorPreview) {
    colorPreview.style.backgroundColor = interaction.nearestColor;
    colorPreview.style.color = interaction.nearestColor;
    const colorText = colorValue.childNodes[colorValue.childNodes.length - 1];
    if (colorText && colorText.nodeType === Node.TEXT_NODE) {
      colorText.textContent = interaction.nearestColor;
    }
  }

  if (speedValue) {
    speedValue.textContent = `${interaction.velocity.toFixed(1)} px/s`;
  }
}

renderer.startLoop(weaveSystem, getInteraction, updateUI);

window.addEventListener('resize', () => {
  renderer.resize();
  const newRect = canvas.getBoundingClientRect();
  weaveSystem.resize(newRect.width, newRect.height);
});

window.addEventListener('beforeunload', () => {
  renderer.destroy();
  weaveSystem.destroy();
  inputHandler.destroy();
});
