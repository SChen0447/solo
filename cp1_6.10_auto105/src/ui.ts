import { CultureDish, DishStats } from './dish';
import {
  RULE_LABELS,
  RULE_MODES,
  RuleMode,
  SPECIES_A,
  SPECIES_B,
  SPECIES_C,
  SPECIES_COLORS,
  Species,
} from './rules';

export interface UIOptions {
  container: HTMLElement;
  dish: CultureDish;
  onSpeedChange: (speed: number) => void;
}

export class UI {
  private container: HTMLElement;
  private dish: CultureDish;
  private onSpeedChange: (speed: number) => void;
  private speed = 1;
  private ruleSelect!: HTMLSelectElement;
  private speedSlider!: HTMLInputElement;
  private tempSlider!: HTMLInputElement;
  private speedValue!: HTMLSpanElement;
  private tempValue!: HTMLSpanElement;
  private genText!: HTMLSpanElement;
  private elapsedText!: HTMLSpanElement;
  private countA!: HTMLSpanElement;
  private countB!: HTMLSpanElement;
  private countC!: HTMLSpanElement;
  private ringCanvas!: HTMLCanvasElement;

  constructor(opts: UIOptions) {
    this.container = opts.container;
    this.dish = opts.dish;
    this.onSpeedChange = opts.onSpeedChange;
    this.build();
  }

  private build(): void {
    const app = document.getElementById('app');
    if (!app) return;

    app.style.flexDirection = 'column';
    app.style.alignItems = 'center';
    app.style.justifyContent = 'flex-start';
    app.style.padding = '16px';
    app.style.gap = '12px';

    const title = document.createElement('h1');
    title.textContent = '细胞演化模拟器';
    title.style.fontFamily = "'Orbitron', sans-serif";
    title.style.fontSize = '36px';
    title.style.color = '#ffffff';
    title.style.letterSpacing = '4px';
    title.style.textAlign = 'center';
    title.style.marginTop = '8px';
    app.appendChild(title);

    const wrapper = document.createElement('div');
    wrapper.id = 'layout-wrapper';
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'row';
    wrapper.style.alignItems = 'flex-start';
    wrapper.style.justifyContent = 'center';
    wrapper.style.gap = '24px';
    wrapper.style.width = '100%';
    wrapper.style.flexWrap = 'wrap';
    app.appendChild(wrapper);

    const canvasWrap = document.createElement('div');
    canvasWrap.id = 'canvas-wrap';
    canvasWrap.style.display = 'flex';
    canvasWrap.style.flexDirection = 'column';
    canvasWrap.style.alignItems = 'center';
    canvasWrap.style.gap = '8px';
    wrapper.appendChild(canvasWrap);

    this.dish.canvas.style.borderRadius = '4px';
    this.dish.canvas.style.boxShadow = '0 0 30px rgba(0, 212, 170, 0.15)';
    canvasWrap.appendChild(this.dish.canvas);

    const statusBar = document.createElement('div');
    statusBar.style.display = 'flex';
    statusBar.style.gap = '24px';
    statusBar.style.fontFamily = "'Orbitron', sans-serif";
    statusBar.style.fontSize = '14px';
    statusBar.style.color = '#a0b0c0';
    statusBar.style.letterSpacing = '1px';
    canvasWrap.appendChild(statusBar);

    this.genText = document.createElement('span');
    this.genText.textContent = '第0代';
    statusBar.appendChild(this.genText);

    this.elapsedText = document.createElement('span');
    this.elapsedText.textContent = '耗时0.0秒';
    statusBar.appendChild(this.elapsedText);

    const panel = document.createElement('div');
    panel.id = 'control-panel';
    panel.style.width = '480px';
    panel.style.minWidth = '320px';
    panel.style.flex = '0 0 auto';
    panel.style.backgroundColor = '#0f1628';
    panel.style.border = '1px solid #1a2a3a';
    panel.style.borderRadius = '8px';
    panel.style.padding = '20px';
    panel.style.display = 'flex';
    panel.style.flexDirection = 'column';
    panel.style.gap = '18px';
    panel.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
    wrapper.appendChild(panel);

    this.addRuleSelect(panel);
    this.addSlider(panel, '速度', 0.5, 5, 0.1, 1, (v) => {
      this.speed = v;
      this.onSpeedChange(v);
    }, (span, v) => {
      this.speedValue = span;
      span.textContent = v.toFixed(1) + 'x';
    });
    this.addSlider(panel, '温度', 0, 100, 1, 20, (v) => {
      this.dish.setTemperature(v);
    }, (span, v) => {
      this.tempValue = span;
      span.textContent = Math.round(v).toString();
    });
    this.addInfoPanel(panel);
    this.addButtons(panel);

    window.addEventListener('resize', () => this.handleResponsive());
    setTimeout(() => this.handleResponsive(), 0);
  }

