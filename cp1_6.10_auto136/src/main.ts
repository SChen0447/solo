import { setupScene } from './sceneSetup';
import { ErosionController, TerrainType, ErosionType, ErosionStats } from './ErosionController';
import { TerrainMesh } from './TerrainMesh';

const TERRAIN_NAMES: Record<TerrainType, string> = {
  mountain: '山地地形',
  plain: '平原地形',
  basin: '盆地地形'
};

const EROSION_NAMES: Record<ErosionType, string> = {
  rainfall: '降雨侵蚀',
  weathering: '风化侵蚀',
  tectonic: '板块运动'
};

const app = document.getElementById('app')!;
const { scene, camera, renderer, controls, initialCameraPosition, initialCameraTarget } = setupScene(app);

let resolution: number = 128;
const erosionController = new ErosionController(resolution);
const terrainMesh = new TerrainMesh(scene, resolution, 20);

const uiContainer = document.createElement('div');
uiContainer.style.cssText = `
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
`;
app.appendChild(uiContainer);

const topTitle = document.createElement('div');
topTitle.style.cssText = `
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 24px;
  color: #e0e0e0;
  text-shadow: 0 0 10px rgba(74,144,217,0.5);
  pointer-events: none;
  white-space: nowrap;
`;
uiContainer.appendChild(topTitle);

const controlPanel = document.createElement('div');
controlPanel.style.cssText = `
  position: absolute;
  top: 0;
  left: 0;
  width: 240px;
  height: 100%;
  background: rgba(20,20,30,0.8);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-right: 1px solid #2a2a3a;
  padding: 70px 16px 20px;
  pointer-events: auto;
  overflow-y: auto;
  transition: transform 0.3s ease;
  z-index: 100;
`;
uiContainer.appendChild(controlPanel);

const mobileToggleBtn = document.createElement('button');
mobileToggleBtn.innerHTML = '☰';
mobileToggleBtn.style.cssText = `
  position: absolute;
  top: 16px;
  left: 16px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(20,20,30,0.9);
  color: #e0e0e0;
  border: 1px solid #2a2a3a;
  font-size: 20px;
  cursor: pointer;
  pointer-events: auto;
  display: none;
  z-index: 101;
  transition: all 0.2s ease;
`;
mobileToggleBtn.addEventListener('mouseenter', () => {
  mobileToggleBtn.style.background = '#1a1a2e';
  mobileToggleBtn.style.transform = 'scale(1.05)';
});
mobileToggleBtn.addEventListener('mouseleave', () => {
  mobileToggleBtn.style.background = 'rgba(20,20,30,0.9)';
  mobileToggleBtn.style.transform = 'scale(1)';
});
mobileToggleBtn.addEventListener('click', () => {
  if (controlPanel.style.transform === 'translateX(-100%)') {
    controlPanel.style.transform = 'translateX(0)';
  } else {
    controlPanel.style.transform = 'translateX(-100%)';
  }
});
uiContainer.appendChild(mobileToggleBtn);

const sectionStyle = 'margin-bottom: 24px;';
const labelStyle = 'display: block; color: #a0a0b0; font-size: 12px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px;';
const buttonBaseStyle = `
  width: 100%;
  height: 40px;
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  background: #1a1a2e;
  color: #e0e0e0;
  font-size: 14px;
  cursor: pointer;
  margin-bottom: 8px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: inherit;
`;

const terrainSection = document.createElement('div');
terrainSection.style.cssText = sectionStyle;
terrainSection.innerHTML = `<span style="${labelStyle}">地形类型 (按 1/2/3)</span>`;

const terrainButtons: { type: TerrainType; icon: string; btn: HTMLButtonElement }[] = [
  { type: 'mountain', icon: '⛰', btn: document.createElement('button') },
  { type: 'plain', icon: '🏜', btn: document.createElement('button') },
  { type: 'basin', icon: '🕳', btn: document.createElement('button') }
];

