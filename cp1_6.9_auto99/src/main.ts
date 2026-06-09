import p5 from 'p5';
import { FluidSolver, FluidConfig } from './fluid_solver';
import { Renderer, RenderMode } from './renderer';
import { InteractionManager } from './interaction';

const GRID_SIZE = 300;

const fluidConfig: FluidConfig = {
  gridSize: GRID_SIZE,
  diffusion: 0.0001,
  viscosity: 0.0001,
  pressureIterations: 2,
  timeStep: 0.1
};

let canvasSize: number;
let solver: FluidSolver;
let renderer: Renderer;
let interaction: InteractionManager;
let modeIndicator: HTMLElement;

function getCanvasSize(): number {
  return Math.floor(Math.min(window.innerWidth, window.innerHeight) * 0.95);
}

function updateModeIndicator(mode: RenderMode): void {
  if (!modeIndicator) return;
  modeIndicator.classList.add('fade');
  setTimeout(() => {
    modeIndicator.textContent = mode === 'fluid' ? '模式: 流体渲染' : '模式: 粒子跟踪';
    modeIndicator.classList.remove('fade');
  }, 150);
}

const sketch = (p: p5) => {
  p.setup = () => {
    canvasSize = getCanvasSize();
    const canvas = p.createCanvas(canvasSize, canvasSize);
    canvas.parent('canvas-container');

    p.pixelDensity(1);
    p.noStroke();

    solver = new FluidSolver(fluidConfig);
    renderer = new Renderer(p, solver, canvasSize);
    interaction = new InteractionManager(p, solver, renderer, canvasSize);
    interaction.setup();

    modeIndicator = document.getElementById('mode-indicator')!;
    interaction.setModeChangeCallback(updateModeIndicator);

    p.frameRate(60);
  };

  p.draw = () => {
    interaction.update();
    solver.step();
    renderer.render();
  };

  p.windowResized = () => {
    canvasSize = getCanvasSize();
    p.resizeCanvas(canvasSize, canvasSize);
    renderer.resize(canvasSize);
    interaction.resize(canvasSize);
  };
};

new p5(sketch);
