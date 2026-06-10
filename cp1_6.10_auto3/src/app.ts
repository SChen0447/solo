import './components/color-card';
import {
  parseColor,
  rgbToHex,
  deltaE,
  deltaEGradient,
  type RgbColor
} from './color-utils';

interface ColorEntry {
  raw: string;
  rgb: RgbColor | null;
  name: string;
}

const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: block;
      width: 100%;
      min-height: 100vh;
      background: #1a1a2e;
      color: #e0e0e0;
    }

    .header {
      padding: 20px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      flex-wrap: wrap;
      gap: 12px;
    }

    .title {
      font-size: 20px;
      font-weight: 700;
      color: #e0e0e0;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .title-dot {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: linear-gradient(135deg, #64b5f6, #ce93d8);
    }

    .actions {
      display: flex;
      gap: 10px;
    }

    .btn {
      background: #16213e;
      color: #e0e0e0;
      border: 1px solid rgba(255, 255, 255, 0.08);
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s ease, transform 0.15s ease;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .btn:hover {
      background: #1f2d4d;
    }

    .btn:active {
      transform: scale(0.97);
    }

    .btn.primary {
      background: linear-gradient(135deg, #3f51b5, #5c6bc0);
      border-color: transparent;
    }

    .btn.primary:hover {
      background: linear-gradient(135deg, #4a5fc4, #6a79d4);
    }

    .main {
      display: flex;
      min-height: calc(100vh - 80px);
      position: relative;
    }

    .panel {
      flex: 1;
      padding: 24px;
      min-width: 0;
    }

    .panel-title {
      font-size: 14px;
      font-weight: 600;
      color: #90a4ae;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .panel-title.primary-label { color: #64b5f6; }
    .panel-title.secondary-label { color: #ce93d8; }

    .textarea-wrap {
      position: relative;
      margin-bottom: 20px;
    }

    .textarea {
      width: 100%;
      min-height: 100px;
      padding: 12px 14px;
      background: #16213e;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 10px;
      color: #e0e0e0;
      font-family: 'Courier New', monospace;
      font-size: 13px;
      line-height: 1.6;
      resize: vertical;
      outline: none;
      transition: border-color 0.2s ease;
    }

    .textarea:focus {
      border-color: rgba(100, 181, 246, 0.5);
    }

    .textarea::placeholder {
      color: #546e7a;
    }

    .hint {
      font-size: 11px;
      color: #546e7a;
      margin-top: 6px;
    }

    .cards-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 14px;
    }

    .divider {
      width: 2px;
      background: linear-gradient(180deg, transparent, #64b5f6, #ce93d8, transparent);
      flex-shrink: 0;
    }

    .detail-panel {
      position: fixed;
      top: 0;
      right: -420px;
      width: 400px;
      height: 100vh;
      background: #16213e;
      border-left: 1px solid rgba(255, 255, 255, 0.08);
      padding: 24px;
      box-shadow: -4px 0 20px rgba(0, 0, 0, 0.4);
      transition: right 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      z-index: 100;
      overflow-y: auto;
    }

    .detail-panel.open {
      right: 0;
    }

    .detail-panel-title {
      font-size: 16px;
      font-weight: 700;
      margin-bottom: 24px;
      color: #e0e0e0;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .close-btn {
      background: none;
      border: none;
      color: #90a4ae;
      font-size: 22px;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 4px;
      transition: background 0.2s ease, color 0.2s ease;
      line-height: 1;
    }

    .close-btn:hover {
      background: rgba(255, 255, 255, 0.06);
      color: #e0e0e0;
    }

    .detail-compare {
      display: flex;
      gap: 16px;
      margin-bottom: 24px;
      opacity: 0;
      transform: translateY(10px);
      animation: fadeInUp 0.4s ease forwards;
    }

    @keyframes fadeInUp {
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .detail-swatch-block {
      flex: 1;
      text-align: center;
    }

    .detail-swatch {
      width: 100%;
      aspect-ratio: 1 / 1;
      border-radius: 16px;
      margin-bottom: 12px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
    }

    .detail-swatch-label {
      font-size: 11px;
      font-weight: 600;
      color: #90a4ae;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }

    .detail-swatch-value {
      font-size: 13px;
      font-family: 'Courier New', monospace;
      color: #e0e0e0;
    }

    .detail-swatch-name {
      font-size: 12px;
      color: #78909c;
      margin-top: 2px;
    }

    .detail-delta {
      background: rgba(255, 255, 255, 0.04);
      border-radius: 12px;
      padding: 16px;
      text-align: center;
      opacity: 0;
      transform: translateY(10px);
      animation: fadeInUp 0.4s ease 0.1s forwards;
    }

    .detail-delta-label {
      font-size: 11px;
      color: #90a4ae;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }

    .detail-delta-value {
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 8px;
    }

    .detail-delta-bar {
      height: 8px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 4px;
      overflow: hidden;
    }

    .detail-delta-bar-fill {
      height: 100%;
      border-radius: 4px;
      transition: width 0.5s ease;
    }

    .detail-desc {
      font-size: 12px;
      color: #78909c;
      margin-top: 10px;
      line-height: 1.6;
    }

    .toast {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%) translateY(20px);
      background: #16213e;
      color: #e0e0e0;
      padding: 12px 24px;
      border-radius: 10px;
      font-size: 13px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
      opacity: 0;
      pointer-events: none;
      transition: all 0.3s ease;
      z-index: 200;
    }

    .toast.show {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }

    @media (max-width: 768px) {
      .main {
        flex-direction: column;
      }

      .divider {
        width: 100%;
        height: 2px;
        background: linear-gradient(90deg, transparent, #64b5f6, #ce93d8, transparent);
      }

      .cards-grid {
        grid-template-columns: repeat(5, 1fr);
      }

      .detail-panel {
        width: 100%;
        right: -100%;
      }

      .header {
        padding: 16px;
      }
    }

    @media (max-width: 480px) {
      .cards-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .panel {
        padding: 16px;
      }
    }
  </style>

  <div class="header">
    <div class="title">
      <span class="title-dot"></span>
      Color Compare Palette
    </div>
    <div class="actions">
      <button class="btn" id="resetBtn">重置</button>
      <button class="btn primary" id="exportBtn">导出报告</button>
    </div>
  </div>

  <div class="main">
    <div class="panel">
      <div class="panel-title primary-label">主色板</div>
      <div class="textarea-wrap">
        <textarea class="textarea" id="primaryInput" placeholder="粘贴5个色值，每行一个或用逗号分隔&#10;例如：&#10;#FF5733&#10;rgb(255, 87, 51)&#10;#3498DB"></textarea>
        <div class="hint">最多识别5个色值，支持 HEX / RGB 格式</div>
      </div>
      <div class="cards-grid" id="primaryCards"></div>
    </div>

    <div class="divider"></div>

    <div class="panel">
      <div class="panel-title secondary-label">次色板</div>
      <div class="textarea-wrap">
        <textarea class="textarea" id="secondaryInput" placeholder="粘贴5个色值，每行一个或用逗号分隔"></textarea>
        <div class="hint">最多识别5个色值，支持 HEX / RGB 格式</div>
      </div>
      <div class="cards-grid" id="secondaryCards"></div>
    </div>
  </div>

  <div class="detail-panel" id="detailPanel">
    <div class="detail-panel-title">
      <span>详细对比</span>
      <button class="close-btn" id="closeDetail">&times;</button>
    </div>
    <div id="detailContent"></div>
  </div>

  <div class="toast" id="toast"></div>
`;

const DEFAULT_COLORS = [
  '#E91E63',
  '#9C27B0',
  '#673AB7',
  '#3F51B5',
  '#2196F3'
];

const SECONDARY_DEFAULT = [
  '#FF4081',
  '#E040FB',
  '#7C4DFF',
  '#536DFE',
  '#448AFF'
];

export class ColorCompare extends HTMLElement {
  private primaryColors: ColorEntry[] = [];
  private secondaryColors: ColorEntry[] = [];
  private selectedIndex: number | null = null;
  private toastTimer: number | null = null;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(template.content.cloneNode(true));
  }

  connectedCallback() {
    const root = this.shadowRoot!;

    root.getElementById('resetBtn')?.addEventListener('click', () => this._reset());
    root.getElementById('exportBtn')?.addEventListener('click', () => this._export());
    root.getElementById('closeDetail')?.addEventListener('click', () => this._closeDetail());
    root.getElementById('primaryInput')?.addEventListener('input', (e) =>
      this._handleInput(e, 'primary')
    );
    root.getElementById('secondaryInput')?.addEventListener('input', (e) =>
      this._handleInput(e, 'secondary')
    );

    this.addEventListener('color-select', (e) => {
      const evt = e as CustomEvent<{ index: string; color: string; name: string }>;
      const idx = parseInt(evt.detail.index, 10);
      if (!isNaN(idx)) {
        this._selectIndex(idx);
      }
    });

    const primaryInput = root.getElementById('primaryInput') as HTMLTextAreaElement;
    const secondaryInput = root.getElementById('secondaryInput') as HTMLTextAreaElement;
    primaryInput.value = DEFAULT_COLORS.join('\n');
    secondaryInput.value = SECONDARY_DEFAULT.join('\n');

    this._parseAndRender('primary', primaryInput.value);
    this._parseAndRender('secondary', secondaryInput.value);
  }

  private _handleInput(e: Event, side: 'primary' | 'secondary') {
    const target = e.target as HTMLTextAreaElement;
    this._parseAndRender(side, target.value);
  }

  private _parseColors(text: string): ColorEntry[] {
    const parts = text
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .slice(0, 5);

    return parts.map((raw, idx) => {
      const rgb = parseColor(raw);
      return {
        raw,
        rgb,
        name: `Color ${idx + 1}`
      };
    });
  }

  private _parseAndRender(side: 'primary' | 'secondary', text: string) {
    const parsed = this._parseColors(text);
    if (side === 'primary') {
      this.primaryColors = parsed;
    } else {
      this.secondaryColors = parsed;
    }
    this._render();
  }

  private _render() {
    const root = this.shadowRoot!;
    const primaryGrid = root.getElementById('primaryCards')!;
    const secondaryGrid = root.getElementById('secondaryCards')!;

    const maxLen = Math.max(this.primaryColors.length, this.secondaryColors.length, 5);

    this._renderGrid(primaryGrid, this.primaryColors, maxLen, 'primary');
    this._renderGrid(secondaryGrid, this.secondaryColors, maxLen, 'secondary');
  }

  private _renderGrid(
    container: HTMLElement,
    colors: ColorEntry[],
    count: number,
    side: 'primary' | 'secondary'
  ) {
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < count; i++) {
      const entry = colors[i];
      const card = document.createElement('color-card');

      if (entry?.rgb) {
        const hex = rgbToHex(entry.rgb.r, entry.rgb.g, entry.rgb.b);
        card.setAttribute('color', hex);
        card.setAttribute('name', entry.name);
      }

      card.setAttribute('index', String(i));

      if (this.selectedIndex === i) {
        card.setAttribute('selected', '');
      }

      if (side === 'primary' && this.primaryColors[i]?.rgb && this.secondaryColors[i]?.rgb) {
        const delta = deltaE(this.primaryColors[i].rgb!, this.secondaryColors[i].rgb!);
        card.setAttribute('delta', String(delta));
        card.setAttribute('delta-color', deltaEGradient(delta));
        card.setAttribute('show-delta', '');
      }

      fragment.appendChild(card);
    }

    container.innerHTML = '';
    container.appendChild(fragment);
  }

  private _selectIndex(idx: number) {
    this.selectedIndex = idx;
    this._render();
    this._openDetail(idx);
  }

  private _openDetail(idx: number) {
    const root = this.shadowRoot!;
    const panel = root.getElementById('detailPanel')!;
    const content = root.getElementById('detailContent')!;

    const p = this.primaryColors[idx];
    const s = this.secondaryColors[idx];

    const pHex = p?.rgb ? rgbToHex(p.rgb.r, p.rgb.g, p.rgb.b) : '--';
    const sHex = s?.rgb ? rgbToHex(s.rgb.r, s.rgb.g, s.rgb.b) : '--';

    let delta = 0;
    let deltaLabel = 'N/A';
    let deltaDesc = '';

    if (p?.rgb && s?.rgb) {
      delta = deltaE(p.rgb, s.rgb);
      deltaLabel = String(delta);
      if (delta < 10) {
        deltaDesc = '几乎无视觉差异，人眼难以区分';
      } else if (delta < 30) {
        deltaDesc = '轻微差异，训练有素的观察者可识别';
      } else if (delta < 60) {
        deltaDesc = '明显差异，普通观察者可感知';
      } else {
        deltaDesc = '差异显著，颜色感知完全不同';
      }
    } else {
      deltaDesc = '请确保两侧对应位置均填入有效色值';
    }

    content.innerHTML = `
      <div class="detail-compare">
        <div class="detail-swatch-block">
          <div class="detail-swatch" style="background: ${p?.rgb ? pHex : '#333'}"></div>
          <div class="detail-swatch-label">主色板</div>
          <div class="detail-swatch-value">${pHex}</div>
          <div class="detail-swatch-name">${p?.name || `Color ${idx + 1}`}</div>
        </div>
        <div class="detail-swatch-block">
          <div class="detail-swatch" style="background: ${s?.rgb ? sHex : '#333'}"></div>
          <div class="detail-swatch-label">次色板</div>
          <div class="detail-swatch-value">${sHex}</div>
          <div class="detail-swatch-name">${s?.name || `Color ${idx + 1}`}</div>
        </div>
      </div>
      <div class="detail-delta">
        <div class="detail-delta-label">Delta E 色差</div>
        <div class="detail-delta-value" style="color: ${deltaEGradient(delta).match(/rgb\([^)]+\)$/)?.[0] || '#e0e0e0'}">${deltaLabel}</div>
        <div class="detail-delta-bar">
          <div class="detail-delta-bar-fill" style="width: ${delta}%; background: ${deltaEGradient(delta)}"></div>
        </div>
        <div class="detail-desc">${deltaDesc}</div>
      </div>
    `;

    panel.classList.add('open');
  }

  private _closeDetail() {
    const root = this.shadowRoot!;
    const panel = root.getElementById('detailPanel')!;
    panel.classList.remove('open');
    this.selectedIndex = null;
    this._render();
  }

  private _reset() {
    const root = this.shadowRoot!;
    (root.getElementById('primaryInput') as HTMLTextAreaElement).value = '';
    (root.getElementById('secondaryInput') as HTMLTextAreaElement).value = '';
    this.primaryColors = [];
    this.secondaryColors = [];
    this.selectedIndex = null;
    this._closeDetail();
    this._render();
    this._showToast('已重置');
  }

  private _export() {
    const lines: string[] = [];
    lines.push('=== Color Compare Report ===');
    lines.push(`生成时间: ${new Date().toLocaleString()}`);
    lines.push('');
    lines.push('主色板 vs 次色板 对比:');
    lines.push('');

    const maxLen = Math.max(this.primaryColors.length, this.secondaryColors.length);
    let totalDelta = 0;
    let validCount = 0;

    for (let i = 0; i < maxLen; i++) {
      const p = this.primaryColors[i];
      const s = this.secondaryColors[i];
      const pHex = p?.rgb ? rgbToHex(p.rgb.r, p.rgb.g, p.rgb.b) : 'N/A';
      const sHex = s?.rgb ? rgbToHex(s.rgb.r, s.rgb.g, s.rgb.b) : 'N/A';

      if (p?.rgb && s?.rgb) {
        const d = deltaE(p.rgb, s.rgb);
        totalDelta += d;
        validCount++;
        lines.push(`[${i + 1}] ${pHex}  vs  ${sHex}  ΔE=${d}`);
      } else {
        lines.push(`[${i + 1}] ${pHex}  vs  ${sHex}  ΔE=N/A`);
      }
    }

    if (validCount > 0) {
      lines.push('');
      lines.push(`平均 ΔE: ${(totalDelta / validCount).toFixed(2)}`);
    }

    const text = lines.join('\n');
    navigator.clipboard
      .writeText(text)
      .then(() => this._showToast('报告已复制到剪贴板'))
      .catch(() => {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand('copy');
          this._showToast('报告已复制到剪贴板');
        } catch {
          this._showToast('复制失败，请手动复制');
        }
        document.body.removeChild(ta);
      });
  }

  private _showToast(msg: string) {
    const root = this.shadowRoot!;
    const toast = root.getElementById('toast')!;
    toast.textContent = msg;
    toast.classList.add('show');

    if (this.toastTimer !== null) {
      window.clearTimeout(this.toastTimer);
    }

    this.toastTimer = window.setTimeout(() => {
      toast.classList.remove('show');
      this.toastTimer = null;
    }, 2000);
  }
}

customElements.define('color-compare', ColorCompare);

const app = document.getElementById('app');
if (app) {
  app.innerHTML = '<color-compare></color-compare>';
}
