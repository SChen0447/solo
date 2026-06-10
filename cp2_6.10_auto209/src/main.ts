import { Character, PALETTE, GRID_SIZE, MAX_FRAMES, type TemplateName, type PixelFrame } from './character';
import { AnimationPlayer, type PlaybackState } from './animation';

const PIXEL_SIZE = 6;
const THUMB_SIZE = 80;
const THUMB_PIXEL = THUMB_SIZE / GRID_SIZE;
const PREVIEW_SIZE = 320;
const PREVIEW_SCALE = PREVIEW_SIZE / GRID_SIZE;

const app = document.getElementById('app')!;

const character = new Character();

let selectedColor: string = PALETTE[0];
let toolMode: 'paint' | 'erase' = 'paint';
let isDrawing: boolean = false;

function createEl<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  styles?: Partial<CSSStyleDeclaration>
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (styles) {
    Object.assign(el.style, styles);
  }
  return el;
}

function renderFrameToCanvas(
  ctx: CanvasRenderingContext2D,
  frame: PixelFrame,
  pixelSize: number,
  offsetX: number = 0,
  offsetY: number = 0,
  bgColor?: string
): void {
  if (bgColor) {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, GRID_SIZE * pixelSize, GRID_SIZE * pixelSize);
  }
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const color = frame[y][x];
      if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(
          offsetX + x * pixelSize,
          offsetY + y * pixelSize,
          pixelSize,
          pixelSize
        );
      }
    }
  }
}

