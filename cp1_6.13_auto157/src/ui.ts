import { Block } from './block';
import { ChoreographyManager, Keyframe } from './choreography';

export interface UIState {
  choreoMode: boolean;
  isPlaying: boolean;
  bpm: number;
}

export interface UICallbacks {
  onChoreoToggle: (enabled: boolean) => void;
  onRehearse: () => void;
  onRandomFormation: () => void;
  onBpmChange: (bpm: number) => void;
}

export class UIController {
  private container: HTMLElement;
  private bottomBar: HTMLElement | null = null;
  private choreoBtn: HTMLButtonElement | null = null;
  private rehearseBtn: HTMLButtonElement | null = null;
  private randomFormBtn: HTMLButtonElement | null = null;
  private sliderContainer: HTMLElement | null = null;
  private bpmSlider: HTMLInputElement | null = null;
  private bpmLabel: HTMLElement | null = null;
  private choreoPanel: HTMLElement | null = null;
  private choreoList: HTMLElement | null = null;
  private callbacks: UICallbacks;
  private choreoManager: ChoreographyManager;
  private blocks: Block[] = [];
  public static readonly CANVAS_W = 800;
  public static readonly CANVAS_H = 600;
  public static readonly CANVAS_W_SMALL = 560;
  public static readonly CANVAS_H_SMALL = 420;
  private isSmallViewport = false;

  constructor(container: HTMLElement, _canvasWrapper: HTMLElement, callbacks: UICallbacks, choreoManager: ChoreographyManager) {
    this.container = container;
    this.callbacks = callbacks;
    this.choreoManager = choreoManager;
    this.choreoPanel = document.getElementById('choreoPanel');
    this.choreoList = document.getElementById('choreoList');
    this.randomFormBtn = document.getElementById('randomFormBtn') as HTMLButtonElement;
    this.createBottomBar();
    this.setupViewportListener();
    this.bindEvents();
  }

  public setBlocks(blocks: Block[]): void {
    this.blocks = blocks;
    this.renderChoreoPanel();
  }

  public updateChoreoPanel(): void {
    this.renderChoreoPanel();
  }

  private createBottomBar(): void {
    this.bottomBar = document.createElement('div');
    this.applyBottomBarStyles(this.bottomBar);

    this.choreoBtn = this.createButton('编舞', '#4a90d9', '#357abd');
    this.choreoBtn.id = 'choreoBtn';

    this.rehearseBtn = this.createButton('排练', '#27ae60', '#1e8449');
    this.rehearseBtn.id = 'rehearseBtn';

    this.sliderContainer = document.createElement('div');
    this.createSlider(this.sliderContainer);

    const btnGroup = document.createElement('div');
    this.applyButtonGroupStyles(btnGroup);
    btnGroup.appendChild(this.choreoBtn);
    btnGroup.appendChild(this.rehearseBtn);

    this.bottomBar.appendChild(btnGroup);
    this.bottomBar.appendChild(this.sliderContainer);
    this.container.appendChild(this.bottomBar);
  }

  private applyBottomBarStyles(el: HTMLElement): void {
    const width = this.isSmallViewport ? UIController.CANVAS_W_SMALL : UIController.CANVAS_W;
    const height = this.isSmallViewport ? 50 : 60;
    Object.assign(el.style, {
      width: `${width}px`,
      height: `${height}px`,
      backgroundColor: '#1e1e1e',
      border: '1px solid #555',
      borderTop: 'none',
      borderBottomLeftRadius: '12px',
      borderBottomRightRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingLeft: this.isSmallViewport ? '16px' : '24px',
      paddingRight: this.isSmallViewport ? '16px' : '24px',
      boxSizing: 'border-box',
    });
  }

  private applyButtonGroupStyles(el: HTMLElement): void {
    Object.assign(el.style, {
      display: 'flex',
      alignItems: 'center',
      gap: this.isSmallViewport ? '12px' : '20px',
    });
  }

