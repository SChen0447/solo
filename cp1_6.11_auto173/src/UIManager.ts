import gsap from 'gsap';
import { SceneRenderer } from './SceneRenderer';
import { ConstellationManager } from './ConstellationManager';
import { IStarData } from './starData';

const ZODIAC_SYMBOLS: Record<string, string> = {
  Aries: '♈',
  Taurus: '♉',
  Gemini: '♊',
  Cancer: '♋',
  Leo: '♌',
  Virgo: '♍',
  Libra: '♎',
  Scorpius: '♏',
  Sagittarius: '♐',
  Capricornus: '♑',
  Aquarius: '♒',
  Pisces: '♓',
};

export class UIManager {
  sceneRenderer: SceneRenderer;
  constellationManager: ConstellationManager;
  container: HTMLElement;
  private timelineValue: number = 0;
  private parallaxValue: number = 0;
  private infoCard: HTMLElement | null = null;
  private infoCardTimeout: number = 0;
  private isMobile: boolean = false;
  private constellationButtons: Map<string, HTMLElement> = new Map();

  constructor(
    container: HTMLElement,
    sceneRenderer: SceneRenderer,
    constellationManager: ConstellationManager
  ) {
    this.container = container;
    this.sceneRenderer = sceneRenderer;
    this.constellationManager = constellationManager;
    this.isMobile = window.innerWidth < 768;
    this.createUI();
    this.setupResizeListener();

    this.sceneRenderer.onStarClick = (star: IStarData) => {
      this.showStarInfoCard(star);
    };
  }

  private createUI(): void {
    this.createConstellationPanel();
    this.createTimelineSlider();
    this.createParallaxKnob();
    this.createMobileDrawer();
  }

  private createConstellationPanel(): void {
    const panel = document.createElement('div');
    panel.id = 'constellation-panel';
    panel.style.cssText = `
      position: fixed;
      top: 20px;
      left: 20px;
      z-index: 100;
      display: grid;
      grid-template-columns: repeat(6, 28px);
      grid-template-rows: repeat(2, 28px);
      gap: 6px;
    `;

    const names = this.constellationManager.getConstellationNames();
    for (const name of names) {
      const btn = document.createElement('button');
      const color = this.constellationManager.getConstellationColor(name);
      const symbol = ZODIAC_SYMBOLS[name] || name[0];
      const activeColor = color
        ? `rgb(${Math.round(color.r * 255)},${Math.round(color.g * 255)},${Math.round(color.b * 255)})`
        : '#fff';

      btn.title = name;
      btn.textContent = symbol;
      btn.dataset.constellation = name;
      btn.dataset.active = 'true';
      btn.style.cssText = `
        width: 28px;
        height: 28px;
        border-radius: 50%;
        border: 1px solid rgba(255,255,255,0.15);
        background: ${activeColor};
        color: #000;
        font-size: 14px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
        box-shadow: inset 0 0 10px rgba(0,0,0,0.3);
        outline: none;
        padding: 0;
        line-height: 1;
      `;

      btn.addEventListener('mouseenter', () => {
        btn.style.boxShadow = `inset 0 0 10px rgba(0,0,0,0.3), 0 0 1px 1px rgba(255,255,255,0.7)`;
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.boxShadow = `inset 0 0 10px rgba(0,0,0,0.3)`;
      });

      btn.addEventListener('click', () => {
        const isActive = btn.dataset.active === 'true';
        btn.dataset.active = isActive ? 'false' : 'true';

        if (isActive) {
          btn.style.background = '#222';
          btn.style.color = '#888';
          this.constellationManager.setConstellationVisible(name, false);
        } else {
          btn.style.background = activeColor;
          btn.style.color = '#000';
          this.constellationManager.setConstellationVisible(name, true);
        }

        btn.style.transform = 'scale(0.92)';
        setTimeout(() => {
          btn.style.transform = 'scale(1)';
        }, 120);
      });

      this.constellationButtons.set(name, btn);
      panel.appendChild(btn);
    }

    this.container.appendChild(panel);
  }