terrainButtons.forEach(({ type, icon, btn }) => {
  btn.style.cssText = buttonBaseStyle;
  btn.innerHTML = `<span style="font-size: 16px;">${icon}</span><span>${TERRAIN_NAMES[type]}</span>`;
  btn.addEventListener('mouseenter', () => {
    btn.style.background = 'linear-gradient(135deg, #16213e, #1a1a2e)';
    btn.style.transform = 'scale(1.02)';
  });
  btn.addEventListener('mouseleave', () => {
    if (btn.dataset.active !== 'true') {
      btn.style.background = '#1a1a2e';
    }
    btn.style.transform = 'scale(1)';
  });
  btn.addEventListener('mousedown', () => {
    btn.style.boxShadow = 'inset 0 2px 8px #0f3460';
  });
  btn.addEventListener('mouseup', () => {
    btn.style.boxShadow = 'none';
  });
  btn.addEventListener('click', () => {
    switchTerrain(type);
  });
  terrainSection.appendChild(btn);
});
controlPanel.appendChild(terrainSection);

const erosionSection = document.createElement('div');
erosionSection.style.cssText = sectionStyle;
erosionSection.innerHTML = `<span style="${labelStyle}">侵蚀模式</span>`;

const erosionButtons: { type: ErosionType; icon: string; btn: HTMLButtonElement }[] = [
  { type: 'rainfall', icon: '🌧', btn: document.createElement('button') },
  { type: 'weathering', icon: '🌬', btn: document.createElement('button') },
  { type: 'tectonic', icon: '🌋', btn: document.createElement('button') }
];

erosionButtons.forEach(({ type, icon, btn }) => {
  btn.style.cssText = buttonBaseStyle;
  btn.innerHTML = `<span style="font-size: 16px;">${icon}</span><span>${EROSION_NAMES[type]}</span>`;
  btn.addEventListener('mouseenter', () => {
    if (btn.dataset.active !== 'true') {
      btn.style.background = 'linear-gradient(135deg, #16213e, #1a1a2e)';
    }
    btn.style.transform = 'scale(1.02)';
  });
  btn.addEventListener('mouseleave', () => {
    if (btn.dataset.active !== 'true') {
      btn.style.background = '#1a1a2e';
    }
    btn.style.transform = 'scale(1)';
  });
  btn.addEventListener('mousedown', () => {
    btn.style.boxShadow = 'inset 0 2px 8px #0f3460';
  });
  btn.addEventListener('mouseup', () => {
    btn.style.boxShadow = 'none';
  });
  btn.addEventListener('click', () => {
    const isActive = erosionController.isErosionActive(type);
    toggleErosion(type, !isActive);
  });
  erosionSection.appendChild(btn);
});
controlPanel.appendChild(erosionSection);

const speedSection = document.createElement('div');
speedSection.style.cssText = sectionStyle;
speedSection.innerHTML = `<span style="${labelStyle}">侵蚀速度</span>`;

const sliderContainer = document.createElement('div');
sliderContainer.style.cssText = 'padding: 8px 4px;';

const speedSlider = document.createElement('input');
speedSlider.type = 'range';
speedSlider.min = '0.1';
speedSlider.max = '2.0';
speedSlider.step = '0.1';
speedSlider.value = '1.0';
speedSlider.style.cssText = `
  width: 200px;
  height: 8px;
  -webkit-appearance: none;
  appearance: none;
  background: #333;
  border-radius: 4px;
  outline: none;
  cursor: pointer;
`;

const sliderStyle = document.createElement('style');
sliderStyle.textContent = `
  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #4a90d9;
    cursor: pointer;
    box-shadow: 0 0 6px rgba(74,144,217,0.6);
    transition: all 0.2s ease;
  }
  input[type="range"]::-webkit-slider-thumb:hover {
    transform: scale(1.15);
    box-shadow: 0 0 10px rgba(74,144,217,0.8);
  }
  input[type="range"]::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #4a90d9;
    cursor: pointer;
    border: none;
    box-shadow: 0 0 6px rgba(74,144,217,0.6);
  }
`;
document.head.appendChild(sliderStyle);

speedSlider.addEventListener('input', () => {
  erosionController.setSpeed(parseFloat(speedSlider.value));
  speedValue.textContent = parseFloat(speedSlider.value).toFixed(1) + 'x';
});

sliderContainer.appendChild(speedSlider);