const styles = `
  .psw-toolbar {
    height: 48px;
    background: #1b1b32;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 20px;
    flex-shrink: 0;
  }
  .psw-title {
    font-size: 18px;
    color: rgba(241, 250, 238, 0.85);
    font-weight: 500;
    letter-spacing: 2px;
    text-align: center;
    flex: 1;
  }
  .psw-btn {
    padding: 8px 16px;
    border: none;
    border-radius: 8px;
    background: #3d405b;
    color: #f1faee;
    font-size: 13px;
    cursor: pointer;
    transition: filter 0.15s ease;
  }
  .psw-btn:hover {
    filter: brightness(1.15);
  }
  .psw-btn.primary {
    background: #2a9d8f;
  }
  .psw-btn.small {
    padding: 5px 10px;
    font-size: 12px;
  }
  .psw-btn.active {
    background: #e9c46a;
    color: #1b1b32;
  }
  .psw-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    filter: none !important;
  }
  .psw-main {
    flex: 1;
    display: flex;
    overflow: hidden;
    min-height: 0;
  }
  .psw-editor-panel {
    width: 260px;
    flex-shrink: 0;
    padding: 16px;
    background: #12122a;
    display: flex;
    flex-direction: column;
    gap: 14px;
    overflow-y: auto;
    border-right: 2px dashed #3d3d5c;
  }
  .psw-preview-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 16px;
    min-width: 0;
  }
  .psw-frames-panel {
    width: 240px;
    flex-shrink: 0;
    padding: 16px;
    background: #12122a;
    display: flex;
    flex-direction: column;
    gap: 12px;
    overflow-y: auto;
    border-left: 2px dashed #3d3d5c;
  }
  .psw-section-label {
    font-size: 12px;
    color: #b0b0c0;
    margin-bottom: 4px;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .psw-palette {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 6px;
  }
  .psw-palette-color {
    width: 100%;
    aspect-ratio: 1;
    border-radius: 6px;
    cursor: pointer;
    border: 2px solid transparent;
    transition: border-color 0.15s ease, transform 0.15s ease;
  }
  .psw-palette-color:hover {
    transform: scale(1.05);
  }
  .psw-palette-color.selected {
    border-color: #f1faee;
    box-shadow: 0 0 8px rgba(241, 250, 238, 0.5);
  }
  .psw-tool-row {
    display: flex;
    gap: 8px;
  }
  .psw-tool-row .psw-btn {
    flex: 1;
  }
  .psw-editor-grid-wrap {
    position: relative;
    display: flex;
    justify-content: center;
  }
  .psw-editor-canvas {
    image-rendering: pixelated;
    image-rendering: crisp-edges;
    cursor: crosshair;
    background: #2d2d44;
    border-radius: 4px;
  }
  .psw-preview-wrap {
    position: relative;
    width: 320px;
    height: 320px;
    border-radius: 12px;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .psw-preview-canvas {
    image-rendering: pixelated;
    image-rendering: crisp-edges;
  }
  .psw-controls {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-top: 20px;
  }
  .psw-circle-btn {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: #3d405b;
    border: none;
    color: #f1faee;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    transition: box-shadow 0.2s ease, filter 0.2s ease;
    box-shadow: 0 0 0 rgba(233, 196, 106, 0);
  }
  .psw-circle-btn:hover {
    filter: brightness(1.15);
    box-shadow: 0 0 12px rgba(233, 196, 106, 0.6);
  }
  .psw-circle-btn.active {
    background: #e9c46a;
    color: #1b1b32;
  }
  .psw-speed-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #b0b0c0;
    font-size: 12px;
  }
  .psw-speed-slider {
    width: 120px;
    accent-color: #2a9d8f;
  }
  .psw-frames-list {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
  .psw-frame-thumb {
    position: relative;
    aspect-ratio: 1;
    border-radius: 8px;
    overflow: hidden;
    cursor: pointer;
    border: 2px solid transparent;
    background: #2d2d44;
    transition: border-color 0.15s ease;
  }
  .psw-frame-thumb:hover {
    border-color: #6d6d8c;
  }
  .psw-frame-thumb.selected {
    border-color: #e9c46a;
    box-shadow: 0 0 10px rgba(233, 196, 106, 0.5);
  }
  .psw-frame-thumb canvas {
    width: 100%;
    height: 100%;
    image-rendering: pixelated;
    display: block;
  }
  .psw-frame-index {
    position: absolute;
    top: 2px;
    left: 4px;
    font-size: 10px;
    color: #f1faee;
    background: rgba(0, 0, 0, 0.5);
    padding: 1px 4px;
    border-radius: 3px;
  }
  .psw-frame-btns {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }
  .psw-frame-btns .psw-btn {
    flex: 1;
    min-width: 70px;
  }
  .psw-statusbar {
    height: 28px;
    background: #1b1b32;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 20px;
    font-size: 12px;
    color: #b0b0c0;
    flex-shrink: 0;
  }
  .psw-templates-row {
    display: flex;
    gap: 6px;
  }
  .psw-templates-row .psw-btn {
    flex: 1;
  }
  @media (max-width: 900px) {
    .psw-main {
      flex-direction: column;
    }
    .psw-editor-panel {
      width: 100%;
      border-right: none;
      border-bottom: 2px dashed #3d3d5c;
      max-height: 280px;
    }
    .psw-frames-panel {
      width: 100%;
      border-left: none;
      border-top: 2px dashed #3d3d5c;
      max-height: 240px;
    }
    .psw-frames-list {
      grid-template-columns: repeat(4, 1fr);
    }
  }
`;

const styleEl = document.createElement('style');
styleEl.textContent = styles;
document.head.appendChild(styleEl);

const toolbar = createEl('div', 'psw-toolbar');
const title = createEl('div', 'psw-title');
title.textContent = '像素精灵工坊';

const tbLeft = createEl('div');
tbLeft.style.display = 'flex';
tbLeft.style.gap = '8px';
const tplWarrior = createEl('button', 'psw-btn small');
tplWarrior.textContent = '战士';
const tplMage = createEl('button', 'psw-btn small');
tplMage.textContent = '法师';
const tplArcher = createEl('button', 'psw-btn small');
tplArcher.textContent = '弓箭手';
tbLeft.appendChild(tplWarrior);
tbLeft.appendChild(tplMage);
tbLeft.appendChild(tplArcher);

const tbRight = createEl('div');
const exportBtn = createEl('button', 'psw-btn primary small');
exportBtn.textContent = '导出 PNG';
tbRight.appendChild(exportBtn);

