import type { GridEngine, BreakpointKey, SavedConfig } from './gridEngine';
import { BREAKPOINTS } from './gridEngine';

export interface ControlsElements {
  controlPanel: HTMLElement;
  codePanel: HTMLElement;
  breakpointBar: HTMLElement;
}

export class Controls {
  private engine: GridEngine;
  private els: ControlsElements;
  private columnsSlider: HTMLInputElement | null = null;
  private columnsInput: HTMLInputElement | null = null;
  private gapSlider: HTMLInputElement | null = null;
  private gapInput: HTMLInputElement | null = null;
  private widthSlider: HTMLInputElement | null = null;
  private widthInput: HTMLInputElement | null = null;
  private codeDisplay: HTMLPreElement | null = null;
  private copyBtn: HTMLButtonElement | null = null;
  private toast: HTMLDivElement | null = null;
  private saveBtn: HTMLButtonElement | null = null;
  private resetBtn: HTMLButtonElement | null = null;
  private savedSelect: HTMLSelectElement | null = null;
  private loadBtn: HTMLButtonElement | null = null;
  private deleteBtn: HTMLButtonElement | null = null;
  private breakpointButtons: Map<BreakpointKey | 'none', HTMLButtonElement> = new Map();

  constructor(engine: GridEngine, els: ControlsElements) {
    this.engine = engine;
    this.els = els;
    this.build();
    this.engine.subscribe(() => this.syncFromEngine());
    this.syncFromEngine();
  }

  private build(): void {
    this.buildControlPanel();
    this.buildCodePanel();
    this.buildBreakpointBar();
  }

  private buildControlPanel(): void {
    const panel = this.els.controlPanel;
    panel.innerHTML = `
      <div class="panel-header">控制面板</div>
      <div class="panel-body">
        <div class="control-group">
          <label>列数 <span class="value-tag" id="columns-val">12</span></label>
          <div class="control-row">
            <input type="range" id="columns-slider" min="2" max="12" step="1" value="12">
            <input type="number" id="columns-input" min="2" max="12" value="12">
          </div>
        </div>
        <div class="control-group">
          <label>列间距 <span class="value-tag" id="gap-val">20px</span></label>
          <div class="control-row">
            <input type="range" id="gap-slider" min="0" max="40" step="1" value="20">
            <input type="number" id="gap-input" min="0" max="40" value="20">
          </div>
        </div>
        <div class="control-group">
          <label>总宽度 <span class="value-tag" id="width-val">1200px</span></label>
          <div class="control-row">
            <input type="range" id="width-slider" min="600" max="1400" step="10" value="1200">
            <input type="number" id="width-input" min="600" max="1400" value="1200">
          </div>
        </div>

        <div class="divider"></div>

        <div class="control-group">
          <label>保存配置</label>
          <div class="button-row">
            <button id="save-btn" class="btn btn-primary">保存当前</button>
            <button id="reset-btn" class="btn btn-secondary">重置</button>
          </div>
        </div>

        <div class="control-group">
          <label>已保存配置</label>
          <div class="control-row">
            <select id="saved-select">
              <option value="">-- 选择配置 --</option>
            </select>
          </div>
          <div class="button-row">
            <button id="load-btn" class="btn btn-secondary" disabled>加载</button>
            <button id="delete-btn" class="btn btn-danger" disabled>删除</button>
          </div>
        </div>
      </div>
    `;

    this.columnsSlider = panel.querySelector('#columns-slider');
    this.columnsInput = panel.querySelector('#columns-input');
    this.gapSlider = panel.querySelector('#gap-slider');
    this.gapInput = panel.querySelector('#gap-input');
    this.widthSlider = panel.querySelector('#width-slider');
    this.widthInput = panel.querySelector('#width-input');
    this.saveBtn = panel.querySelector('#save-btn');
    this.resetBtn = panel.querySelector('#reset-btn');
    this.savedSelect = panel.querySelector('#saved-select');
    this.loadBtn = panel.querySelector('#load-btn');
    this.deleteBtn = panel.querySelector('#delete-btn');

    this.bindParamControl(this.columnsSlider, this.columnsInput,
      v => this.engine.setColumns(v),
      v => `${v}`);
    this.bindParamControl(this.gapSlider, this.gapInput,
      v => this.engine.setGap(v),
      v => `${v}px`);
    this.bindParamControl(this.widthSlider, this.widthInput,
      v => this.engine.setContainerWidth(v),
      v => `${v}px`);

    this.saveBtn.addEventListener('click', () => {
      const name = prompt('输入配置名称:', `配置 ${new Date().toLocaleTimeString()}`);
      if (name) {
        this.engine.saveConfig(name);
      }
    });

    this.resetBtn.addEventListener('click', () => this.engine.resetConfig());

    this.savedSelect.addEventListener('change', () => {
      const hasSelection = this.savedSelect!.value !== '';
      this.loadBtn!.disabled = !hasSelection;
      this.deleteBtn!.disabled = !hasSelection;
    });

    this.loadBtn.addEventListener('click', () => {
      const id = this.savedSelect!.value;
      if (id) this.engine.loadConfig(id);
    });

    this.deleteBtn.addEventListener('click', () => {
      const id = this.savedSelect!.value;
      if (id && confirm('确认删除此配置?')) {
        this.engine.deleteConfig(id);
      }
    });
  }