const speedValue = document.createElement('div');
speedValue.style.cssText = 'color: #4a90d9; font-size: 13px; margin-top: 8px; text-align: center; font-weight: 600;';
speedValue.textContent = '1.0x';
sliderContainer.appendChild(speedValue);

speedSection.appendChild(sliderContainer);
controlPanel.appendChild(speedSection);

const actionSection = document.createElement('div');
actionSection.style.cssText = sectionStyle;

const pauseBtn = document.createElement('button');
pauseBtn.style.cssText = buttonBaseStyle;
pauseBtn.innerHTML = '<span style="font-size: 16px;">⏸</span><span>暂停/继续</span>';
pauseBtn.addEventListener('mouseenter', () => {
  pauseBtn.style.background = 'linear-gradient(135deg, #16213e, #1a1a2e)';
  pauseBtn.style.transform = 'scale(1.02)';
});
pauseBtn.addEventListener('mouseleave', () => {
  pauseBtn.style.background = '#1a1a2e';
  pauseBtn.style.transform = 'scale(1)';
});
pauseBtn.addEventListener('click', () => {
  erosionController.setPaused(!erosionController.isPaused());
  updatePauseButton();
});
actionSection.appendChild(pauseBtn);

const resetBtn = document.createElement('button');
resetBtn.style.cssText = buttonBaseStyle;
resetBtn.innerHTML = '<span style="font-size: 16px;">🔄</span><span>重置地形</span>';
resetBtn.addEventListener('mouseenter', () => {
  resetBtn.style.background = 'linear-gradient(135deg, #16213e, #1a1a2e)';
  resetBtn.style.transform = 'scale(1.02)';
});
resetBtn.addEventListener('mouseleave', () => {
  resetBtn.style.background = '#1a1a2e';
  resetBtn.style.transform = 'scale(1)';
});
resetBtn.addEventListener('click', () => {
  erosionController.reset();
  updateTopTitle();
});
actionSection.appendChild(resetBtn);

const hintText = document.createElement('div');
hintText.style.cssText = 'color: #666; font-size: 11px; margin-top: 16px; line-height: 1.6;';
hintText.innerHTML = `
  <div><strong style="color:#888;">操作提示：</strong></div>
  <div>• 拖拽旋转视角</div>
  <div>• 滚轮缩放 (5-40)</div>
  <div>• 按 R 重置视角</div>
  <div>• 按 1/2/3 切换地形</div>
`;
actionSection.appendChild(hintText);

controlPanel.appendChild(actionSection);

const statsPanel = document.createElement('div');
statsPanel.style.cssText = `
  position: absolute;
  bottom: 20px;
  right: 20px;
  background: rgba(0,0,0,0.75);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  border-radius: 12px;
  padding: 16px 20px;
  color: #ffffff;
  font-size: 13px;
  min-width: 200px;
  pointer-events: auto;
  border: 1px solid rgba(255,255,255,0.08);
`;
uiContainer.appendChild(statsPanel);

const statsTitle = document.createElement('div');
statsTitle.style.cssText = 'font-size: 14px; font-weight: 600; color: #4a90d9; margin-bottom: 12px; letter-spacing: 1px;';
statsTitle.textContent = '侵蚀统计';
statsPanel.appendChild(statsTitle);

const statsGrid = document.createElement('div');
statsGrid.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; margin-bottom: 14px;';
statsPanel.appendChild(statsGrid);

const statItems: { label: string; valueEl: HTMLSpanElement }[] = [
  { label: '侵蚀时长', valueEl: document.createElement('span') },
  { label: '最高点', valueEl: document.createElement('span') },
  { label: '最低点', valueEl: document.createElement('span') },
  { label: '侵蚀体积', valueEl: document.createElement('span') }
];

statItems.forEach(({ label, valueEl }) => {
  const row = document.createElement('div');
  row.style.cssText = 'display: flex; justify-content: space-between;';
  const labelEl = document.createElement('span');
  labelEl.style.cssText = 'color: #888;';
  labelEl.textContent = label;
  valueEl.style.cssText = 'color: #fff; font-weight: 500; font-variant-numeric: tabular-nums;';
  valueEl.textContent = '-';
  row.appendChild(labelEl);
  row.appendChild(valueEl);
  statsGrid.appendChild(row);
});

