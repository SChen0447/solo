import { GridEngine } from './gridEngine';
import { GridRenderer } from './renderer';
import { Controls } from './controls';

function initApp(): void {
  const mountPoint = document.getElementById('app');
  if (!mountPoint) {
    console.error('Mount point #app not found');
    return;
  }

  mountPoint.innerHTML = `
    <header class="app-header">
      <h1 class="app-title">CSS 栅格系统设计器</h1>
      <p class="app-subtitle">动态调整栅格参数，实时预览与生成代码</p>
    </header>

    <div class="app-layout">
      <aside id="control-panel" class="panel control-panel"></aside>

      <main class="canvas-area">
        <div class="canvas-wrapper">
          <canvas id="grid-canvas"></canvas>
        </div>
        <div id="breakpoint-bar" class="breakpoint-bar"></div>
      </main>

      <aside id="code-panel" class="panel code-panel"></aside>
    </div>
  `;

  const controlPanel = document.getElementById('control-panel') as HTMLElement;
  const codePanel = document.getElementById('code-panel') as HTMLElement;
  const breakpointBar = document.getElementById('breakpoint-bar') as HTMLElement;
  const canvas = document.getElementById('grid-canvas') as HTMLCanvasElement;

  if (!controlPanel || !codePanel || !breakpointBar || !canvas) {
    console.error('Required DOM elements missing');
    return;
  }

  const engine = new GridEngine();

  const renderer = new GridRenderer(canvas, engine);
  engine.subscribe(() => renderer.scheduleRender());

  new Controls(engine, { controlPanel, codePanel, breakpointBar });

  renderer.render();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
