import { audioEngine, Marker, FFTFrame } from './audioEngine';
import { TerrainRenderer, PRESET_COLORS } from './terrainRenderer';

interface UIState {
  isRecording: boolean;
  markers: Marker[];
  panelExpanded: boolean;
  editingMarker: Marker | null;
}

const state: UIState = {
  isRecording: false,
  markers: [],
  panelExpanded: true,
  editingMarker: null
};

let renderer: TerrainRenderer;
let monitorInterval: number | null = null;

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function createApp(): void {
  const app = document.createElement('div');
  app.id = 'app';
  app.style.cssText = `
    position: relative;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    background: linear-gradient(180deg, #0d1117 0%, #0a0e14 100%);
  `;
  document.body.appendChild(app);
}

function createControlBar(): HTMLDivElement {
  const bar = document.createElement('div');
  bar.id = 'control-bar';
  bar.style.cssText = `
    position: absolute;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 24px;
    padding: 12px 28px;
    background: rgba(13, 17, 23, 0.8);
    backdrop-filter: blur(15px);
    -webkit-backdrop-filter: blur(15px);
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    z-index: 100;
  `;

  const recordBtn = createRecordButton();
  const uploadBtn = createUploadButton();
  const resetBtn = createResetButton();

  bar.appendChild(recordBtn);
  bar.appendChild(uploadBtn);
  bar.appendChild(resetBtn);

  return bar;
}

function styleButton(btn: HTMLButtonElement): void {
  btn.style.cssText = `
    padding: 8px 20px;
    font-size: 14px;
    font-weight: 500;
    color: #c9d1d9;
    background: rgba(88, 166, 255, 0.1);
    border: 1px solid rgba(88, 166, 255, 0.2);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
    font-family: inherit;
  `;
  btn.addEventListener('mouseenter', () => {
    btn.style.background = 'rgba(88, 166, 255, 0.2)';
    btn.style.borderColor = '#58a6ff';
    btn.style.boxShadow = '0 0 12px rgba(88, 166, 255, 0.3)';
    btn.style.color = '#58a6ff';
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.background = 'rgba(88, 166, 255, 0.1)';
    btn.style.borderColor = 'rgba(88, 166, 255, 0.2)';
    btn.style.boxShadow = 'none';
    btn.style.color = '#c9d1d9';
  });
}

function createRecordButton(): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.id = 'record-btn';
  btn.textContent = '录制';
  styleButton(btn);

  btn.addEventListener('click', async () => {
    if (!state.isRecording) {
      try {
        await audioEngine.startRecording();
        state.isRecording = true;
        btn.innerHTML = '<span id="rec-dot" style="display:inline-block;width:8px;height:8px;background:#f85149;border-radius:50%;margin-right:8px;animation:blink 1s infinite;"></span>停止';
        btn.style.background = 'rgba(248, 81, 73, 0.15)';
        btn.style.borderColor = 'rgba(248, 81, 73, 0.4)';
      } catch (e) {
        alert('无法访问麦克风：' + (e as Error).message);
      }
    } else {
      await audioEngine.stopRecording();
      state.isRecording = false;
      btn.textContent = '录制';
      btn.style.background = 'rgba(88, 166, 255, 0.1)';
      btn.style.borderColor = 'rgba(88, 166, 255, 0.2)';
      renderer.setAudioDuration(audioEngine.getDuration());
    }
  });

  return btn;
}

function createUploadButton(): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.textContent = '上传';
  styleButton(btn);

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.wav,.mp3';
  input.style.display = 'none';

  btn.addEventListener('click', () => input.click());
  input.addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      await audioEngine.uploadAudio(file);
    } catch (err) {
      alert((err as Error).message);
    }
    input.value = '';
  });

  btn.appendChild(input);
  return btn;
}

function createResetButton(): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.textContent = '重置';
  styleButton(btn);

  btn.addEventListener('click', () => {
    audioEngine.reset();
    state.markers = [];
    renderer.reset();
    renderer.setMarkers(state.markers);
    updateLayerPanel();
    const recordBtn = document.getElementById('record-btn') as HTMLButtonElement;
    if (recordBtn) {
      recordBtn.textContent = '录制';
      recordBtn.style.background = 'rgba(88, 166, 255, 0.1)';
      recordBtn.style.borderColor = 'rgba(88, 166, 255, 0.2)';
    }
    state.isRecording = false;
  });

  return btn;
}

function createCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.id = 'terrain-canvas';
  canvas.style.cssText = `
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    transform: translateY(-50%);
    width: 100%;
    height: 60%;
    cursor: crosshair;
  `;
  return canvas;
}

function createLayerPanel(): HTMLDivElement {
  const panel = document.createElement('div');
  panel.id = 'layer-panel';
  panel.style.cssText = `
    position: absolute;
    top: 80px;
    left: 0;
    width: 240px;
    max-height: calc(100vh - 120px);
    background: #161b22;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    z-index: 90;
    display: flex;
    transition: transform 0.3s ease;
    overflow: hidden;
  `;

  const content = document.createElement('div');
  content.id = 'panel-content';
  content.style.cssText = `
    flex: 1;
    padding: 16px;
    overflow-y: auto;
    min-width: 200px;
  `;

  const title = document.createElement('div');
  title.textContent = '标记点列表';
  title.style.cssText = `
    font-size: 14px;
    font-weight: 600;
    color: #e6edf3;
    margin-bottom: 12px;
  `;
  content.appendChild(title);

  const list = document.createElement('div');
  list.id = 'marker-list';
  list.style.cssText = 'display: flex; flex-direction: column; gap: 8px;';
  content.appendChild(list);

  const toggle = document.createElement('div');
  toggle.id = 'panel-toggle';
  toggle.innerHTML = '›';
  toggle.style.cssText = `
    width: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    background: rgba(255, 255, 255, 0.03);
    color: #8b949e;
    font-size: 20px;
    user-select: none;
    transition: all 0.2s ease;
  `;
  toggle.addEventListener('mouseenter', () => {
    toggle.style.background = 'rgba(88, 166, 255, 0.1)';
    toggle.style.color = '#58a6ff';
  });
  toggle.addEventListener('mouseleave', () => {
    toggle.style.background = 'rgba(255, 255, 255, 0.03)';
    toggle.style.color = '#8b949e';
  });
  toggle.addEventListener('click', () => {
    state.panelExpanded = !state.panelExpanded;
    if (state.panelExpanded) {
      panel.style.transform = 'translateX(0)';
      toggle.innerHTML = '›';
    } else {
      panel.style.transform = 'translateX(-212px)';
      toggle.innerHTML = '‹';
    }
  });

  panel.appendChild(content);
  panel.appendChild(toggle);
  return panel;
}

function updateLayerPanel(): void {
  const list = document.getElementById('marker-list');
  if (!list) return;
  list.innerHTML = '';

  if (state.markers.length === 0) {
    const empty = document.createElement('div');
    empty.textContent = '暂无标记点';
    empty.style.cssText = `
      color: #6e7681;
      font-size: 12px;
      padding: 20px 0;
      text-align: center;
    `;
    list.appendChild(empty);
    return;
  }

  const sorted = [...state.markers].sort((a, b) => a.time - b.time);

  for (const marker of sorted) {
    const item = document.createElement('div');
    item.style.cssText = `
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.15s ease;
    `;
    item.addEventListener('mouseenter', () => {
      item.style.background = 'rgba(88, 166, 255, 0.1)';
    });
    item.addEventListener('mouseleave', () => {
      item.style.background = 'transparent';
    });
    item.addEventListener('click', () => {
      audioEngine.playSegment(marker.time, 2);
    });

    const dot = document.createElement('div');
    dot.style.cssText = `
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: ${marker.color || '#f85149'};
      flex-shrink: 0;
    `;

    const time = document.createElement('div');
    time.textContent = formatTime(marker.time);
    time.style.cssText = `
      font-size: 12px;
      color: #8b949e;
      font-variant-numeric: tabular-nums;
      min-width: 40px;
    `;

    const note = document.createElement('div');
    note.textContent = marker.note ? marker.note.substring(0, 8) + (marker.note.length > 8 ? '...' : '') : '无备注';
    note.style.cssText = `
      font-size: 12px;
      color: #c9d1d9;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
    `;

    item.appendChild(dot);
    item.appendChild(time);
    item.appendChild(note);
    list.appendChild(item);
  }
}

