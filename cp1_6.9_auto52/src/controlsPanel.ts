import type { AnimationMode, BackgroundType, NeonRenderParams } from './neonRenderer';

export interface PanelCallbacks {
  onParamsChange: (params: Partial<NeonRenderParams>) => void;
  onExport: () => void;
}

const NEON_COLORS: { name: string; hex: string }[] = [
  { name: '荧光红', hex: '#FF1493' },
  { name: '激光绿', hex: '#39FF14' },
  { name: '电光蓝', hex: '#00FFFF' },
  { name: '紫外紫', hex: '#8A2BE2' },
  { name: '暖橙', hex: '#FF4500' },
  { name: '金黄', hex: '#FFD700' },
  { name: '粉紫', hex: '#FF00FF' },
  { name: '青柠', hex: '#ADFF2F' },
  { name: '湖蓝', hex: '#1E90FF' },
  { name: '珊瑚', hex: '#FF6B6B' },
  { name: '薄荷', hex: '#00FFB3' },
  { name: '纯白', hex: '#FFFFFF' }
];

const SCENES: { type: BackgroundType; name: string; cssBg: string }[] = [
  { type: 'brick', name: '砖墙纹理', cssBg: 'linear-gradient(135deg, #5a3020 0%, #3a1810 100%)' },
  { type: 'acrylic', name: '黑色亚克力', cssBg: 'linear-gradient(135deg, #1a1a2e 0%, #0d0d18 100%)' },
  { type: 'glass', name: '磨砂玻璃', cssBg: 'linear-gradient(135deg, #5a6a7a 0%, #3a4a5a 100%)' }
];

export class ControlsPanel {
  private callbacks: PanelCallbacks;
  private currentColor: string = NEON_COLORS[0].hex;
  private currentMode: AnimationMode = 'static';
  private currentScene: BackgroundType = 'brick';

  constructor(root: HTMLElement, callbacks: PanelCallbacks) {
    this.callbacks = callbacks;
    this.initColorSwatches();
    this.initSceneCards();
    this.initSliders();
    this.initTextInput();
    this.initAnimationButtons();
    this.initZoomButtons();
  }

  private initColorSwatches(): void {
    const grid = document.getElementById('color-grid');
    if (!grid) return;

    NEON_COLORS.forEach((c, idx) => {
      const swatch = document.createElement('div');
      swatch.className = 'color-swatch' + (idx === 0 ? ' active' : '');
      swatch.style.background = c.hex;
      swatch.style.setProperty('--glow-color', c.hex);
      const afterStyle = `box-shadow: 0 0 14px ${c.hex};`;
      swatch.setAttribute('style', `background:${c.hex};${afterStyle}`);
      swatch.title = c.name;
      swatch.dataset.color = c.hex;

      swatch.addEventListener('click', () => {
        document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
        this.currentColor = c.hex;
        this.callbacks.onParamsChange({ color: c.hex });
      });

      grid.appendChild(swatch);
    });
  }

