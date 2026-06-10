import { AsteroidData, MAJOR_ASTEROIDS, SPECTRAL_COLORS, SPECTRAL_NAMES } from './data';
import { SceneManager } from './scene';

export interface UIController {
  init(sceneManager: SceneManager): void;
  getPlaying(): boolean;
  getTimeScale(): number;
  setSimDate(date: Date): void;
  onAsteroidSelect(callback: (asteroid: AsteroidData | null) => void): void;
  onPlayToggle(callback: () => void): void;
  onTimeScaleChange(callback: (scale: number) => void): void;
}

export function createUIController(): UIController {
  let playing = true;
  let timeScale = 1;
  let selectCallback: ((asteroid: AsteroidData | null) => void) | null = null;
  let playToggleCallback: (() => void) | null = null;
  let timeScaleCallback: ((scale: number) => void) | null = null;

  let playBtn: HTMLButtonElement;
  let speedSlider: HTMLInputElement;
  let dateDisplay: HTMLSpanElement;
  let infoPanel: HTMLDivElement;
  let selectedAsteroid: AsteroidData | null = null;

  function init(sceneManager: SceneManager): void {
    createLegend();
    createTimeControl();
    createInfoPanel();
    setupInteraction(sceneManager);
  }

  function createLegend(): void {
    const container = document.createElement('div');
    container.className = 'glass-panel';
    container.style.cssText = `
      position: absolute;
      top: 20px;
      left: 20px;
      padding: 12px 16px;
      border-radius: 8px;
      color: white;
      font-size: 13px;
      z-index: 10;
      user-select: none;
    `;

    const title = document.createElement('div');
    title.textContent = '图例';
    title.style.fontWeight = '600';
    title.style.marginBottom = '8px';
    title.style.fontSize = '14px';
    container.appendChild(title);

    for (const ast of MAJOR_ASTEROIDS) {
      const row = document.createElement('div');
      row.style.cssText = `
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 3px 0;
      `;

      const dot = document.createElement('span');
      const colorHex = '#' + SPECTRAL_COLORS[ast.spectralType].toString(16).padStart(6, '0');
      dot.style.cssText = `
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: ${colorHex};
        display: inline-block;
        flex-shrink: 0;
      `;

      const label = document.createElement('span');
      label.textContent = `${ast.nameCn}（${ast.name}）- ${SPECTRAL_NAMES[ast.spectralType]}`;

      row.appendChild(dot);
      row.appendChild(label);
      container.appendChild(row);
    }

    document.getElementById('app')!.appendChild(container);
  }

  function createTimeControl(): void {
    const container = document.createElement('div');
    container.className = 'glass-panel';
    container.style.cssText = `
      position: absolute;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%);
      width: 80%;
      max-width: 800px;
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 12px 20px;
      border-radius: 8px;
      z-index: 10;
      color: white;
      background: rgba(0, 0, 0, 0.6);
    `;

    playBtn = document.createElement('button');
    playBtn.style.cssText = `
      width: 30px;
      height: 30px;
      border-radius: 50%;
      border: none;
      background: #4ecdc4;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      padding: 0;
      transition: transform 0.1s;
    `;
    updatePlayButton();
    playBtn.addEventListener('click', () => {
      playing = !playing;
      updatePlayButton();
      if (playToggleCallback) playToggleCallback();
    });
    playBtn.addEventListener('mousedown', (e) => e.preventDefault());
    container.appendChild(playBtn);

    const sliderContainer = document.createElement('div');
    sliderContainer.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
    `;

    const speedLabel = document.createElement('span');
    speedLabel.textContent = '1x';
    speedLabel.style.cssText = 'font-size: 12px; min-width: 30px;';
    sliderContainer.appendChild(speedLabel);

    speedSlider = document.createElement('input');
    speedSlider.type = 'range';
    speedSlider.min = '1';
    speedSlider.max = '100';
    speedSlider.value = '1';
    speedSlider.style.cssText = `
      flex: 1;
      height: 4px;
      -webkit-appearance: none;
      appearance: none;
      background: rgba(255,255,255,0.2);
      border-radius: 2px;
      outline: none;
      cursor: pointer;
    `;
    speedSlider.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      timeScale = parseInt(target.value, 10);
      speedLabel.textContent = `${timeScale}x`;
      if (timeScaleCallback) timeScaleCallback(timeScale);
    });
    sliderContainer.appendChild(speedSlider);

    const speedLabelMax = document.createElement('span');
    speedLabelMax.textContent = '100x';
    speedLabelMax.style.cssText = 'font-size: 12px; min-width: 35px;';
    sliderContainer.appendChild(speedLabelMax);

    container.appendChild(sliderContainer);

    dateDisplay = document.createElement('span');
    dateDisplay.style.cssText = `
      font-size: 14px;
      font-family: monospace;
      color: #4ecdc4;
      font-weight: 500;
      min-width: 110px;
      text-align: right;
    `;
    dateDisplay.textContent = formatDate(new Date());
    container.appendChild(dateDisplay);

    const sliderStyle = document.createElement('style');
    sliderStyle.textContent = `
      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #4ecdc4;
        cursor: pointer;
        border: 2px solid white;
      }
      input[type="range"]::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #4ecdc4;
        cursor: pointer;
        border: 2px solid white;
      }
    `;
    document.head.appendChild(sliderStyle);

    document.getElementById('app')!.appendChild(container);
  }

  function updatePlayButton(): void {
    if (playing) {
      playBtn.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 12 12" fill="white">
          <rect x="2" y="2" width="3" height="8"/>
          <rect x="7" y="2" width="3" height="8"/>
        </svg>
      `;
    } else {
      playBtn.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 12 12" fill="white">
          <polygon points="3,1 11,6 3,11"/>
        </svg>
      `;
    }
  }

  function createInfoPanel(): void {
    infoPanel = document.createElement('div');
    infoPanel.className = 'glass-panel';
    infoPanel.style.cssText = `
      position: absolute;
      top: 20px;
      right: 20px;
      width: 260px;
      border-radius: 10px;
      padding: 20px;
      z-index: 10;
      color: white;
      display: none;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
    `;
    document.getElementById('app')!.appendChild(infoPanel);
  }

  function showAsteroidInfo(asteroid: AsteroidData): void {
    selectedAsteroid = asteroid;
    infoPanel.style.display = 'block';

    const colorHex = '#' + SPECTRAL_COLORS[asteroid.spectralType].toString(16).padStart(6, '0');

    infoPanel.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px; margin-bottom:16px;">
        <div style="width:20px; height:20px; border-radius:50%; background:${colorHex}; flex-shrink:0;"></div>
        <div>
          <div style="font-size:18px; font-weight:600;">${asteroid.nameCn}</div>
          <div style="font-size:12px; color:#888;">${asteroid.name}</div>
        </div>
        <button id="close-info" style="margin-left:auto; background:none; border:none; color:#888; cursor:pointer; font-size:18px; padding:4px 8px;">×</button>
      </div>
      <div style="font-size:12px; color:#4ecdc4; margin-bottom:12px; font-weight:500;">${SPECTRAL_NAMES[asteroid.spectralType]}</div>
      <div style="display:flex; flex-direction:column; gap:8px; font-size:13px;">
        <div style="display:flex; justify-content:space-between;">
          <span style="color:#888;">直径</span>
          <span>${asteroid.diameter.toFixed(1)} km</span>
        </div>
        <div style="display:flex; justify-content:space-between;">
          <span style="color:#888;">质量</span>
          <span>${asteroid.mass}</span>
        </div>
        <div style="display:flex; justify-content:space-between;">
          <span style="color:#888;">公转周期</span>
          <span>${asteroid.orbitalPeriod.toFixed(2)} 年</span>
        </div>
        <div style="display:flex; justify-content:space-between;">
          <span style="color:#888;">发现日期</span>
          <span>${formatDisplayDate(asteroid.discoveryDate)}</span>
        </div>
      </div>
      <div style="margin-top:16px; padding-top:16px; border-top:1px solid rgba(255,255,255,0.1);">
        <div style="font-size:12px; color:#888; margin-bottom:6px;">简介</div>
        <div style="font-size:13px; line-height:1.6; color:#ccc;">${asteroid.description}</div>
      </div>
    `;

    const closeBtn = infoPanel.querySelector('#close-info');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        hideAsteroidInfo();
        if (selectCallback) selectCallback(null);
      });
    }
  }

  function hideAsteroidInfo(): void {
    selectedAsteroid = null;
    infoPanel.style.display = 'none';
  }

  function setupInteraction(sceneManager: SceneManager): void {
    const canvas = sceneManager.renderer.domElement;

    canvas.addEventListener('click', (event) => {
      const rect = canvas.getBoundingClientRect();
      const mouse = {
        x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
        y: -((event.clientY - rect.top) / rect.height) * 2 + 1
      };

      sceneManager.raycaster.setFromCamera(mouse as any, sceneManager.camera);
      const intersects = sceneManager.raycaster.intersectObjects(sceneManager.asteroidMeshes);

      if (intersects.length > 0) {
        const asteroid = sceneManager.getAsteroidAtIntersection(intersects);
        if (asteroid) {
          if (selectCallback) selectCallback(asteroid);
        }
      }
    });
  }

  function formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function formatDisplayDate(dateStr: string): string {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[0]}年${parseInt(parts[1])}月${parseInt(parts[2])}日`;
    }
    return dateStr;
  }

  function getPlaying(): boolean {
    return playing;
  }

  function getTimeScale(): number {
    return timeScale;
  }

  function setSimDate(date: Date): void {
    if (dateDisplay) {
      dateDisplay.textContent = formatDate(date);
    }
  }

  function onAsteroidSelect(callback: (asteroid: AsteroidData | null) => void): void {
    selectCallback = (asteroid) => {
      if (asteroid) {
        showAsteroidInfo(asteroid);
      } else {
        hideAsteroidInfo();
      }
      callback(asteroid);
    };
  }

  function onPlayToggle(callback: () => void): void {
    playToggleCallback = callback;
  }

  function onTimeScaleChange(callback: (scale: number) => void): void {
    timeScaleCallback = callback;
  }

  return {
    init,
    getPlaying,
    getTimeScale,
    setSimDate,
    onAsteroidSelect,
    onPlayToggle,
    onTimeScaleChange
  };
}