  private addRuleSelect(panel: HTMLElement): void {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.flexDirection = 'column';
    row.style.gap = '6px';

    const label = document.createElement('label');
    label.textContent = '演化规则';
    label.style.fontFamily = "'Orbitron', sans-serif";
    label.style.fontSize = '13px';
    label.style.color = '#a0b0c0';
    label.style.letterSpacing = '1px';
    row.appendChild(label);

    this.ruleSelect = document.createElement('select');
    this.ruleSelect.style.padding = '10px 12px';
    this.ruleSelect.style.fontSize = '14px';
    this.ruleSelect.style.backgroundColor = '#151d30';
    this.ruleSelect.style.color = '#ffffff';
    this.ruleSelect.style.border = '1px solid #2a3a4a';
    this.ruleSelect.style.borderRadius = '4px';
    this.ruleSelect.style.cursor = 'pointer';
    this.ruleSelect.style.fontFamily = "'Orbitron', sans-serif";
    this.ruleSelect.style.outline = 'none';

    for (const mode of RULE_MODES) {
      const opt = document.createElement('option');
      opt.value = mode;
      opt.textContent = RULE_LABELS[mode];
      if (mode === this.dish.getRule()) opt.selected = true;
      this.ruleSelect.appendChild(opt);
    }
    this.ruleSelect.addEventListener('change', () => {
      this.dish.setRule(this.ruleSelect.value as RuleMode);
    });
    row.appendChild(this.ruleSelect);
    panel.appendChild(row);
  }

  private addSlider(
    panel: HTMLElement,
    name: string,
    min: number,
    max: number,
    step: number,
    defaultValue: number,
    onChange: (v: number) => void,
    onSpan: (span: HTMLSpanElement, v: number) => void
  ): void {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.flexDirection = 'column';
    row.style.gap = '6px';

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';

    const label = document.createElement('label');
    label.textContent = name;
    label.style.fontFamily = "'Orbitron', sans-serif";
    label.style.fontSize = '13px';
    label.style.color = '#a0b0c0';
    label.style.letterSpacing = '1px';
    header.appendChild(label);

    const valueSpan = document.createElement('span');
    valueSpan.style.fontFamily = "'Orbitron', sans-serif";
    valueSpan.style.fontSize = '13px';
    valueSpan.style.color = '#00d4aa';
    valueSpan.style.letterSpacing = '1px';
    onSpan(valueSpan, defaultValue);
    header.appendChild(valueSpan);

    row.appendChild(header);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = min.toString();
    slider.max = max.toString();
    slider.step = step.toString();
    slider.value = defaultValue.toString();
    slider.style.width = '100%';
    slider.style.height = '6px';
    slider.style.cursor = 'pointer';
    slider.style.accentColor = '#00d4aa';
    slider.addEventListener('input', () => {
      const v = parseFloat(slider.value);
      onChange(v);
      valueSpan.textContent = name === '速度' ? v.toFixed(1) + 'x' : Math.round(v).toString();
    });
    row.appendChild(slider);

    if (name === '速度') this.speedSlider = slider;
    if (name === '温度') this.tempSlider = slider;

    panel.appendChild(row);
  }

