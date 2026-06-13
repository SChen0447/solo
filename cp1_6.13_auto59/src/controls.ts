import type { SimulationManager } from './simulation';

export interface ControlsCallbacks {
  onGravityChange: (value: number) => void;
  onClear: () => void;
  onParticlesToggle: (enabled: boolean) => void;
}

export class ControlsManager {
  private container: HTMLElement;
  private sim: SimulationManager;
  private starCountEl: HTMLElement | null = null;
  private lastCount: number = -1;

  constructor(containerId: string, sim: SimulationManager) {
    this.container = document.getElementById(containerId)!;
    this.sim = sim;
    this.buildUI();
  }

  private buildUI() {
    const isMobile = window.innerWidth < 768;

    this.container.innerHTML = '';

    const panel = document.createElement('div');
    panel.style.cssText = `
      position: absolute;
      ${isMobile ? 'bottom: 0; left: 0; right: 0; height: 60px;' : 'top: 20px; right: 20px; width: 220px;'}
      background: rgba(20, 30, 60, 0.7);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      padding: ${isMobile ? '8px 16px' : '18px 16px'};
      color: #e0e6ff;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      display: flex;
      flex-direction: ${isMobile ? 'row' : 'column'};
      gap: ${isMobile ? '12px' : '14px'};
      align-items: ${isMobile ? 'center' : 'stretch'};
      transform: translateX(${isMobile ? '0' : '100%'});
      opacity: 0;
      transition: transform 0.3s ease-out, opacity 0.3s ease-out;
      z-index: 10;
      user-select: none;
    `;

    const title = document.createElement('div');
    title.textContent = '引力沙盒';
    title.style.cssText = `
      font-size: ${isMobile ? '13px' : '15px'};
      font-weight: 600;
      color: #a8c0ff;
      letter-spacing: 0.5px;
      padding-bottom: ${isMobile ? '0' : '6px'};
      border-bottom: ${isMobile ? 'none' : '1px solid rgba(255,255,255,0.1)'};
      margin-bottom: ${isMobile ? '0' : '2px'};
      white-space: nowrap;
    `;
    panel.appendChild(title);

    const sliderWrap = this.createSlider(isMobile);
    panel.appendChild(sliderWrap);

    const countWrap = this.createStarCount(isMobile);
    panel.appendChild(countWrap);

    if (!isMobile) {
      const toggleWrap = this.createParticleToggle();
      panel.appendChild(toggleWrap);
    }

    const btnWrap = this.createClearButton(isMobile);
    panel.appendChild(btnWrap);

    this.container.appendChild(panel);

    requestAnimationFrame(() => {
      panel.style.transform = 'translateX(0)';
      panel.style.opacity = '1';
    });
  }

  private createSlider(isMobile: boolean): HTMLElement {
    const wrap = document.createElement('div');
    wrap.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 4px;
      ${isMobile ? 'flex: 1; min-width: 0;' : ''}
    `;

    const labelRow = document.createElement('div');
    labelRow.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      color: #b8c4e0;
    `;
    const label = document.createElement('span');
    label.textContent = '引力常数';
    const value = document.createElement('span');
    value.textContent = '1.0';
    value.style.cssText = `
      font-weight: 600;
      color: #8ab4ff;
      min-width: 30px;
      text-align: right;
      transition: color 0.2s;
    `;
    labelRow.appendChild(label);
    labelRow.appendChild(value);
    wrap.appendChild(labelRow);

    const track = document.createElement('div');
    track.style.cssText = `
      position: relative;
      height: 6px;
      background: linear-gradient(to right, #3a6fff, #ff5533);
      border-radius: 3px;
      cursor: pointer;
    `;

    const fill = document.createElement('div');
    fill.style.cssText = `
      position: absolute;
      left: 0;
      top: 0;
      height: 100%;
      background: rgba(255, 255, 255, 0.35);
      border-radius: 3px;
      width: 20%;
      pointer-events: none;
    `;
    track.appendChild(fill);

    const thumb = document.createElement('div');
    thumb.style.cssText = `
      position: absolute;
      top: 50%;
      transform: translate(-50%, -50%);
      width: 16px;
      height: 16px;
      background: white;
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
      left: 20%;
      pointer-events: none;
      transition: box-shadow 0.2s;
    `;
    track.appendChild(thumb);
    wrap.appendChild(track);

    let dragging = false;
    const min = 0.1, max = 5.0;

    const updateSlider = (clientX: number) => {
      const rect = track.getBoundingClientRect();
      let pct = (clientX - rect.left) / rect.width;
      pct = Math.max(0, Math.min(1, pct));
      const v = min + (max - min) * pct;
      const rounded = Math.round(v * 10) / 10;
      fill.style.width = (pct * 100) + '%';
      thumb.style.left = (pct * 100) + '%';
      value.textContent = rounded.toFixed(1);
      const hue = 220 * (1 - pct);
      value.style.color = `hsl(${hue}, 80%, 75%)`;
      this.sim.setGravity(rounded);
    };

    track.addEventListener('mousedown', (e) => {
      dragging = true;
      thumb.style.boxShadow = '0 2px 12px rgba(255,255,255,0.6)';
      updateSlider(e.clientX);
    });
    document.addEventListener('mousemove', (e) => {
      if (dragging) updateSlider(e.clientX);
    });
    document.addEventListener('mouseup', () => {
      if (dragging) {
        dragging = false;
        thumb.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.3)';
      }
    });