function createMonitorPanel(): HTMLDivElement {
  const panel = document.createElement('div');
  panel.id = 'monitor-panel';
  panel.style.cssText = `
    position: absolute;
    bottom: 16px;
    right: 16px;
    width: 80px;
    height: 60px;
    background: rgba(22, 27, 35, 0.9);
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    padding: 8px 10px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 4px;
    z-index: 100;
  `;

  const fps = document.createElement('div');
  fps.id = 'fps-display';
  fps.style.cssText = `
    font-size: 12px;
    color: #3fb950;
    font-family: 'Courier New', monospace;
    font-variant-numeric: tabular-nums;
  `;
  fps.textContent = 'FPS: --';

  const samples = document.createElement('div');
  samples.id = 'samples-display';
  samples.style.cssText = `
    font-size: 12px;
    color: #3fb950;
    font-family: 'Courier New', monospace;
    font-variant-numeric: tabular-nums;
  `;
  samples.textContent = 'BUF: --';

  panel.appendChild(fps);
  panel.appendChild(samples);
  return panel;
}

function updateMonitor(): void {
  const fpsEl = document.getElementById('fps-display');
  const samplesEl = document.getElementById('samples-display');
  if (fpsEl) fpsEl.textContent = `FPS: ${renderer ? Math.round(renderer.getFPS()) : 0}`;
  if (samplesEl) samplesEl.textContent = `BUF: ${audioEngine.getSampleCount()}`;
}

function createEditPopup(): HTMLDivElement {
  const popup = document.createElement('div');
  popup.id = 'edit-popup';
  popup.style.cssText = `
    position: absolute;
    display: none;
    background: #1e1e2e;
    border-radius: 8px;
    box-shadow: 2px 2px 12px rgba(0, 0, 0, 0.5);
    padding: 14px;
    z-index: 200;
    min-width: 200px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  `;

  const label = document.createElement('div');
  label.textContent = '备注文字';
  label.style.cssText = `
    font-size: 12px;
    color: #8b949e;
    margin-bottom: 6px;
  `;

  const input = document.createElement('input');
  input.id = 'marker-note-input';
  input.type = 'text';
  input.placeholder = '输入备注...';
  input.style.cssText = `
    width: 100%;
    padding: 6px 10px;
    font-size: 13px;
    background: #0d1117;
    border: 1px solid #30363d;
    border-radius: 6px;
    color: #e6edf3;
    outline: none;
    margin-bottom: 12px;
    font-family: inherit;
    box-sizing: border-box;
  `;
  input.addEventListener('focus', () => {
    input.style.borderColor = '#58a6ff';
  });
  input.addEventListener('blur', () => {
    input.style.borderColor = '#30363d';
  });

  const colorLabel = document.createElement('div');
  colorLabel.textContent = '选择颜色';
  colorLabel.style.cssText = `
    font-size: 12px;
    color: #8b949e;
    margin-bottom: 6px;
  `;

  const colorSelect = document.createElement('select');
  colorSelect.id = 'marker-color-select';
  colorSelect.style.cssText = `
    width: 100%;
    padding: 6px 10px;
    font-size: 13px;
    background: #0d1117;
    border: 1px solid #30363d;
    border-radius: 6px;
    color: #e6edf3;
    outline: none;
    cursor: pointer;
    font-family: inherit;
    box-sizing: border-box;
    margin-bottom: 12px;
  `;

  const colorNames = ['红色', '橙色', '黄色', '绿色', '蓝色', '紫色'];
  PRESET_COLORS.forEach((color, i) => {
    const opt = document.createElement('option');
    opt.value = color;
    opt.textContent = colorNames[i];
    colorSelect.appendChild(opt);
  });

  const saveBtn = document.createElement('button');
  saveBtn.textContent = '保存';
  saveBtn.style.cssText = `
    width: 100%;
    padding: 7px;
    font-size: 13px;
    font-weight: 500;
    background: #238636;
    color: #fff;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.15s ease;
    font-family: inherit;
  `;
  saveBtn.addEventListener('mouseenter', () => {
    saveBtn.style.background = '#2ea043';
  });
  saveBtn.addEventListener('mouseleave', () => {
    saveBtn.style.background = '#238636';
  });
  saveBtn.addEventListener('click', () => {
    saveMarkerEdit();
  });

  popup.appendChild(label);
  popup.appendChild(input);
  popup.appendChild(colorLabel);
  popup.appendChild(colorSelect);
  popup.appendChild(saveBtn);

  return popup;
}