const contributionsTitle = document.createElement('div');
contributionsTitle.style.cssText = 'font-size: 12px; color: #888; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px;';
contributionsTitle.textContent = '侵蚀贡献';
statsPanel.appendChild(contributionsTitle);

const donutContainer = document.createElement('div');
donutContainer.style.cssText = 'display: flex; align-items: center; gap: 16px;';
statsPanel.appendChild(donutContainer);

const donutCanvas = document.createElement('canvas');
donutCanvas.width = 80;
donutCanvas.height = 80;
donutCanvas.style.cssText = 'flex-shrink: 0;';
donutContainer.appendChild(donutCanvas);

const legendContainer = document.createElement('div');
legendContainer.style.cssText = 'display: flex; flex-direction: column; gap: 6px; font-size: 12px;';
donutContainer.appendChild(legendContainer);

const legendItems: { color: string; label: string; pctEl: HTMLSpanElement }[] = [
  { color: '#3498db', label: '降雨', pctEl: document.createElement('span') },
  { color: '#e67e22', label: '风化', pctEl: document.createElement('span') },
  { color: '#9b59b6', label: '板块', pctEl: document.createElement('span') }
];

legendItems.forEach(({ color, label, pctEl }) => {
  const row = document.createElement('div');
  row.style.cssText = 'display: flex; align-items: center; gap: 6px;';
  const dot = document.createElement('div');
  dot.style.cssText = `width: 10px; height: 10px; border-radius: 50%; background: ${color}; flex-shrink: 0;`;
  const labelEl = document.createElement('span');
  labelEl.style.cssText = 'color: #aaa; width: 32px;';
  labelEl.textContent = label;
  pctEl.style.cssText = 'color: #fff; font-variant-numeric: tabular-nums;';
  pctEl.textContent = '0%';
  row.appendChild(dot);
  row.appendChild(labelEl);
  row.appendChild(pctEl);
  legendContainer.appendChild(row);
});

function drawDonut(stats: ErosionStats): void {
  const ctx = donutCanvas.getContext('2d')!;
  const cx = donutCanvas.width / 2;
  const cy = donutCanvas.height / 2;
  const outerR = 34;
  const innerR = 22;

  ctx.clearRect(0, 0, donutCanvas.width, donutCanvas.height);

  const segments = [
    { pct: stats.rainfallContribution, color: '#3498db' },
    { pct: stats.weatheringContribution, color: '#e67e22' },
    { pct: stats.tectonicContribution, color: '#9b59b6' }
  ];

  const total = segments.reduce((s, seg) => s + seg.pct, 0);
  if (total === 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2, true);
    ctx.fillStyle = '#2a2a3a';
    ctx.fill();
    return;
  }

  let startAngle = -Math.PI / 2;
  segments.forEach(seg => {
    if (seg.pct <= 0) return;
    const angle = (seg.pct / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, startAngle, startAngle + angle);
    ctx.arc(cx, cy, innerR, startAngle + angle, startAngle, true);
    ctx.closePath();
    ctx.fillStyle = seg.color;
    ctx.fill();
    startAngle += angle;
  });
}

function updateStats(stats: ErosionStats): void {
  statItems[0].valueEl.textContent = stats.elapsedTime.toFixed(1) + 's';
  statItems[1].valueEl.textContent = stats.maxHeight.toFixed(2);
  statItems[2].valueEl.textContent = stats.minHeight.toFixed(2);
  statItems[3].valueEl.textContent = stats.totalErodedVolume.toFixed(2);

  legendItems[0].pctEl.textContent = (stats.rainfallContribution * 100).toFixed(0) + '%';
  legendItems[1].pctEl.textContent = (stats.weatheringContribution * 100).toFixed(0) + '%';
  legendItems[2].pctEl.textContent = (stats.tectonicContribution * 100).toFixed(0) + '%';

  drawDonut(stats);
}