toolbar.appendChild(tbLeft);
toolbar.appendChild(title);
toolbar.appendChild(tbRight);

const main = createEl('div', 'psw-main');

const editorPanel = createEl('div', 'psw-editor-panel');

const paletteLabel = createEl('div', 'psw-section-label');
paletteLabel.textContent = '调色板';
const paletteWrap = createEl('div', 'psw-palette');
PALETTE.forEach((color, idx) => {
  const swatch = createEl('div', 'psw-palette-color');
  swatch.style.backgroundColor = color;
  if (idx === 0) swatch.classList.add('selected');
  swatch.addEventListener('click', () => {
    selectedColor = color;
    toolMode = 'paint';
    paintBtn.classList.add('active');
    eraseBtn.classList.remove('active');
    document.querySelectorAll('.psw-palette-color').forEach(el => el.classList.remove('selected'));
    swatch.classList.add('selected');
  });
  paletteWrap.appendChild(swatch);
});

const toolsLabel = createEl('div', 'psw-section-label');
toolsLabel.textContent = '工具';
const toolRow = createEl('div', 'psw-tool-row');
const paintBtn = createEl('button', 'psw-btn active');
paintBtn.textContent = '涂色';
const eraseBtn = createEl('button', 'psw-btn');
eraseBtn.textContent = '擦除';
toolRow.appendChild(paintBtn);
toolRow.appendChild(eraseBtn);

paintBtn.addEventListener('click', () => {
  toolMode = 'paint';
  paintBtn.classList.add('active');
  eraseBtn.classList.remove('active');
});
eraseBtn.addEventListener('click', () => {
  toolMode = 'erase';
  paintBtn.classList.remove('active');
  eraseBtn.classList.add('active');
});

const editorLabel = createEl('div', 'psw-section-label');
editorLabel.textContent = '像素编辑区';
const editorGridWrap = createEl('div', 'psw-editor-grid-wrap');
const editorCanvas = createEl('canvas', 'psw-editor-canvas');
editorCanvas.width = GRID_SIZE * PIXEL_SIZE;
editorCanvas.height = GRID_SIZE * PIXEL_SIZE;
editorGridWrap.appendChild(editorCanvas);
const editorCtx = editorCanvas.getContext('2d')!;
editorCtx.imageSmoothingEnabled = false;

editorPanel.appendChild(paletteLabel);
editorPanel.appendChild(paletteWrap);
editorPanel.appendChild(toolsLabel);
editorPanel.appendChild(toolRow);
editorPanel.appendChild(editorLabel);
editorPanel.appendChild(editorGridWrap);

const previewPanel = createEl('div', 'psw-preview-panel');
const previewWrap = createEl('div', 'psw-preview-wrap');
const previewCanvas = createEl('canvas', 'psw-preview-canvas');
previewCanvas.width = PREVIEW_SIZE;
previewCanvas.height = PREVIEW_SIZE;
previewWrap.appendChild(previewCanvas);

const controls = createEl('div', 'psw-controls');
const playBtn = createEl('button', 'psw-circle-btn');
playBtn.innerHTML = '▶';
playBtn.title = '播放';
const pauseBtn = createEl('button', 'psw-circle-btn');
pauseBtn.innerHTML = '⏸';
pauseBtn.title = '暂停';
const stopBtn = createEl('button', 'psw-circle-btn');
stopBtn.innerHTML = '⏹';
stopBtn.title = '停止';
const speedWrap = createEl('div', 'psw-speed-wrap');
const speedLabel = createEl('span');
speedLabel.textContent = '速度';
const speedSlider = createEl('input', 'psw-speed-slider');
speedSlider.type = 'range';
speedSlider.min = '100';
speedSlider.max = '1000';
speedSlider.step = '50';
speedSlider.value = '200';
const speedValue = createEl('span');
speedValue.textContent = '0.2s';
speedValue.style.minWidth = '34px';
speedValue.style.textAlign = 'right';
speedWrap.appendChild(speedLabel);
speedWrap.appendChild(speedSlider);
speedWrap.appendChild(speedValue);