function showEditPopup(marker: Marker, x: number, y: number): void {
  const popup = document.getElementById('edit-popup') as HTMLDivElement;
  const input = document.getElementById('marker-note-input') as HTMLInputElement;
  const select = document.getElementById('marker-color-select') as HTMLSelectElement;
  if (!popup || !input || !select) return;

  state.editingMarker = marker;
  input.value = marker.note || '';
  select.value = marker.color || PRESET_COLORS[0];

  const canvasRect = document.getElementById('terrain-canvas')!.getBoundingClientRect();
  const appRect = document.getElementById('app')!.getBoundingClientRect();
  let left = x + canvasRect.left - appRect.left + 15;
  let top = y + canvasRect.top - appRect.top;

  popup.style.display = 'block';
  const popupRect = popup.getBoundingClientRect();
  if (left + popupRect.width > appRect.width) {
    left = x + canvasRect.left - appRect.left - popupRect.width - 15;
  }
  if (top + popupRect.height > appRect.height) {
    top = appRect.height - popupRect.height - 10;
  }
  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;

  setTimeout(() => input.focus(), 10);
}

function hideEditPopup(): void {
  const popup = document.getElementById('edit-popup');
  if (popup) popup.style.display = 'none';
  state.editingMarker = null;
}

function saveMarkerEdit(): void {
  if (!state.editingMarker) return;
  const input = document.getElementById('marker-note-input') as HTMLInputElement;
  const select = document.getElementById('marker-color-select') as HTMLSelectElement;

  state.editingMarker.note = input.value.trim();
  state.editingMarker.color = select.value;

  renderer.setMarkers(state.markers);
  updateLayerPanel();
  hideEditPopup();
}

function addMarker(time: number): void {
  const marker: Marker = {
    id: generateId(),
    time,
    note: '',
    color: PRESET_COLORS[0]
  };
  state.markers.push(marker);
  renderer.setMarkers(state.markers);
  updateLayerPanel();
}

function setupAudioEvents(): void {
  audioEngine.on('fftData', (frame: FFTFrame) => {
    renderer.addFFTFrame(frame);
  });

  audioEngine.on('audioLoaded', (frames: FFTFrame[]) => {
    renderer.setFFTFrames(frames);
    renderer.setAudioDuration(audioEngine.getDuration());
  });
}

function setupGlobalEvents(): void {
  document.addEventListener('click', (e) => {
    const popup = document.getElementById('edit-popup');
    if (popup && popup.style.display === 'block') {
      if (!popup.contains(e.target as Node)) {
        const target = e.target as HTMLElement;
        if (!target.closest('#terrain-canvas')) {
          hideEditPopup();
        }
      }
    }
  });

  const style = document.createElement('style');
  style.textContent = `
    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }
  `;
  document.head.appendChild(style);
}

function init(): void {
  createApp();
  const app = document.getElementById('app')!;

  const canvas = createCanvas();
  app.appendChild(canvas);

  renderer = new TerrainRenderer(canvas, {
    onMarkerClick: (marker: Marker) => {
      const x = renderer.timeToX(marker.time);
      showEditPopup(marker, x, 30);
    },
    onCanvasClick: (time: number, x: number, y: number) => {
      if (state.editingMarker) {
        hideEditPopup();
        return;
      }
      const marker: Marker = {
        id: generateId(),
        time,
        note: '',
        color: PRESET_COLORS[0]
      };
      state.markers.push(marker);
      renderer.setMarkers(state.markers);
      updateLayerPanel();
      showEditPopup(marker, x, y);
    },
    onHover: () => {}
  });

  app.appendChild(createControlBar());
  app.appendChild(createLayerPanel());
  app.appendChild(createMonitorPanel());
  app.appendChild(createEditPopup());

  setupAudioEvents();
  setupGlobalEvents();
  updateLayerPanel();

  renderer.start();
  monitorInterval = window.setInterval(updateMonitor, 250);
}

init();
