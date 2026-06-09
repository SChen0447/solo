import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createGround, createSkybox, GEOLOGY_LAYERS } from './geology';
import { createWaveSimulator, WaveSimulator, EarthquakeSource, SOURCE_COLORS } from './waveSimulator';

function colorToHex(c: number): string {
  return '#' + c.toString(16).padStart(6, '0');
}

function init(): void {
  const container = document.getElementById('canvas-container');
  if (!container) return;

  const scene = new THREE.Scene();

  createSkybox(scene);

  const aspect = window.innerWidth / window.innerHeight;
  const frustumSize = 280;
  const camera = new THREE.OrthographicCamera(
    (frustumSize * aspect) / -2,
    (frustumSize * aspect) / 2,
    frustumSize / 2,
    frustumSize / -2,
    0.1,
    2000
  );
  camera.position.set(180, 200, 180);
  camera.lookAt(0, -30, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x0a0a2a, 1);
  container.appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
  dirLight.position.set(100, 150, 80);
  scene.add(dirLight);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minZoom = 0.4;
  controls.maxZoom = 2.5;
  controls.target.set(0, -20, 0);
  controls.maxPolarAngle = Math.PI * 0.48;
  controls.minPolarAngle = Math.PI * 0.12;
  controls.update();

  const { mesh: geologyGroup, pickableMeshes } = createGround();
  scene.add(geologyGroup);

  const waveSim: WaveSimulator = createWaveSimulator(scene);

  const raycaster = new THREE.Raycaster();
  const mouseNDC = new THREE.Vector2();
  let mouseClientX = 0;
  let mouseClientY = 0;

  const tooltip = document.getElementById('tooltip') as HTMLDivElement;
  const tooltipName = tooltip.querySelector('.layer-name') as HTMLDivElement;
  const tooltipThickness = tooltip.querySelector('.layer-thickness') as HTMLDivElement;

  const dataPanel = document.getElementById('data-panel') as HTMLDivElement;
  const sourceListEl = document.getElementById('source-list') as HTMLDivElement;
  const ringCountEl = document.getElementById('ring-count') as HTMLDivElement;
  const layerTimestampsEl = document.getElementById('layer-timestamps') as HTMLDivElement;
  const toggleBtn = document.getElementById('toggle-panel') as HTMLButtonElement;
  let panelCollapsed = false;

  toggleBtn.addEventListener('click', () => {
    panelCollapsed = !panelCollapsed;
    if (panelCollapsed) {
      dataPanel.classList.add('collapsed');
    } else {
      dataPanel.classList.remove('collapsed');
    }
  });

  let panelVisible = false;

  function updateDataPanel(): void {
    const sources = waveSim.getSources();
    if (sources.length === 0) {
      if (panelVisible) {
        dataPanel.classList.remove('visible');
        panelVisible = false;
      }
      return;
    }

    if (!panelVisible) {
      dataPanel.classList.add('visible');
      panelVisible = true;
    }

    let html = '';
    for (const src of sources) {
      html += `
        <div class="source-item">
          <div class="data-row">
            <span class="label">
              <span class="source-dot" style="background:${colorToHex(src.color)}"></span>
              震源${src.id + 1}
            </span>
            <span class="value">
              (${src.position.x.toFixed(1)}, ${src.position.z.toFixed(1)})
            </span>
          </div>
        </div>`;
    }
    sourceListEl.innerHTML = html;

    ringCountEl.textContent = String(waveSim.getTotalRingCount());

    let tsHtml = '';
    const latestSource = sources[sources.length - 1];
    if (latestSource) {
      if (latestSource.layerTimestamps.length === 0) {
        tsHtml = '<div class="data-row"><span class="label">等待波传播中...</span></div>';
      } else {
        for (const ts of latestSource.layerTimestamps) {
          tsHtml += `
            <div class="data-row">
              <span class="label">${ts.layerName}</span>
              <span class="value">${ts.time.toFixed(0)} ms</span>
            </div>`;
        }
      }
    }
    layerTimestampsEl.innerHTML = tsHtml;
  }

  function updateTooltip(
    clientX: number,
    clientY: number,
    ndcX: number,
    ndcY: number
  ): void {
    mouseNDC.set(ndcX, ndcY);
    raycaster.setFromCamera(mouseNDC, camera);
    const intersects = raycaster.intersectObjects(pickableMeshes, false);

    if (intersects.length > 0 && intersects[0].object.userData && intersects[0].object.userData.type === 'geology-layer') {
      const ud = intersects[0].object.userData;
      tooltipName.textContent = ud.layerName;
      tooltipThickness.textContent = `厚度：${ud.thickness} 单位`;
      tooltip.style.left = `${clientX + 12}px`;
      tooltip.style.top = `${clientY + 12}px`;
      tooltip.classList.add('visible');
    } else if (intersects.length > 0 && intersects[0].object.userData && intersects[0].object.userData.type === 'fault') {
      const ud = intersects[0].object.userData;
      tooltipName.textContent = ud.layerName;
      tooltipThickness.textContent = `宽度：${ud.thickness} 单位`;
      tooltip.style.left = `${clientX + 12}px`;
      tooltip.style.top = `${clientY + 12}px`;
      tooltip.classList.add('visible');
    } else {
      tooltip.classList.remove('visible');
    }
  }

  function handleClick(clientX: number, clientY: number, ndcX: number, ndcY: number): void {
    mouseNDC.set(ndcX, ndcY);
    raycaster.setFromCamera(mouseNDC, camera);
    const groundPlane = pickableMeshes.find(m => m.userData && m.userData.type === 'ground');
    if (!groundPlane) return;
    const intersects = raycaster.intersectObject(groundPlane, false);
    if (intersects.length > 0) {
      const point = intersects[0].point;
      waveSim.addSource(point);
      updateDataPanel();
    }
  }

  renderer.domElement.addEventListener('mousemove', (e: MouseEvent) => {
    const rect = renderer.domElement.getBoundingClientRect();
    mouseClientX = e.clientX;
    mouseClientY = e.clientY;
    const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    updateTooltip(e.clientX, e.clientY, ndcX, ndcY);
  });

  renderer.domElement.addEventListener('click', (e: MouseEvent) => {
    const rect = renderer.domElement.getBoundingClientRect();
    const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    handleClick(e.clientX, e.clientY, ndcX, ndcY);
  });

  window.addEventListener('resize', () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const newAspect = w / h;
    camera.left = (frustumSize * newAspect) / -2;
    camera.right = (frustumSize * newAspect) / 2;
    camera.top = frustumSize / 2;
    camera.bottom = frustumSize / -2;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });

  const clock = new THREE.Clock();

  function animate(): void {
    const delta = clock.getDelta();
    const currentTime = performance.now();
    controls.update();
    waveSim.update(delta, currentTime);
    updateDataPanel();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  animate();
}

document.addEventListener('DOMContentLoaded', init);
