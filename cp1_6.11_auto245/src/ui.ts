import * as THREE from 'three';

export interface UICallbacks {
  onDensityChange: (value: number) => void;
  onSpeedChange: (value: number) => void;
  onPulseChange: (value: number) => void;
  onCapture: () => HTMLCanvasElement;
  getCollisionCount: () => number;
  getStarExists: () => boolean;
  getRenderer: () => THREE.WebGLRenderer;
}

export function setupUI(container: HTMLElement, callbacks: UICallbacks) {
  const style = document.createElement('style');
  style.textContent = `
    .control-panel {
      position: fixed;
      left: 24px;
      top: 50%;
      transform: translateY(-50%);
      width: 240px;
      padding: 24px 20px;
      background: rgba(26, 26, 46, 0.8);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-radius: 16px;
      border: 1px solid rgba(74, 20, 140, 0.3);
      z-index: 100;
      transition: all 0.3s ease;
    }
    
    .control-panel:hover {
      border-color: rgba(74, 20, 140, 0.6);
      box-shadow: 0 0 20px rgba(74, 20, 140, 0.3);
    }
    
    .panel-title {
      color: #e0d0ff;
      font-size: 15px;
      font-weight: 600;
      margin-bottom: 20px;
      letter-spacing: 1px;
      text-align: center;
    }
    
    .slider-group {
      margin-bottom: 18px;
    }
    
    .slider-group:last-child {
      margin-bottom: 0;
    }
    
    .slider-label {
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: #b8a8d8;
      font-size: 12px;
      margin-bottom: 8px;
    }
    
    .slider-value {
      color: #81d4fa;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }
    
    .slider-input {
      width: 100%;
      height: 4px;
      -webkit-appearance: none;
      appearance: none;
      background: rgba(74, 20, 140, 0.4);
      border-radius: 2px;
      outline: none;
      cursor: pointer;
    }
    
    .slider-input::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: linear-gradient(135deg, #81d4fa, #7b1fa2);
      cursor: pointer;
      box-shadow: 0 0 10px rgba(123, 31, 162, 0.6);
      transition: all 0.2s ease;
    }
    
    .slider-input::-webkit-slider-thumb:hover {
      box-shadow: 0 0 15px rgba(123, 31, 162, 0.9);
      transform: scale(1.1);
    }
    
    .slider-input::-moz-range-thumb {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: linear-gradient(135deg, #81d4fa, #7b1fa2);
      cursor: pointer;
      border: none;
      box-shadow: 0 0 10px rgba(123, 31, 162, 0.6);
    }
    
    .record-btn {
      position: fixed;
      right: 24px;
      bottom: 24px;
      padding: 12px 24px;
      background: rgba(26, 26, 46, 0.8);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(74, 20, 140, 0.4);
      border-radius: 24px;
      color: #e0d0ff;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      z-index: 100;
      transition: all 0.3s ease;
    }
    
    .record-btn:hover {
      border-color: rgba(74, 20, 140, 0.8);
      box-shadow: 0 0 20px rgba(74, 20, 140, 0.4);
      color: #ffffff;
    }
    
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(5, 5, 16, 0.85);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s ease;
    }
    
    .modal-overlay.active {
      opacity: 1;
      pointer-events: auto;
    }
    
    .star-map-card {
      width: 860px;
      max-width: 90vw;
      background: rgba(26, 26, 46, 0.95);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-radius: 20px;
      border: 1px solid rgba(74, 20, 140, 0.5);
      box-shadow: 0 0 40px rgba(74, 20, 140, 0.3);
      padding: 24px;
      transform: scale(0.95);
      transition: transform 0.3s ease;
    }
    
    .modal-overlay.active .star-map-card {
      transform: scale(1);
    }
    
    .card-title {
      color: #e0d0ff;
      font-size: 18px;
      font-weight: 600;
      text-align: center;
      margin-bottom: 16px;
      letter-spacing: 2px;
    }
    
    .card-image-container {
      width: 100%;
      aspect-ratio: 4 / 3;
      border-radius: 12px;
      overflow: hidden;
      margin-bottom: 16px;
      border: 1px solid rgba(74, 20, 140, 0.3);
    }
    
    .card-image-container canvas {
      width: 100%;
      height: 100%;
      display: block;
    }
    
    .card-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: #b8a8d8;
      font-size: 13px;
      margin-bottom: 16px;
      padding: 0 4px;
    }
    
    .card-info span strong {
      color: #81d4fa;
      font-weight: 600;
    }
    
    .card-actions {
      display: flex;
      justify-content: center;
      gap: 12px;
    }
    
    .action-btn {
      padding: 10px 28px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s ease;
      border: none;
    }
    
    .download-btn {
      background: linear-gradient(135deg, #7b1fa2, #4a148c);
      color: white;
      box-shadow: 0 2px 10px rgba(123, 31, 162, 0.4);
    }
    
    .download-btn:hover {
      box-shadow: 0 4px 20px rgba(123, 31, 162, 0.6);
      transform: translateY(-1px);
    }
    
    .close-btn {
      background: rgba(74, 20, 140, 0.3);
      color: #b8a8d8;
      border: 1px solid rgba(74, 20, 140, 0.4);
    }
    
    .close-btn:hover {
      background: rgba(74, 20, 140, 0.5);
      color: #e0d0ff;
    }
    
    @media (max-width: 1024px) {
      .control-panel {
        left: 50%;
        top: auto;
        bottom: 16px;
        transform: translateX(-50%);
        width: calc(100% - 32px);
        max-width: 600px;
        padding: 16px 20px;
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        justify-content: center;
      }
      
      .panel-title {
        width: 100%;
        margin-bottom: 8px;
      }
      
      .slider-group {
        flex: 1;
        min-width: 140px;
        margin-bottom: 0;
      }
      
      .record-btn {
        right: 16px;
        bottom: 80px;
      }
    }
    
    @media (max-width: 640px) {
      .control-panel {
        padding: 12px 16px;
      }
      
      .slider-group {
        min-width: 100px;
      }
      
      .panel-title {
        font-size: 13px;
      }
      
      .slider-label {
        font-size: 11px;
      }
    }
  `;
  document.head.appendChild(style);

  const panel = document.createElement('div');
  panel.className = 'control-panel';
  panel.innerHTML = `
    <div class="panel-title">✦ 星云控制台 ✦</div>
    
    <div class="slider-group">
      <div class="slider-label">
        <span>星云密度</span>
        <span class="slider-value" id="density-value">1.0</span>
      </div>
      <input type="range" class="slider-input" id="density-slider" 
             min="0.5" max="3.0" step="0.1" value="1.0">
    </div>
    
    <div class="slider-group">
      <div class="slider-label">
        <span>碰撞速度</span>
        <span class="slider-value" id="speed-value">1.0</span>
      </div>
      <input type="range" class="slider-input" id="speed-slider" 
             min="0.2" max="2.0" step="0.1" value="1.0">
    </div>
    
    <div class="slider-group">
      <div class="slider-label">
        <span>脉动频率</span>
        <span class="slider-value" id="pulse-value">1.0</span>
      </div>
      <input type="range" class="slider-input" id="pulse-slider" 
             min="0.2" max="2.0" step="0.1" value="1.0">
    </div>
  `;
  container.appendChild(panel);

  const recordBtn = document.createElement('button');
  recordBtn.className = 'record-btn';
  recordBtn.textContent = '📷 记录星图';
  container.appendChild(recordBtn);

  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'modal-overlay';
  modalOverlay.innerHTML = `
    <div class="star-map-card">
      <div class="card-title">✧ 星图档案 ✧</div>
      <div class="card-image-container">
        <canvas id="star-map-canvas" width="800" height="600"></canvas>
      </div>
      <div class="card-info">
        <span>生成时间：<strong id="capture-time">-</strong></span>
        <span>碰撞次数：<strong id="collision-count">0</strong></span>
      </div>
      <div class="card-actions">
        <button class="action-btn close-btn" id="close-modal">关闭</button>
        <button class="action-btn download-btn" id="download-btn">下载为PNG</button>
      </div>
    </div>
  `;
  container.appendChild(modalOverlay);

  const densitySlider = document.getElementById('density-slider') as HTMLInputElement;
  const densityValue = document.getElementById('density-value') as HTMLSpanElement;
  const speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
  const speedValue = document.getElementById('speed-value') as HTMLSpanElement;
  const pulseSlider = document.getElementById('pulse-slider') as HTMLInputElement;
  const pulseValue = document.getElementById('pulse-value') as HTMLSpanElement;
  const captureTimeEl = document.getElementById('capture-time') as HTMLElement;
  const collisionCountEl = document.getElementById('collision-count') as HTMLElement;
  const starMapCanvas = document.getElementById('star-map-canvas') as HTMLCanvasElement;
  const closeModalBtn = document.getElementById('close-modal') as HTMLButtonElement;
  const downloadBtn = document.getElementById('download-btn') as HTMLButtonElement;

  densitySlider.addEventListener('input', () => {
    const value = parseFloat(densitySlider.value);
    densityValue.textContent = value.toFixed(1);
    callbacks.onDensityChange(value);
  });

  speedSlider.addEventListener('input', () => {
    const value = parseFloat(speedSlider.value);
    speedValue.textContent = value.toFixed(1);
    callbacks.onSpeedChange(value);
  });

  pulseSlider.addEventListener('input', () => {
    const value = parseFloat(pulseSlider.value);
    pulseValue.textContent = value.toFixed(1);
    callbacks.onPulseChange(value);
  });

  recordBtn.addEventListener('click', () => {
    const capturedCanvas = callbacks.onCapture();
    const ctx = starMapCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, 800, 600);
    ctx.drawImage(capturedCanvas, 0, 0);

    const now = new Date();
    const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    captureTimeEl.textContent = timeStr;
    collisionCountEl.textContent = String(callbacks.getCollisionCount());

    modalOverlay.classList.add('active');
  });

  closeModalBtn.addEventListener('click', () => {
    modalOverlay.classList.remove('active');
  });

  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      modalOverlay.classList.remove('active');
    }
  });

  downloadBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = `star-map-${Date.now()}.png`;
    link.href = starMapCanvas.toDataURL('image/png');
    link.click();
  });
}