  private bindParamControl(
    slider: HTMLInputElement | null,
    input: HTMLInputElement | null,
    setter: (v: number) => void,
    formatter: (v: number) => string
  ): void {
    if (!slider || !input) return;
    const valueTagId = slider.id.replace('-slider', '-val');
    const valueTag = this.els.controlPanel.querySelector('#' + valueTagId);

    const updateValue = (raw: string) => {
      const num = parseInt(raw, 10);
      if (isNaN(num)) return;
      const min = parseInt(slider.min, 10);
      const max = parseInt(slider.max, 10);
      const clamped = Math.max(min, Math.min(max, num));
      setter(clamped);
    };

    slider.addEventListener('input', e => {
      const val = (e.target as HTMLInputElement).value;
      input.value = val;
      if (valueTag) valueTag.textContent = formatter(parseInt(val, 10));
      updateValue(val);
    });

    input.addEventListener('change', e => {
      const val = (e.target as HTMLInputElement).value;
      const parsed = parseInt(val, 10);
      if (!isNaN(parsed)) {
        slider.value = String(parsed);
        if (valueTag) valueTag.textContent = formatter(parsed);
      }
      updateValue(val);
    });
  }

  private buildCodePanel(): void {
    const panel = this.els.codePanel;
    panel.innerHTML = `
      <div class="panel-header">CSS 代码</div>
      <div class="panel-body code-panel-body">
        <button id="copy-btn" class="btn btn-primary copy-btn">复制代码</button>
        <div class="code-wrapper">
          <div class="line-numbers" id="line-numbers"></div>
          <pre id="code-display" class="code-display"></pre>
        </div>
      </div>
      <div id="copy-toast" class="toast">已复制</div>
    `;

    this.codeDisplay = panel.querySelector('#code-display');
    this.copyBtn = panel.querySelector('#copy-btn');
    this.toast = panel.querySelector('#copy-toast');

    this.copyBtn.addEventListener('click', async () => {
      const code = this.engine.generateCSS();
      try {
        await navigator.clipboard.writeText(code);
        this.showToast();
      } catch {
        const ta = document.createElement('textarea');
        ta.value = code;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        this.showToast();
      }
    });
  }

  private showToast(): void {
    if (!this.toast) return;
    this.toast.classList.add('show');
    setTimeout(() => this.toast!.classList.remove('show'), 2000);
  }

  private buildBreakpointBar(): void {
    const bar = this.els.breakpointBar;
    bar.innerHTML = `<span class="bp-label">断点预览:</span>`;

    const noneBtn = document.createElement('button');
    noneBtn.className = 'bp-btn';
    noneBtn.dataset.bp = 'none';
    noneBtn.textContent = '自适应';
    noneBtn.addEventListener('click', () => this.engine.setBreakpoint(null));
    bar.appendChild(noneBtn);
    this.breakpointButtons.set('none', noneBtn);

    (Object.keys(BREAKPOINTS) as BreakpointKey[]).forEach(key => {
      const bp = BREAKPOINTS[key];
      const btn = document.createElement('button');
      btn.className = 'bp-btn';
      btn.dataset.bp = key;
      btn.textContent = `${bp.label} ${bp.width}px`;
      btn.addEventListener('click', () => this.engine.setBreakpoint(key));
      bar.appendChild(btn);
      this.breakpointButtons.set(key, btn);
    });
  }

  private syncFromEngine(): void {
    const cfg = this.engine.getConfig();

    if (this.columnsSlider) this.columnsSlider.value = String(cfg.columns);
    if (this.columnsInput) this.columnsInput.value = String(cfg.columns);
    const cVal = this.els.controlPanel.querySelector('#columns-val');
    if (cVal) cVal.textContent = String(cfg.columns);

    if (this.gapSlider) this.gapSlider.value = String(cfg.gap);
    if (this.gapInput) this.gapInput.value = String(cfg.gap);
    const gVal = this.els.controlPanel.querySelector('#gap-val');
    if (gVal) gVal.textContent = `${cfg.gap}px`;

    if (this.widthSlider) this.widthSlider.value = String(cfg.containerWidth);
    if (this.widthInput) this.widthInput.value = String(cfg.containerWidth);
    const wVal = this.els.controlPanel.querySelector('#width-val');
    if (wVal) wVal.textContent = `${cfg.containerWidth}px`;

    this.breakpointButtons.forEach((btn, key) => {
      const active = (cfg.breakpoint === null && key === 'none') || cfg.breakpoint === key;
      btn.classList.toggle('active', active);
    });

    if (this.codeDisplay) {
      const code = this.engine.generateCSS();
      this.codeDisplay.textContent = code;
      const lines = code.split('\n').length;
      const lineNumbersEl = this.els.codePanel.querySelector('#line-numbers');
      if (lineNumbersEl) {
        lineNumbersEl.innerHTML = Array.from({ length: lines }, (_, i) => `<div>${i + 1}</div>`).join('');
      }
    }

    this.syncSavedConfigs();
  }

  private syncSavedConfigs(): void {
    if (!this.savedSelect) return;
    const saved = this.engine.getSavedConfigs();
    const currentVal = this.savedSelect.value;

    this.savedSelect.innerHTML = '<option value="">-- 选择配置 --</option>';
    saved.forEach((s: SavedConfig) => {
      const opt = document.createElement('option');
      opt.value = s.id;
      const date = new Date(s.timestamp).toLocaleString();
      opt.textContent = `${s.name} (${date})`;
      this.savedSelect!.appendChild(opt);
    });

    if (saved.some(s => s.id === currentVal)) {
      this.savedSelect.value = currentVal;
    }

    const hasSelection = this.savedSelect.value !== '';
    if (this.loadBtn) this.loadBtn.disabled = !hasSelection;
    if (this.deleteBtn) this.deleteBtn.disabled = !hasSelection;
  }
}