  private initSceneCards(): void {
    const grid = document.getElementById('scene-grid');
    if (!grid) return;

    SCENES.forEach((s, idx) => {
      const card = document.createElement('div');
      card.className = 'scene-card' + (idx === 0 ? ' active' : '');
      card.dataset.scene = s.type;
      card.innerHTML = `
        <div class="scene-thumb" style="background:${s.cssBg}"></div>
        <div class="scene-label">${s.name}</div>
      `;

      card.addEventListener('click', () => {
        document.querySelectorAll('.scene-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        this.currentScene = s.type;
        this.callbacks.onParamsChange({ background: s.type });
      });

      grid.appendChild(card);
    });
  }

  private initSliders(): void {
    const intensitySlider = document.getElementById('intensity-slider') as HTMLInputElement | null;
    const intensityValue = document.getElementById('intensity-value');
    if (intensitySlider && intensityValue) {
      intensitySlider.addEventListener('input', () => {
        const v = parseFloat(intensitySlider.value);
        intensityValue.textContent = v.toFixed(1) + 'x';
        this.callbacks.onParamsChange({ glowIntensity: v });
      });
    }

    const tubeSlider = document.getElementById('tube-slider') as HTMLInputElement | null;
    const tubeValue = document.getElementById('tube-value');
    if (tubeSlider && tubeValue) {
      tubeSlider.addEventListener('input', () => {
        const v = parseInt(tubeSlider.value, 10);
        tubeValue.textContent = v + 'px';
        this.callbacks.onParamsChange({ tubeWidth: v });
      });
    }

    const scaleSlider = document.getElementById('scale-slider') as HTMLInputElement | null;
    const scaleValue = document.getElementById('scale-value');
    if (scaleSlider && scaleValue) {
      scaleSlider.addEventListener('input', () => {
        const v = parseFloat(scaleSlider.value);
        scaleValue.textContent = v.toFixed(2) + 'x';
        this.callbacks.onParamsChange({ scale: v });
      });
    }
  }

  private initTextInput(): void {
    const input = document.getElementById('text-input') as HTMLInputElement | null;
    if (!input) return;

    input.addEventListener('input', () => {
      let text = input.value;
      const chineseCount = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
      const otherCount = text.length - chineseCount;
      const maxLen = chineseCount * 2 + otherCount;
      
      if (maxLen > 8) {
        let result = '';
        let count = 0;
        for (const ch of text) {
          const isChinese = /[\u4e00-\u9fa5]/.test(ch);
          const cost = isChinese ? 2 : 1;
          if (count + cost <= 8) {
            result += ch;
            count += cost;
          } else {
            break;
          }
        }
        text = result;
        input.value = text;
      }
      this.callbacks.onParamsChange({ text });
    });
  }

  private initAnimationButtons(): void {
    const buttons = document.querySelectorAll('.anim-btn');
    buttons.forEach((btn, idx) => {
      if (idx === 0) btn.classList.add('active');
      btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const mode = (btn as HTMLElement).dataset.mode as AnimationMode;
        this.currentMode = mode;
        this.callbacks.onParamsChange({ animationMode: mode });
      });
    });
  }

  private initZoomButtons(): void {
    const zoomIn = document.getElementById('zoom-in');
    const zoomOut = document.getElementById('zoom-out');
    const zoomReset = document.getElementById('zoom-reset');
    const scaleSlider = document.getElementById('scale-slider') as HTMLInputElement | null;
    const scaleValue = document.getElementById('scale-value');

    const updateScale = (val: number) => {
      const clamped = Math.min(2.0, Math.max(0.5, val));
      if (scaleSlider) scaleSlider.value = clamped.toFixed(2);
      if (scaleValue) scaleValue.textContent = clamped.toFixed(2) + 'x';
      this.callbacks.onParamsChange({ scale: clamped });
    };

    const getCurrentScale = () => {
      return scaleSlider ? parseFloat(scaleSlider.value) : 1.0;
    };

    zoomIn?.addEventListener('click', () => updateScale(getCurrentScale() + 0.1));
    zoomOut?.addEventListener('click', () => updateScale(getCurrentScale() - 0.1));
    zoomReset?.addEventListener('click', () => updateScale(1.0));

    const exportBtn = document.getElementById('export-btn');
    exportBtn?.addEventListener('click', () => this.callbacks.onExport());
  }

  setParams(params: Partial<NeonRenderParams>): void {
    if (params.color && params.color !== this.currentColor) {
      this.currentColor = params.color;
      document.querySelectorAll('.color-swatch').forEach(s => {
        s.classList.toggle('active', (s as HTMLElement).dataset.color === params.color);
      });
    }
    if (params.animationMode && params.animationMode !== this.currentMode) {
      this.currentMode = params.animationMode;
      document.querySelectorAll('.anim-btn').forEach(b => {
        b.classList.toggle('active', (b as HTMLElement).dataset.mode === params.animationMode);
      });
    }
    if (params.background && params.background !== this.currentScene) {
      this.currentScene = params.background;
      document.querySelectorAll('.scene-card').forEach(c => {
        c.classList.toggle('active', (c as HTMLElement).dataset.scene === params.background);
      });
    }
  }
}