  private createButton(text: string, bgColor: string, activeColor: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = text;
    const w = this.isSmallViewport ? 90 : 120;
    const h = this.isSmallViewport ? 30 : 36;
    Object.assign(btn.style, {
      width: `${w}px`,
      height: `${h}px`,
      backgroundColor: bgColor,
      color: '#ffffff',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: this.isSmallViewport ? '12px' : '13px',
      fontWeight: '500',
      transition: 'background-color 0.2s',
    });

    btn.addEventListener('mouseenter', () => {
      btn.style.backgroundColor = activeColor;
    });
    btn.addEventListener('mouseleave', () => {
      if (!btn.dataset.active || btn.dataset.active === 'false') {
        btn.style.backgroundColor = bgColor;
      }
    });
    btn.addEventListener('mousedown', () => {
      btn.style.transform = 'scale(0.97)';
    });
    btn.addEventListener('mouseup', () => {
      btn.style.transform = 'scale(1)';
    });

    btn.dataset.bgColor = bgColor;
    btn.dataset.activeColor = activeColor;
    return btn;
  }

  private createSlider(container: HTMLElement): void {
    const trackWidth = this.isSmallViewport ? 140 : 200;
    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.alignItems = 'center';
    wrapper.style.gap = '2px';

    this.bpmLabel = document.createElement('span');
    Object.assign(this.bpmLabel.style, {
      color: '#ffffff',
      fontSize: '14px',
      fontFamily: 'monospace',
      marginBottom: '2px',
      height: '18px',
    });
    this.bpmLabel.textContent = `${this.choreoManager.getBpm()} BPM`;

    const sliderWrap = document.createElement('div');
    sliderWrap.style.position = 'relative';
    sliderWrap.style.width = `${trackWidth}px`;
    sliderWrap.style.height = '6px';

    this.bpmSlider = document.createElement('input');
    this.bpmSlider.type = 'range';
    this.bpmSlider.min = String(ChoreographyManager.MIN_BPM);
    this.bpmSlider.max = String(ChoreographyManager.MAX_BPM);
    this.bpmSlider.value = String(this.choreoManager.getBpm());
    this.bpmSlider.step = '1';

    const sliderStyles: Record<string, string> = {
      width: `${trackWidth}px`,
      height: '6px',
      WebkitAppearance: 'none',
      appearance: 'none',
      background: '#555',
      borderRadius: '3px',
      outline: 'none',
      cursor: 'pointer',
      padding: '0',
      margin: '0',
    };
    Object.assign(this.bpmSlider.style, sliderStyles);

    const styleEl = document.createElement('style');
    styleEl.textContent = `
      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #4a90d9;
        cursor: pointer;
        border: 2px solid #fff;
        transition: background-color 0.2s;
      }
      input[type="range"]::-webkit-slider-thumb:hover {
        background: #357abd;
      }
      input[type="range"]::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #4a90d9;
        cursor: pointer;
        border: 2px solid #fff;
        transition: background-color 0.2s;
      }
      input[type="range"]::-moz-range-thumb:hover {
        background: #357abd;
      }
      input[type="range"]::-moz-range-track {
        background: #555;
        height: 6px;
        border-radius: 3px;
      }
    `;
    document.head.appendChild(styleEl);

    sliderWrap.appendChild(this.bpmSlider);
    wrapper.appendChild(this.bpmLabel);
    wrapper.appendChild(sliderWrap);
    container.appendChild(wrapper);
  }

  private bindEvents(): void {
    if (this.choreoBtn) {
      this.choreoBtn.addEventListener('click', () => {
        const enabled = this.choreoBtn?.dataset.active === 'true';
        this.setChoreoMode(!enabled);
        this.callbacks.onChoreoToggle(!enabled);
      });
    }

    if (this.rehearseBtn) {
      this.rehearseBtn.addEventListener('click', () => {
        this.callbacks.onRehearse();
      });
    }

    if (this.randomFormBtn) {
      this.randomFormBtn.addEventListener('click', () => {
        this.callbacks.onRandomFormation();
      });
    }

    if (this.bpmSlider) {
      this.bpmSlider.addEventListener('input', () => {
        const bpm = parseInt(this.bpmSlider!.value, 10);
        this.setBpmLabel(bpm);
        this.callbacks.onBpmChange(bpm);
      });
    }
  }