controls.appendChild(playBtn);
controls.appendChild(pauseBtn);
controls.appendChild(stopBtn);
controls.appendChild(speedWrap);

previewPanel.appendChild(previewWrap);
previewPanel.appendChild(controls);

const framesPanel = createEl('div', 'psw-frames-panel');
const framesLabel = createEl('div', 'psw-section-label');
framesLabel.textContent = `帧 (0/${MAX_FRAMES})`;
const framesBtns = createEl('div', 'psw-frame-btns');
const addFrameBtn = createEl('button', 'psw-btn small');
addFrameBtn.textContent = '新建';
const dupFrameBtn = createEl('button', 'psw-btn small');
dupFrameBtn.textContent = '复制';
const delFrameBtn = createEl('button', 'psw-btn small');
delFrameBtn.textContent = '删除';
const clearFrameBtn = createEl('button', 'psw-btn small');
clearFrameBtn.textContent = '清空';
framesBtns.appendChild(addFrameBtn);
framesBtns.appendChild(dupFrameBtn);
framesBtns.appendChild(delFrameBtn);
framesBtns.appendChild(clearFrameBtn);

const framesList = createEl('div', 'psw-frames-list');

framesPanel.appendChild(framesLabel);
framesPanel.appendChild(framesBtns);
framesPanel.appendChild(framesList);

main.appendChild(editorPanel);
main.appendChild(previewPanel);
main.appendChild(framesPanel);

const statusbar = createEl('div', 'psw-statusbar');
const statusLeft = createEl('span');
statusLeft.textContent = '帧: 1/1';
const statusRight = createEl('span');
statusRight.textContent = '状态: 已停止';
statusbar.appendChild(statusLeft);
statusbar.appendChild(statusRight);

app.appendChild(toolbar);
app.appendChild(main);
app.appendChild(statusbar);

const player = new AnimationPlayer(previewCanvas);
player.setScale(PREVIEW_SCALE);
player.setFrames(character.getFrames());

function renderEditor(): void {
  const frame = character.getCurrentFrame();
  editorCtx.fillStyle = '#2d2d44';
  editorCtx.fillRect(0, 0, editorCanvas.width, editorCanvas.height);
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const color = frame[y][x];
      if (color) {
        editorCtx.fillStyle = color;
        editorCtx.fillRect(x * PIXEL_SIZE, y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
      }
    }
  }
  editorCtx.strokeStyle = 'rgba(255,255,255,0.08)';
  editorCtx.lineWidth = 1;
  for (let i = 0; i <= GRID_SIZE; i++) {
    editorCtx.beginPath();
    editorCtx.moveTo(i * PIXEL_SIZE, 0);
    editorCtx.lineTo(i * PIXEL_SIZE, GRID_SIZE * PIXEL_SIZE);
    editorCtx.stroke();
    editorCtx.beginPath();
    editorCtx.moveTo(0, i * PIXEL_SIZE);
    editorCtx.lineTo(GRID_SIZE * PIXEL_SIZE, i * PIXEL_SIZE);
    editorCtx.stroke();
  }
}

function renderThumbnails(): void {
  framesList.innerHTML = '';
  const frames = character.getFrames();
  const currentIdx = character.getCurrentFrameIndex();
  frames.forEach((frame, idx) => {
    const thumb = createEl('div', 'psw-frame-thumb');
    if (idx === currentIdx) thumb.classList.add('selected');
    const cv = createEl('canvas');
    cv.width = GRID_SIZE * THUMB_PIXEL;
    cv.height = GRID_SIZE * THUMB_PIXEL;
    const tctx = cv.getContext('2d')!;
    tctx.imageSmoothingEnabled = false;
    renderFrameToCanvas(tctx, frame, THUMB_PIXEL, 0, 0, '#2d2d44');
    const idxLabel = createEl('div', 'psw-frame-index');
    idxLabel.textContent = String(idx + 1);
    thumb.appendChild(cv);
    thumb.appendChild(idxLabel);
    thumb.addEventListener('click', () => {
      character.setCurrentFrameIndex(idx);
      player.setFrames(character.getFrames());
      player.renderFrame(idx);
      refreshAll();
    });
    framesList.appendChild(thumb);
  });
  framesLabel.textContent = `帧 (${character.getFrameCount()}/${MAX_FRAMES})`;
}