  private addInfoPanel(panel: HTMLElement): void {
    const info = document.createElement('div');
    info.style.display = 'flex';
    info.style.flexDirection = 'column';
    info.style.gap = '12px';
    info.style.padding = '14px';
    info.style.backgroundColor = '#0a1020';
    info.style.borderRadius = '6px';
    info.style.border = '1px solid #1a2a3a';

    const title = document.createElement('div');
    title.textContent = '种群信息';
    title.style.fontFamily = "'Orbitron', sans-serif";
    title.style.fontSize = '13px';
    title.style.color = '#a0b0c0';
    title.style.letterSpacing = '1px';
    info.appendChild(title);

    const content = document.createElement('div');
    content.style.display = 'flex';
    content.style.gap = '16px';
    content.style.alignItems = 'center';

    this.ringCanvas = document.createElement('canvas');
    this.ringCanvas.width = 160;
    this.ringCanvas.height = 160;
    this.ringCanvas.style.flexShrink = '0';
    content.appendChild(this.ringCanvas);

    const counts = document.createElement('div');
    counts.style.display = 'flex';
    counts.style.flexDirection = 'column';
    counts.style.gap = '8px';
    counts.style.flex = '1';

    this.countA = this.buildCountRow(SPECIES_A, '种群A', counts);
    this.countB = this.buildCountRow(SPECIES_B, '种群B', counts);
    this.countC = this.buildCountRow(SPECIES_C, '种群C', counts);

    content.appendChild(counts);
    info.appendChild(content);
    panel.appendChild(info);
  }

  private buildCountRow(species: Species, label: string, parent: HTMLElement): HTMLSpanElement {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.justifyContent = 'space-between';
    row.style.alignItems = 'center';

    const left = document.createElement('div');
    left.style.display = 'flex';
    left.style.alignItems = 'center';
    left.style.gap = '8px';

    const dot = document.createElement('span');
    dot.style.width = '12px';
    dot.style.height = '12px';
    dot.style.borderRadius = '50%';
    dot.style.backgroundColor = SPECIES_COLORS[species];
    dot.style.display = 'inline-block';
    left.appendChild(dot);

    const lbl = document.createElement('span');
    lbl.textContent = label;
    lbl.style.fontFamily = "'Orbitron', sans-serif";
    lbl.style.fontSize = '12px';
    lbl.style.color = '#c0d0e0';
    left.appendChild(lbl);

    row.appendChild(left);

    const val = document.createElement('span');
    val.textContent = '0';
    val.style.fontFamily = "'Orbitron', sans-serif";
    val.style.fontSize = '14px';
    val.style.color = '#ffffff';
    val.style.fontWeight = 'bold';
    row.appendChild(val);

    parent.appendChild(row);
    return val;
  }

  private addButtons(panel: HTMLElement): void {
    const buttonsWrap = document.createElement('div');
    buttonsWrap.style.display = 'flex';
    buttonsWrap.style.flexDirection = 'column';
    buttonsWrap.style.gap = '10px';

    const btn1 = this.buildButton('注入随机细胞', '#ff6b35');
    btn1.addEventListener('click', () => this.dish.injectRandomCells());
    buttonsWrap.appendChild(btn1);

    const btn2 = this.buildButton('施加毒素', '#a855f7');
    btn2.addEventListener('click', () => this.dish.applyToxin());
    buttonsWrap.appendChild(btn2);

    const btn3 = this.buildButton('重置培养皿', '#00d4aa');
    btn3.addEventListener('click', () => this.dish.reset());
    buttonsWrap.appendChild(btn3);

    panel.appendChild(buttonsWrap);
  }

