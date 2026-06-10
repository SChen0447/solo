import * as THREE from 'three';

export function createStats(container: HTMLElement, renderer: THREE.WebGLRenderer) {
  const styles = `
    .stats-panel {
      position: absolute;
      left: 20px;
      bottom: 20px;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(5px);
      -webkit-backdrop-filter: blur(5px);
      padding: 12px 16px;
      border-radius: 8px;
      color: white;
      font-size: 14px;
      font-family: monospace;
      z-index: 100;
      line-height: 1.8;
    }
    .stats-item {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .stats-label {
      color: rgba(255, 255, 255, 0.7);
      min-width: 80px;
    }
    .stats-value {
      color: #ffffff;
      font-weight: 600;
    }
    .stats-value.low {
      color: #ff6b6b;
    }
  `;

  const styleElement = document.createElement('style');
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);

  const panel = document.createElement('div');
  panel.className = 'stats-panel';

  const fpsRow = document.createElement('div');
  fpsRow.className = 'stats-item';
  fpsRow.innerHTML = `<span class="stats-label">FPS:</span><span class="stats-value" id="fps-value">60</span>`;
  panel.appendChild(fpsRow);

  const trisRow = document.createElement('div');
  trisRow.className = 'stats-item';
  trisRow.innerHTML = `<span class="stats-label">Triangles:</span><span class="stats-value" id="tris-value">0</span>`;
  panel.appendChild(trisRow);

  container.appendChild(panel);

  let frameCount = 0;
  let lastTime = performance.now();
  let currentFps = 60;
  const fpsValue = document.getElementById('fps-value');
  const trisValue = document.getElementById('tris-value');
  let lastTrisUpdate = 0;

  function update() {
    frameCount++;
    const now = performance.now();
    const elapsed = now - lastTime;

    if (elapsed >= 1000) {
      currentFps = Math.round((frameCount * 1000) / elapsed);
      if (fpsValue) {
        fpsValue.textContent = currentFps.toString();
        fpsValue.classList.toggle('low', currentFps < 24);
      }
      frameCount = 0;
      lastTime = now;
    }

    if (now - lastTrisUpdate >= 500) {
      if (trisValue) {
        trisValue.textContent = renderer.info.render.triangles.toLocaleString();
      }
      lastTrisUpdate = now;
    }
  }

  function getFps(): number {
    return currentFps;
  }

  return { update, getFps };
}