function refreshAll(): void {
  renderEditor();
  renderThumbnails();
  statusLeft.textContent = `帧: ${character.getCurrentFrameIndex() + 1}/${character.getFrameCount()}`;
  addFrameBtn.disabled = character.getFrameCount() >= MAX_FRAMES;
  dupFrameBtn.disabled = character.getFrameCount() >= MAX_FRAMES;
  delFrameBtn.disabled = character.getFrameCount() <= 1;
}

function handlePixelClick(e: MouseEvent): void {
  const rect = editorCanvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / PIXEL_SIZE);
  const y = Math.floor((e.clientY - rect.top) / PIXEL_SIZE);
  if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return;
  const color = toolMode === 'erase' ? null : selectedColor;
  character.setPixel(x, y, color);
  renderEditor();
  player.setFrames(character.getFrames());
  renderThumbnails();
}

editorCanvas.addEventListener('mousedown', (e) => {
  isDrawing = true;
  handlePixelClick(e);
});
editorCanvas.addEventListener('mousemove', (e) => {
  if (isDrawing) handlePixelClick(e);
});
editorCanvas.addEventListener('mouseleave', () => { isDrawing = false; });
editorCanvas.addEventListener('mouseup', () => { isDrawing = false; });

playBtn.addEventListener('click', () => {
  player.play();
});
pauseBtn.addEventListener('click', () => {
  player.pause();
});
stopBtn.addEventListener('click', () => {
  player.stop();
});

speedSlider.addEventListener('input', () => {
  const val = parseInt(speedSlider.value, 10);
  player.setFrameInterval(val);
  speedValue.textContent = (val / 1000).toFixed(1) + 's';
});

player.setOnFrameChange((idx) => {
  character.setCurrentFrameIndex(idx);
  renderThumbnails();
  statusLeft.textContent = `帧: ${idx + 1}/${character.getFrameCount()}`;
});

player.setOnStateChange((state: PlaybackState) => {
  playBtn.classList.toggle('active', state === 'playing');
  pauseBtn.classList.toggle('active', state === 'paused');
  const label = state === 'playing' ? '播放中' : state === 'paused' ? '已暂停' : '已停止';
  statusRight.textContent = `状态: ${label}`;
});

addFrameBtn.addEventListener('click', () => {
  if (character.addFrame()) {
    player.setFrames(character.getFrames());
    player.stop();
    refreshAll();
  }
});
dupFrameBtn.addEventListener('click', () => {
  if (character.duplicateFrame()) {
    player.setFrames(character.getFrames());
    player.stop();
    refreshAll();
  }
});
delFrameBtn.addEventListener('click', () => {
  if (character.deleteFrame()) {
    player.setFrames(character.getFrames());
    player.stop();
    refreshAll();
  }
});
clearFrameBtn.addEventListener('click', () => {
  character.clearCurrentFrame();
  player.setFrames(character.getFrames());
  renderEditor();
  renderThumbnails();
});

function loadTemplate(name: TemplateName): void {
  character.loadTemplate(name);
  player.setFrames(character.getFrames());
  player.stop();
  refreshAll();
}

tplWarrior.addEventListener('click', () => loadTemplate('warrior'));
tplMage.addEventListener('click', () => loadTemplate('mage'));
tplArcher.addEventListener('click', () => loadTemplate('archer'));

exportBtn.addEventListener('click', () => {
  const spriteCanvas = character.exportSpriteSheet(16);
  const link = document.createElement('a');
  link.download = 'pixel-sprite.png';
  link.href = spriteCanvas.toDataURL('image/png');
  link.click();
});

refreshAll();