  private buildButton(text: string, color: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.style.padding = '12px 16px';
    btn.style.fontFamily = "'Orbitron', sans-serif";
    btn.style.fontSize = '13px';
    btn.style.letterSpacing = '1px';
    btn.style.border = 'none';
    btn.style.borderRadius = '6px';
    btn.style.cursor = 'pointer';
    btn.style.color = '#0a0f1e';
    btn.style.fontWeight = 'bold';
    btn.style.backgroundColor = color;
    btn.style.transition = 'transform 0.1s ease, filter 0.15s ease';
    btn.style.outline = 'none';
    btn.addEventListener('mouseenter', () => {
      btn.style.filter = 'brightness(1.2)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.filter = 'brightness(1)';
      btn.style.transform = 'scale(1)';
    });
    btn.addEventListener('mousedown', () => {
      btn.style.transform = 'scale(0.95)';
    });
    btn.addEventListener('mouseup', () => {
      btn.style.transform = 'scale(1)';
    });
    return btn;
  }

  private drawRings(stats: DishStats): void {
    const ctx = this.ringCanvas.getContext('2d')!;
    const w = this.ringCanvas.width;
    const h = this.ringCanvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0a1020';
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const baseR = 52;
    const ringWidth = 20;
    const gap = 4;

    const rings: { species: Species; ratio: number; color: string }[] = [
      { species: SPECIES_A, ratio: stats.ratios[SPECIES_A], color: SPECIES_COLORS[SPECIES_A] },
      { species: SPECIES_B, ratio: stats.ratios[SPECIES_B], color: SPECIES_COLORS[SPECIES_B] },
      { species: SPECIES_C, ratio: stats.ratios[SPECIES_C], color: SPECIES_COLORS[SPECIES_C] },
    ];

    rings.forEach((r, i) => {
      const radius = baseR - i * (ringWidth + gap);
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = '#1a2a3a';
      ctx.lineWidth = ringWidth;
      ctx.stroke();

      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + Math.PI * 2 * r.ratio;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.strokeStyle = r.color;
      ctx.lineWidth = ringWidth;
      ctx.lineCap = 'butt';
      ctx.stroke();
    });
  }

  updateStats(stats: DishStats): void {
    this.genText.textContent = `第${stats.generation}代`;
    this.elapsedText.textContent = `耗时${(stats.elapsedMs / 1000).toFixed(1)}秒`;
    this.countA.textContent = stats.counts[SPECIES_A].toString();
    this.countB.textContent = stats.counts[SPECIES_B].toString();
    this.countC.textContent = stats.counts[SPECIES_C].toString();
    this.drawRings(stats);
  }

  private handleResponsive(): void {
    const w = window.innerWidth;
    const wrapper = document.getElementById('layout-wrapper');
    const canvasWrap = document.getElementById('canvas-wrap');
    const panel = document.getElementById('control-panel');
    if (!wrapper || !canvasWrap || !panel) return;

    if (w < 800) {
      wrapper.style.flexDirection = 'column';
      wrapper.style.alignItems = 'center';
      canvasWrap.style.marginTop = '20px';
      panel.style.width = '100%';
      panel.style.maxWidth = '600px';
      const targetSize = Math.min(window.innerWidth - 40, 800);
      this.dish.canvas.style.width = targetSize + 'px';
      this.dish.canvas.style.height = targetSize + 'px';
    } else if (w < 1200) {
      wrapper.style.flexDirection = 'column';
      wrapper.style.alignItems = 'center';
      canvasWrap.style.marginTop = '20px';
      panel.style.width = '100%';
      panel.style.maxWidth = '800px';
      this.dish.canvas.style.width = '800px';
      this.dish.canvas.style.height = '800px';
    } else {
      wrapper.style.flexDirection = 'row';
      wrapper.style.alignItems = 'flex-start';
      canvasWrap.style.marginTop = '0px';
      panel.style.width = '480px';
      panel.style.maxWidth = 'none';
      this.dish.canvas.style.width = '800px';
      this.dish.canvas.style.height = '800px';
    }
  }
}