  public setChoreoMode(enabled: boolean): void {
    if (this.choreoBtn) {
      this.choreoBtn.dataset.active = String(enabled);
      this.choreoBtn.style.backgroundColor = enabled ? this.choreoBtn.dataset.activeColor! : this.choreoBtn.dataset.bgColor!;
    }
    if (this.choreoPanel) {
      if (enabled) {
        this.choreoPanel.classList.remove('hidden');
      } else {
        this.choreoPanel.classList.add('hidden');
      }
    }
    this.blocks.forEach((b) => (b.showNumber = enabled));
    if (enabled) {
      this.renderChoreoPanel();
    }
  }

  public setRehearseButton(playing: boolean): void {
    if (!this.rehearseBtn) return;
    if (playing) {
      this.rehearseBtn.dataset.active = 'true';
      this.rehearseBtn.style.backgroundColor = this.rehearseBtn.dataset.activeColor!;
      this.rehearseBtn.textContent = '停止';
    } else {
      this.rehearseBtn.dataset.active = 'false';
      this.rehearseBtn.style.backgroundColor = this.rehearseBtn.dataset.bgColor!;
      this.rehearseBtn.textContent = '排练';
    }
  }

  public setBpmLabel(bpm: number): void {
    if (this.bpmLabel) {
      this.bpmLabel.textContent = `${bpm} BPM`;
    }
  }

  public setSliderValue(bpm: number): void {
    if (this.bpmSlider) {
      this.bpmSlider.value = String(bpm);
      this.setBpmLabel(bpm);
    }
  }