  private createTimelineSlider(): void {
    const wrapper = document.createElement('div');
    wrapper.id = 'timeline-wrapper';
    wrapper.style.cssText = `
      position: fixed;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 100;
      width: min(700px, 80vw);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    `;

    const yearDisplay = document.createElement('div');
    yearDisplay.id = 'year-display';
    yearDisplay.style.cssText = `
      font-family: 'Courier New', Consolas, monospace;
      font-size: 14px;
      color: rgba(255,255,255,0.7);
      letter-spacing: 2px;
      text-shadow: 0 0 8px rgba(100,150,255,0.4);
    `;
    yearDisplay.textContent = '0 年';

    const sliderContainer = document.createElement('div');
    sliderContainer.style.cssText = `
      width: 100%;
      position: relative;
      height: 28px;
      display: flex;
      align-items: center;
    `;

    const tickContainer = document.createElement('div');
    tickContainer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 100%;
      display: flex;
      justify-content: space-between;
      padding: 0 2px;
      pointer-events: none;
    `;

    const tickLabels = [-1000, -500, 0, 500, 1000];
    for (const label of tickLabels) {
      const tick = document.createElement('div');
      tick.style.cssText = `
        font-size: 9px;
        color: rgba(255,255,255,0.25);
        position: absolute;
        left: ${((label + 1000) / 2000) * 100}%;
        transform: translateX(-50%);
        top: -2px;
        font-family: 'Courier New', Consolas, monospace;
      `;
      tick.textContent = `${label}`;
      tickContainer.appendChild(tick);
    }
    sliderContainer.appendChild(tickContainer);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.id = 'timeline-slider';
    slider.min = '-1000';
    slider.max = '1000';
    slider.step = '10';
    slider.value = '0';
    slider.style.cssText = `
      -webkit-appearance: none;
      appearance: none;
      width: 100%;
      height: 4px;
      background: linear-gradient(90deg, rgba(100,80,180,0.5), rgba(60,120,200,0.5), rgba(180,80,120,0.5));
      border-radius: 2px;
      outline: none;
      cursor: pointer;
    `;

    const thumbStyle = document.createElement('style');
    thumbStyle.textContent = `
      #timeline-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: radial-gradient(circle, #aaccee 30%, #6688aa 100%);
        border: 1px solid rgba(255,255,255,0.3);
        cursor: grab;
        box-shadow: 0 0 10px rgba(100,150,255,0.5);
        transition: transform 0.1s ease;
      }
      #timeline-slider::-webkit-slider-thumb:active {
        cursor: grabbing;
        transform: scale(0.92);
      }
      #timeline-slider::-moz-range-thumb {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: radial-gradient(circle, #aaccee 30%, #6688aa 100%);
        border: 1px solid rgba(255,255,255,0.3);
        cursor: grab;
        box-shadow: 0 0 10px rgba(100,150,255,0.5);
      }
    `;
    document.head.appendChild(thumbStyle);

    slider.addEventListener('input', () => {
      const val = parseInt(slider.value, 10);
      this.timelineValue = val;
      yearDisplay.textContent = `${val > 0 ? '+' : ''}${val} 年`;

      this.sceneRenderer.updateYearOffset(val);
      this.constellationManager.updateConstellationLines(val);

      const blend = (val + 1000) / 2000;
      gsap.to(this.sceneRenderer.scene.background as any, {
        r: 0.039 + blend * 0.063,
        g: 0.039 + (0.5 - Math.abs(blend - 0.5)) * 0.02,
        b: 0.165 - blend * 0.02,
        duration: 0.5,
        ease: 'power2.out',
      });
    });

    slider.addEventListener('mousedown', () => {
      slider.style.transform = 'scale(0.98)';
    });
    slider.addEventListener('mouseup', () => {
      slider.style.transform = 'scale(1)';
    });

    sliderContainer.appendChild(slider);
    wrapper.appendChild(yearDisplay);
    wrapper.appendChild(sliderContainer);
    this.container.appendChild(wrapper);
  }

  private createParallaxKnob(): void {
    const wrapper = document.createElement('div');
    wrapper.id = 'parallax-wrapper';
    wrapper.style.cssText = `
      position: fixed;
      right: 30px;
      top: 50%;
      transform: translateY(-50%);
      z-index: 100;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
    `;

    const label = document.createElement('div');
    label.style.cssText = `
      font-size: 10px;
      color: rgba(255,255,255,0.4);
      font-family: 'Courier New', Consolas, monospace;
      letter-spacing: 1px;
      writing-mode: vertical-rl;
      text-orientation: mixed;
      margin-bottom: 4px;
    `;
    label.textContent = '视差';

    const angleDisplay = document.createElement('div');
    angleDisplay.id = 'angle-display';
    angleDisplay.style.cssText = `
      font-family: 'Courier New', Consolas, monospace;
      font-size: 12px;
      color: rgba(255,255,255,0.6);
      text-align: center;
    `;
    angleDisplay.textContent = '0°';

    const knobArea = document.createElement('div');
    knobArea.style.cssText = `
      position: relative;
      width: 60px;
      height: 200px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '60');
    svg.setAttribute('height', '200');
    svg.setAttribute('viewBox', '0 0 60 200');
    svg.style.cssText = 'overflow: visible;';

    const arcPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    arcPath.setAttribute('d', 'M 10 20 A 70 70 0 0 0 10 180');
    arcPath.setAttribute('fill', 'none');
    arcPath.setAttribute('stroke', 'rgba(255,255,255,0.12)');
    arcPath.setAttribute('stroke-width', '2');
    svg.appendChild(arcPath);

    const ticks = [-30, -20, -10, 0, 10, 20, 30];
    for (const tick of ticks) {
      const angle = ((tick + 30) / 60) * Math.PI;
      const cx = 10;
      const cy = 100;
      const r = 70;
      const x1 = cx + (r - 5) * Math.cos(Math.PI - angle);
      const y1 = cy - (r - 5) * Math.sin(Math.PI - angle) * (-1);
      const x2 = cx + (r + 5) * Math.cos(Math.PI - angle);
      const y2 = cy - (r + 5) * Math.sin(Math.PI - angle) * (-1);

      const tickLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      tickLine.setAttribute('x1', x1.toString());
      tickLine.setAttribute('y1', (200 - y1).toString());
      tickLine.setAttribute('x2', x2.toString());
      tickLine.setAttribute('y2', (200 - y2).toString());
      tickLine.setAttribute('stroke', 'rgba(255,255,255,0.15)');
      tickLine.setAttribute('stroke-width', '1');
      svg.appendChild(tickLine);
    }

    const indicator = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    indicator.setAttribute('cx', '10');
    indicator.setAttribute('cy', '100');
    indicator.setAttribute('r', '6');
    indicator.setAttribute('fill', '#6688cc');
    indicator.setAttribute('stroke', 'rgba(255,255,255,0.3)');
    indicator.setAttribute('stroke-width', '1');
    indicator.id = 'parallax-indicator';
    svg.appendChild(indicator);

    knobArea.appendChild(svg);

    let knobDragging = false;
    const handleKnobMove = (clientY: number) => {
      const rect = knobArea.getBoundingClientRect();
      const relY = (clientY - rect.top) / rect.height;
      const clampedY = Math.max(0, Math.min(1, relY));
      const angle = -30 + clampedY * 60;
      const rounded = Math.round(angle);

      this.parallaxValue = rounded;
      angleDisplay.textContent = `${rounded > 0 ? '+' : ''}${rounded}°`;
      this.sceneRenderer.updateParallaxAngle(rounded);

      const indAngle = ((rounded + 30) / 60) * Math.PI;
      const cx = 10;
      const cy = 100;
      const r = 70;
      const ix = cx + r * Math.cos(Math.PI - indAngle);
      const iy = cy - r * Math.sin(Math.PI - indAngle) * (-1);
      indicator.setAttribute('cx', ix.toString());
      indicator.setAttribute('cy', (200 - iy).toString());
    };

    knobArea.addEventListener('mousedown', (e) => {
      knobDragging = true;
      handleKnobMove(e.clientY);
    });
    window.addEventListener('mousemove', (e) => {
      if (knobDragging) handleKnobMove(e.clientY);
    });
    window.addEventListener('mouseup', () => {
      knobDragging = false;
    });

    knobArea.addEventListener('touchstart', (e) => {
      knobDragging = true;
      handleKnobMove(e.touches[0].clientY);
    });
    window.addEventListener('touchmove', (e) => {
      if (knobDragging) handleKnobMove(e.touches[0].clientY);
    });
    window.addEventListener('touchend', () => {
      knobDragging = false;
    });

    wrapper.appendChild(label);
    wrapper.appendChild(angleDisplay);
    wrapper.appendChild(knobArea);
    this.container.appendChild(wrapper);
  }

  private createMobileDrawer(): void {
    if (!this.isMobile) return;

    const drawer = document.createElement('div');
    drawer.id = 'mobile-drawer';
    drawer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 60px;
      height: 100%;
      z-index: 200;
      background: rgba(10,10,26,0.9);
      border-right: 1px solid rgba(255,255,255,0.08);
      overflow-y: auto;
      transform: translateX(-60px);
      transition: transform 0.3s ease;
      padding: 10px 5px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    `;

    const toggleBtn = document.createElement('button');
    toggleBtn.style.cssText = `
      position: fixed;
      top: 10px;
      left: 10px;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.15);
      color: #aaa;
      font-size: 16px;
      cursor: pointer;
      z-index: 201;
      display: none;
      align-items: center;
      justify-content: center;
      outline: none;
    `;
    toggleBtn.textContent = '☰';

    if (this.isMobile) {
      toggleBtn.style.display = 'flex';

      const panel = document.getElementById('constellation-panel');
      if (panel) panel.style.display = 'none';
    }

    let drawerOpen = false;
    toggleBtn.addEventListener('click', () => {
      drawerOpen = !drawerOpen;
      drawer.style.transform = drawerOpen ? 'translateX(0)' : 'translateX(-60px)';
    });

    this.container.appendChild(toggleBtn);
    this.container.appendChild(drawer);
  }

  showStarInfoCard(star: IStarData): void {
    if (this.infoCard) {
      this.infoCard.remove();
      clearTimeout(this.infoCardTimeout);
    }

    const card = document.createElement('div');
    card.className = 'star-info-card';
    card.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0.9);
      z-index: 300;
      min-width: 220px;
      padding: 20px 24px;
      background: rgba(20, 20, 40, 0.75);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      box-shadow: 0 0 30px rgba(100,150,255,0.15), inset 0 0 10px rgba(0,0,0,0.2);
      opacity: 0;
      transition: opacity 0.3s ease, transform 0.3s ease;
      pointer-events: none;
    `;

    const starColor = this.sceneRenderer.starSystem.getStarColor(star.spectralType);
    const colorHex = `rgb(${Math.round(starColor.r * 255)},${Math.round(starColor.g * 255)},${Math.round(starColor.b * 255)})`;

    card.innerHTML = `
      <div style="font-size:18px;font-weight:bold;color:${colorHex};margin-bottom:12px;text-shadow:0 0 8px ${colorHex};letter-spacing:1px;">${star.name}</div>
      <div style="display:grid;grid-template-columns:auto 1fr;gap:6px 12px;font-size:12px;color:rgba(255,255,255,0.65);">
        <span style="color:rgba(255,255,255,0.35);">星等</span><span>${star.magnitude.toFixed(2)}</span>
        <span style="color:rgba(255,255,255,0.35);">距离</span><span>${star.distance.toFixed(1)} 光年</span>
        <span style="color:rgba(255,255,255,0.35);">光谱</span><span style="color:${colorHex};">${star.spectralType}</span>
        <span style="color:rgba(255,255,255,0.35);">星座</span><span>${ZODIAC_SYMBOLS[star.constellation] || ''} ${star.constellation}</span>
      </div>
    `;

    this.container.appendChild(card);
    this.infoCard = card;

    requestAnimationFrame(() => {
      card.style.opacity = '1';
      card.style.transform = 'translate(-50%, -50%) scale(1)';
    });

    this.infoCardTimeout = window.setTimeout(() => {
      gsap.to(card, {
        opacity: 0,
        scale: 0.9,
        duration: 0.6,
        ease: 'power2.in',
        onComplete: () => {
          card.remove();
          if (this.infoCard === card) this.infoCard = null;
        },
      });
    }, 3000);
  }

  private setupResizeListener(): void {
    window.addEventListener('resize', () => {
      const wasMobile = this.isMobile;
      this.isMobile = window.innerWidth < 768;

      if (wasMobile !== this.isMobile) {
        const panel = document.getElementById('constellation-panel');
        const toggleBtn = this.container.querySelector('button');
        if (this.isMobile) {
          if (panel) panel.style.display = 'none';
        } else {
          if (panel) panel.style.display = 'grid';
        }
      }

      const timelineWrapper = document.getElementById('timeline-wrapper');
      if (timelineWrapper) {
        if (this.isMobile) {
          timelineWrapper.style.height = '40px';
          timelineWrapper.style.bottom = '10px';
        } else {
          timelineWrapper.style.height = '';
          timelineWrapper.style.bottom = '30px';
        }
      }
    });
  }
}