    track.addEventListener('touchstart', (e) => {
      dragging = true;
      updateSlider(e.touches[0].clientX);
    }, { passive: true });
    document.addEventListener('touchmove', (e) => {
      if (dragging) updateSlider(e.touches[0].clientX);
    }, { passive: true });
    document.addEventListener('touchend', () => {
      dragging = false;
    });

    return wrap;
  }

  private createStarCount(isMobile: boolean): HTMLElement {
    const wrap = document.createElement('div');
    wrap.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 12px;
      color: #b8c4e0;
      ${isMobile ? '' : 'padding: 4px 0;'}
    `;
    const label = document.createElement('span');
    label.textContent = '恒星数量';
    const count = document.createElement('span');
    count.textContent = '0';
    count.style.cssText = `
      font-size: 18px;
      font-weight: 700;
      color: #ffd88a;
      min-width: 32px;
      text-align: right;
      transition: opacity 0.2s ease, transform 0.2s ease;
    `;
    wrap.appendChild(label);
    wrap.appendChild(count);
    this.starCountEl = count;
    return wrap;
  }

  private createParticleToggle(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 12px;
      color: #b8c4e0;
      padding: 4px 0;
    `;
    const label = document.createElement('span');
    label.textContent = '粒子特效';

    const track = document.createElement('div');
    track.style.cssText = `
      position: relative;
      width: 42px;
      height: 22px;
      background: rgba(100, 110, 140, 0.6);
      border-radius: 11px;
      cursor: pointer;
      transition: background 0.25s ease;
      border: 1px solid rgba(255,255,255,0.15);
    `;

    const knob = document.createElement('div');
    knob.style.cssText = `
      position: absolute;
      top: 1px;
      left: 1px;
      width: 18px;
      height: 18px;
      background: #aaa;
      border-radius: 50%;
      transition: left 0.25s ease, background 0.25s ease;
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    `;
    track.appendChild(knob);

    let enabled = true;
    track.addEventListener('click', () => {
      enabled = !enabled;
      if (enabled) {
        track.style.background = 'rgba(80, 200, 120, 0.6)';
        knob.style.left = '21px';
        knob.style.background = '#66e090';
      } else {
        track.style.background = 'rgba(100, 110, 140, 0.6)';
        knob.style.left = '1px';
        knob.style.background = '#aaa';
      }
      this.sim.setParticlesEnabled(enabled);
    });

    track.style.background = 'rgba(80, 200, 120, 0.6)';
    knob.style.left = '21px';
    knob.style.background = '#66e090';

    wrap.appendChild(label);
    wrap.appendChild(track);
    return wrap;
  }

  private createClearButton(isMobile: boolean): HTMLElement {
    const wrap = document.createElement('div');
    wrap.style.cssText = `${isMobile ? '' : 'margin-top: 4px;'}`;

    const btn = document.createElement('button');
    btn.textContent = '清空所有恒星';
    btn.style.cssText = `
      width: 100%;
      padding: ${isMobile ? '8px 16px' : '10px 12px'};
      background: linear-gradient(135deg, #b32030, #c45a20);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      color: white;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease;
      font-family: inherit;
      white-space: nowrap;
      box-shadow: 0 2px 8px rgba(180, 40, 40, 0.3);
    `;

    btn.addEventListener('mouseenter', () => {
      btn.style.filter = 'brightness(1.1)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.filter = 'brightness(1)';
    });

    let animating = false;
    btn.addEventListener('mousedown', () => {
      btn.style.transform = 'scale(0.8)';
    });
    btn.addEventListener('mouseup', () => {
      btn.style.transform = 'scale(1.05)';
      setTimeout(() => { btn.style.transform = 'scale(1)'; }, 100);
      if (!animating) {
        animating = true;
        this.sim.clearStars();
        setTimeout(() => { animating = false; }, 1200);
      }
    });
    btn.addEventListener('mouseleave', () => {
      if (btn.style.transform === 'scale(0.8)') {
        btn.style.transform = 'scale(1)';
      }
    });

    wrap.appendChild(btn);
    return wrap;
  }

  updateStarCount(count: number) {
    if (!this.starCountEl) return;
    if (count === this.lastCount) return;
    this.lastCount = count;
    this.starCountEl.style.opacity = '0.3';
    this.starCountEl.style.transform = 'scale(0.9)';
    setTimeout(() => {
      if (this.starCountEl) {
        this.starCountEl.textContent = String(count);
        this.starCountEl.style.opacity = '1';
        this.starCountEl.style.transform = 'scale(1)';
      }
    }, 100);
  }

  rebuild() {
    this.buildUI();
  }
}