  private renderChoreoPanel(): void {
    if (!this.choreoList) return;
    this.choreoList.innerHTML = '';

    this.blocks.forEach((block) => {
      const choreoWrapper = document.createElement('div');
      choreoWrapper.className = 'block-choreo';

      const header = document.createElement('div');
      header.className = 'block-choreo-header';

      const labelSpan = document.createElement('span');
      labelSpan.className = 'label';
      const dot = document.createElement('span');
      dot.className = 'color-dot';
      dot.style.backgroundColor = block.getColorDot();
      labelSpan.appendChild(dot);
      labelSpan.appendChild(document.createTextNode(`方块 ${block.id}`));

      const expandIcon = document.createElement('span');
      expandIcon.textContent = '▾';
      expandIcon.style.fontSize = '11px';

      header.appendChild(labelSpan);
      header.appendChild(expandIcon);

      const kfList = document.createElement('div');
      kfList.className = 'keyframe-list';

      const addBtn = document.createElement('button');
      addBtn.className = 'add-kf-btn';
      addBtn.textContent = '+ 添加关键帧';
      addBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.choreoManager.addKeyframe(block.id, {
          x: Math.round(block.x),
          y: Math.round(block.y),
          duration: 1000,
        });
        this.renderChoreoPanel();
      });

      const kfs = this.choreoManager.getKeyframes(block.id);
      kfs.forEach((kf, idx) => {
        const row = this.createKeyframeRow(block.id, kf, idx);
        kfList.appendChild(row);
      });

      let expanded = true;
      header.addEventListener('click', () => {
        expanded = !expanded;
        kfList.style.display = expanded ? 'flex' : 'none';
        addBtn.style.display = expanded ? 'block' : 'none';
        expandIcon.textContent = expanded ? '▾' : '▸';
      });

      choreoWrapper.appendChild(header);
      choreoWrapper.appendChild(kfList);
      choreoWrapper.appendChild(addBtn);
      this.choreoList!.appendChild(choreoWrapper);
    });
  }

  private createKeyframeRow(blockId: number, kf: Keyframe, idx: number): HTMLElement {
    const row = document.createElement('div');
    row.className = 'keyframe-row';

    const idxSpan = document.createElement('span');
    idxSpan.textContent = `#${idx + 1}`;
    idxSpan.style.fontFamily = 'monospace';
    idxSpan.style.fontSize = '11px';
    idxSpan.style.width = '22px';
    idxSpan.style.color = '#aaa';

    const xInput = this.createNumInput(kf.x, (val) => {
      this.choreoManager.updateKeyframe(blockId, kf.id, { x: val });
    });
    const xLabel = document.createElement('span');
    xLabel.textContent = 'x';
    xLabel.style.color = '#888';
    xLabel.style.fontSize = '10px';

    const yInput = this.createNumInput(kf.y, (val) => {
      this.choreoManager.updateKeyframe(blockId, kf.id, { y: val });
    });
    const yLabel = document.createElement('span');
    yLabel.textContent = 'y';
    yLabel.style.color = '#888';
    yLabel.style.fontSize = '10px';

    const dInput = this.createNumInput(kf.duration, (val) => {
      this.choreoManager.updateKeyframe(blockId, kf.id, { duration: Math.max(0, val) });
    }, 0, 60000);
    const dLabel = document.createElement('span');
    dLabel.textContent = 'ms';
    dLabel.style.color = '#888';
    dLabel.style.fontSize = '10px';

    const delBtn = document.createElement('button');
    delBtn.textContent = '×';
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.choreoManager.removeKeyframe(blockId, kf.id);
      this.renderChoreoPanel();
    });

    row.appendChild(idxSpan);
    row.appendChild(xLabel);
    row.appendChild(xInput);
    row.appendChild(yLabel);
    row.appendChild(yInput);
    row.appendChild(dLabel);
    row.appendChild(dInput);
    row.appendChild(delBtn);

    return row;
  }

  private createNumInput(value: number, onChange: (v: number) => void, min?: number, max?: number): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'number';
    input.value = String(value);
    if (min !== undefined) input.min = String(min);
    if (max !== undefined) input.max = String(max);
    input.addEventListener('change', () => {
      const v = parseFloat(input.value);
      if (!isNaN(v)) onChange(v);
    });
    input.addEventListener('click', (e) => e.stopPropagation());
    input.addEventListener('mousedown', (e) => e.stopPropagation());
    return input;
  }

  private setupViewportListener(): void {
    const checkViewport = () => {
      const wasSmall = this.isSmallViewport;
      this.isSmallViewport = window.innerWidth < 900;
      if (wasSmall !== this.isSmallViewport) {
        this.refreshLayout();
      }
    };
    checkViewport();
    window.addEventListener('resize', checkViewport);
  }

  private refreshLayout(): void {
    if (this.bottomBar) {
      this.applyBottomBarStyles(this.bottomBar);
    }
    if (this.choreoBtn) {
      const w = this.isSmallViewport ? 90 : 120;
      const h = this.isSmallViewport ? 30 : 36;
      this.choreoBtn.style.width = `${w}px`;
      this.choreoBtn.style.height = `${h}px`;
      this.choreoBtn.style.fontSize = this.isSmallViewport ? '12px' : '13px';
    }
    if (this.rehearseBtn) {
      const w = this.isSmallViewport ? 90 : 120;
      const h = this.isSmallViewport ? 30 : 36;
      this.rehearseBtn.style.width = `${w}px`;
      this.rehearseBtn.style.height = `${h}px`;
      this.rehearseBtn.style.fontSize = this.isSmallViewport ? '12px' : '13px';
    }
  }

  public getIsSmallViewport(): boolean {
    return this.isSmallViewport;
  }

  public getCanvasDimensions(): { w: number; h: number } {
    if (this.isSmallViewport) {
      return { w: UIController.CANVAS_W_SMALL, h: UIController.CANVAS_H_SMALL };
    }
    return { w: UIController.CANVAS_W, h: UIController.CANVAS_H };
  }

  public setRandomButtonActive(active: boolean): void {
    if (!this.randomFormBtn) return;
    if (active) {
      this.randomFormBtn.style.backgroundColor = '#c25e17';
    } else {
      this.randomFormBtn.style.backgroundColor = '#e67e22';
    }
  }
}