function updateTopTitle(): void {
  const terrain = erosionController.getCurrentTerrainType();
  const activeErosions: string[] = [];
  if (erosionController.isErosionActive('rainfall')) activeErosions.push(EROSION_NAMES.rainfall);
  if (erosionController.isErosionActive('weathering')) activeErosions.push(EROSION_NAMES.weathering);
  if (erosionController.isErosionActive('tectonic')) activeErosions.push(EROSION_NAMES.tectonic);

  const modeText = activeErosions.length > 0
    ? ` · ${activeErosions.join(' + ')}`
    : erosionController.isPaused()
      ? ' · 已暂停'
      : '';

  topTitle.textContent = `${TERRAIN_NAMES[terrain]}${modeText}`;
}

function setActiveButton(buttons: { type: string; btn: HTMLButtonElement }[], activeType: string): void {
  buttons.forEach(({ type, btn }) => {
    if (type === activeType) {
      btn.dataset.active = 'true';
      btn.style.background = 'linear-gradient(135deg, #0f3460, #16213e)';
      btn.style.boxShadow = 'inset 0 1px 4px rgba(74,144,217,0.3)';
    } else {
      btn.dataset.active = 'false';
      btn.style.background = '#1a1a2e';
      btn.style.boxShadow = 'none';
    }
  });
}

function setErosionButton(type: ErosionType, active: boolean): void {
  const item = erosionButtons.find(b => b.type === type);
  if (item) {
    if (active) {
      item.btn.dataset.active = 'true';
      item.btn.style.background = 'linear-gradient(135deg, #0f3460, #16213e)';
      item.btn.style.boxShadow = 'inset 0 1px 4px rgba(74,144,217,0.3)';
    } else {
      item.btn.dataset.active = 'false';
      item.btn.style.background = '#1a1a2e';
      item.btn.style.boxShadow = 'none';
    }
  }
}

function switchTerrain(type: TerrainType): void {
  erosionController.generateTerrain(type);
  setActiveButton(terrainButtons, type);
  updateTopTitle();
}

function toggleErosion(type: ErosionType, active: boolean): void {
  erosionController.toggleErosion(type, active);
  setErosionButton(type, active);
  updateTopTitle();
}

function updatePauseButton(): void {
  if (erosionController.isPaused()) {
    pauseBtn.innerHTML = '<span style="font-size: 16px;">▶</span><span>继续模拟</span>';
  } else {
    pauseBtn.innerHTML = '<span style="font-size: 16px;">⏸</span><span>暂停模拟</span>';
  }
  updateTopTitle();
}

function handleResponsive(): void {
  if (window.innerWidth < 768) {
    mobileToggleBtn.style.display = 'block';
    controlPanel.style.transform = 'translateX(-100%)';
  } else {
    mobileToggleBtn.style.display = 'none';
    controlPanel.style.transform = 'translateX(0)';
  }
}

window.addEventListener('resize', handleResponsive);
handleResponsive();

document.addEventListener('keydown', (e) => {
  if (e.key === '1') switchTerrain('mountain');
  else if (e.key === '2') switchTerrain('plain');
  else if (e.key === '3') switchTerrain('basin');
  else if (e.key === 'r' || e.key === 'R') {
    camera.position.copy(initialCameraPosition);
    controls.target.copy(initialCameraTarget);
    controls.update();
  }
});

setActiveButton(terrainButtons, 'mountain');
updateTopTitle();

let lastTime = performance.now();
let frameCount = 0;
let fpsTimer = 0;

function animate(): void {
  requestAnimationFrame(animate);

  const now = performance.now();
  let dt = (now - lastTime) / 1000;
  lastTime = now;
  dt = Math.min(dt, 0.05);

  const computeStart = performance.now();

  const updateResult = erosionController.update(dt);
  terrainMesh.update(updateResult, erosionController.isErosionActive('rainfall'));
  updateStats(updateResult.stats);

  const computeTime = performance.now() - computeStart;

  if (computeTime > 8 && resolution === 128) {
    resolution = 64;
    erosionController.setResolution(resolution);
    terrainMesh.setResolution(resolution);
  }

  controls.update();
  renderer.render(scene, camera);

  frameCount++;
  fpsTimer += dt;
  if (fpsTimer >= 1) {
    fpsTimer = 0;
    frameCount = 0;
  }
}

animate();
