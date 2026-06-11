import * as THREE from 'three';
import { DanFurnace } from './DanFurnace';
import { HerbSlot } from './HerbSlot';
import { AlchemyEngine, ElixirResult } from './AlchemyEngine';
import { ElementType, ELEMENTS, ELEMENT_COLORS, ELEMENT_NAMES, COLOR_SCHEME } from './constants';
import confetti from 'canvas-confetti';

class AlchemyGame {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private container: HTMLElement;
  private danFurnace!: DanFurnace;
  private herbSlot!: HerbSlot;
  private alchemyEngine!: AlchemyEngine;
  private fireCanvas!: HTMLCanvasElement;
  private dashboard!: HTMLElement;
  private logContainer!: HTMLElement;
  private elixirLog: ElixirResult[] = [];
  private maxLogSize = 20;
  private clock: THREE.Clock;
  private isAlchemizing = false;
  private furnaceShake = 0;
  private alchemizeBtn!: HTMLElement;

  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) throw new Error(`Container ${containerId} not found`);
    this.container = container;
    this.clock = new THREE.Clock();
    this.init();
  }

  private init(): void {
    this.setupScene();
    this.setupLights();
    this.setupFurnace();
    this.setupFireCanvas();
    this.setupUI();
    this.setupHerbSlot();
    this.setupAlchemyEngine();
    this.setupEventListeners();
    this.animate();
  }

  private setupScene(): void {
    this.scene = new THREE.Scene();
    
    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 2, 8);
    this.camera.lookAt(0, 0.5, 0);
    
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.shadowMap.enabled = true;
    
    const threeContainer = document.createElement('div');
    threeContainer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 10;
    `;
    threeContainer.appendChild(this.renderer.domElement);
    this.container.appendChild(threeContainer);
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffd700, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);
    
    const pointLight = new THREE.PointLight(0xff6347, 0.5, 10);
    pointLight.position.set(0, 0, 0);
    this.scene.add(pointLight);
  }

  private setupFurnace(): void {
    this.danFurnace = new DanFurnace();
    this.danFurnace.group.position.y = 0;
    this.scene.add(this.danFurnace.group);
  }

  private setupFireCanvas(): void {
    this.fireCanvas = document.createElement('canvas');
    this.fireCanvas.width = 300;
    this.fireCanvas.height = 200;
    this.fireCanvas.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -80%);
      pointer-events: none;
      z-index: 15;
      opacity: 0.8;
      mix-blend-mode: screen;
    `;
    this.container.appendChild(this.fireCanvas);
  }

  private setupUI(): void {
    const bgGradient = document.createElement('div');
    bgGradient.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(180deg, ${COLOR_SCHEME.backgroundStart} 0%, ${COLOR_SCHEME.backgroundMid} 50%, ${COLOR_SCHEME.backgroundEnd} 100%);
      z-index: 0;
    `;
    this.container.appendChild(bgGradient);
    
    const title = document.createElement('div');
    title.textContent = '五 行 炼 丹 炉';
    title.style.cssText = `
      position: absolute;
      top: 30px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 48px;
      color: ${COLOR_SCHEME.accentGold};
      text-shadow: 0 0 20px ${COLOR_SCHEME.accentGold}66, 2px 2px 4px rgba(0,0,0,0.8);
      letter-spacing: 15px;
      z-index: 100;
      font-weight: bold;
    `;
    this.container.appendChild(title);
    
    this.setupDashboard();
    this.setupLogPanel();
    this.setupAlchemizeButton();
  }

  private setupDashboard(): void {
    this.dashboard = document.createElement('div');
    this.dashboard.className = 'dashboard';
    this.dashboard.style.cssText = `
      position: absolute;
      right: 30px;
      top: 120px;
      width: 200px;
      background: rgba(44, 24, 16, 0.9);
      border: 2px solid #8b4513;
      border-radius: 15px;
      padding: 20px;
      z-index: 100;
      box-shadow: 0 0 20px rgba(255, 215, 0, 0.2);
    `;
    
    const title = document.createElement('div');
    title.textContent = '五行平衡';
    title.style.cssText = `
      text-align: center;
      color: #ffd700;
      font-size: 18px;
      margin-bottom: 15px;
      font-weight: bold;
    `;
    this.dashboard.appendChild(title);
    
    const arcsContainer = document.createElement('div');
    arcsContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 12px;
    `;
    
    ELEMENTS.forEach((element) => {
      const arcBar = this.createArcBar(element);
      arcsContainer.appendChild(arcBar);
    });
    
    this.dashboard.appendChild(arcsContainer);
    this.container.appendChild(this.dashboard);
  }

  private createArcBar(element: ElementType): HTMLElement {
    const container = document.createElement('div');
    container.className = `element-bar bar-${element}`;
    container.style.cssText = `
      display: flex;
      align-items: center;
      gap: 10px;
    `;
    
    const label = document.createElement('div');
    label.textContent = ELEMENT_NAMES[element];
    label.style.cssText = `
      color: ${ELEMENT_COLORS[element]};
      font-size: 14px;
      width: 20px;
      text-align: center;
      font-weight: bold;
    `;
    container.appendChild(label);
    
    const barBg = document.createElement('div');
    barBg.style.cssText = `
      flex: 1;
      height: 12px;
      background: rgba(0, 0, 0, 0.5);
      border-radius: 6px;
      overflow: hidden;
      border: 1px solid ${ELEMENT_COLORS[element]}44;
    `;
    
    const barFill = document.createElement('div');
    barFill.className = 'bar-fill';
    barFill.dataset.element = element;
    barFill.style.cssText = `
      height: 100%;
      width: 0%;
      background: linear-gradient(90deg, ${ELEMENT_COLORS[element]}66, ${ELEMENT_COLORS[element]});
      border-radius: 6px;
      transition: width 0.3s ease;
      box-shadow: 0 0 5px ${ELEMENT_COLORS[element]};
    `;
    barBg.appendChild(barFill);
    container.appendChild(barBg);
    
    const percent = document.createElement('div');
    percent.className = 'bar-percent';
    percent.dataset.element = element;
    percent.textContent = '0%';
    percent.style.cssText = `
      color: #d4c9a8;
      font-size: 12px;
      width: 35px;
      text-align: right;
    `;
    container.appendChild(percent);
    
    return container;
  }

  private updateDashboard(percentages: Record<ElementType, number>): void {
    ELEMENTS.forEach((element) => {
      const percent = percentages[element];
      const barFill = this.dashboard.querySelector(`.bar-fill[data-element="${element}"]`) as HTMLElement;
      const barPercent = this.dashboard.querySelector(`.bar-percent[data-element="${element}"]`) as HTMLElement;
      const barContainer = this.dashboard.querySelector(`.bar-${element}`) as HTMLElement;
      
      if (barFill) {
        barFill.style.width = `${percent}%`;
      }
      
      if (barPercent) {
        barPercent.textContent = `${Math.round(percent)}%`;
      }
      
      if (barContainer) {
        if (percent > 60) {
          barContainer.style.animation = 'elementGlow 1s ease-in-out infinite';
        } else if (percent < 20) {
          barContainer.style.filter = 'grayscale(0.8) brightness(0.5)';
          barContainer.style.animation = 'none';
        } else {
          barContainer.style.filter = 'none';
          barContainer.style.animation = 'none';
        }
      }
    });
  }

  private setupLogPanel(): void {
    const panel = document.createElement('div');
    panel.className = 'log-panel';
    panel.style.cssText = `
      position: absolute;
      right: 30px;
      bottom: 120px;
      width: 220px;
      max-height: 280px;
      background: rgba(44, 24, 16, 0.9);
      border: 2px solid #8b4513;
      border-radius: 15px;
      padding: 15px;
      z-index: 100;
      box-shadow: 0 0 20px rgba(255, 215, 0, 0.2);
      overflow-y: auto;
    `;
    
    const title = document.createElement('div');
    title.textContent = '丹药日志';
    title.style.cssText = `
      color: #ffd700;
      font-size: 16px;
      margin-bottom: 10px;
      font-weight: bold;
      text-align: center;
    `;
    panel.appendChild(title);
    
    this.logContainer = document.createElement('div');
    this.logContainer.className = 'log-container';
    this.logContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 8px;
    `;
    panel.appendChild(this.logContainer);
    
    this.container.appendChild(panel);
  }

  private addLogEntry(result: ElixirResult): void {
    this.elixirLog.unshift(result);
    
    if (this.elixirLog.length > this.maxLogSize) {
      this.elixirLog.pop();
    }
    
    this.renderLog();
  }

  private renderLog(): void {
    this.logContainer.innerHTML = '';
    
    this.elixirLog.forEach((result) => {
      const card = document.createElement('div');
      card.className = 'log-card';
      card.style.cssText = `
        background: linear-gradient(135deg, ${result.color}44, ${result.color}11);
        border: 1px solid ${result.color};
        border-radius: 8px;
        padding: 10px;
        cursor: pointer;
        transition: all 0.2s ease;
      `;
      
      card.addEventListener('mouseenter', () => {
        card.style.transform = 'scale(1.02)';
        card.style.boxShadow = `0 0 10px ${result.color}`;
      });
      
      card.addEventListener('mouseleave', () => {
        card.style.transform = 'scale(1)';
        card.style.boxShadow = 'none';
      });
      
      const name = document.createElement('div');
      name.textContent = result.name;
      name.style.cssText = `
        color: ${result.color};
        font-size: 14px;
        font-weight: bold;
        margin-bottom: 4px;
      `;
      card.appendChild(name);
      
      const effect = document.createElement('div');
      effect.textContent = result.effect;
      effect.style.cssText = `
        color: #d4c9a8;
        font-size: 11px;
        margin-bottom: 6px;
      `;
      card.appendChild(effect);
      
      const stats = document.createElement('div');
      stats.style.cssText = `
        display: flex;
        justify-content: space-between;
        font-size: 10px;
        color: #a0a0a0;
      `;
      
      const elementsText = ELEMENTS
        .filter(el => result.elementPercentages[el] > 5)
        .map(el => `${ELEMENT_NAMES[el]}${Math.round(result.elementPercentages[el])}%`)
        .join(' ');
      
      stats.textContent = elementsText;
      card.appendChild(stats);
      
      this.logContainer.appendChild(card);
    });
  }

  private setupAlchemizeButton(): void {
    this.alchemizeBtn = document.createElement('div');
    this.alchemizeBtn.className = 'alchemize-btn';
    this.alchemizeBtn.textContent = '炼 丹';
    this.alchemizeBtn.style.cssText = `
      position: absolute;
      bottom: 60px;
      left: 50%;
      transform: translateX(-50%);
      padding: 15px 50px;
      background: linear-gradient(135deg, #8b4513 0%, #6b4423 100%);
      color: #ffd700;
      font-size: 24px;
      font-weight: bold;
      border: 2px solid #ffd700;
      border-radius: 30px;
      cursor: pointer;
      z-index: 100;
      letter-spacing: 8px;
      transition: all 0.2s ease;
      box-shadow: 0 0 15px rgba(255, 215, 0, 0.3);
      user-select: none;
    `;
    
    this.alchemizeBtn.addEventListener('mouseenter', () => {
      if (!this.isAlchemizing) {
        this.alchemizeBtn.style.transform = 'translateX(-50%) scale(1.05)';
        this.alchemizeBtn.style.boxShadow = '0 0 25px rgba(255, 215, 0, 0.6)';
      }
    });
    
    this.alchemizeBtn.addEventListener('mouseleave', () => {
      if (!this.isAlchemizing) {
        this.alchemizeBtn.style.transform = 'translateX(-50%) scale(1)';
        this.alchemizeBtn.style.boxShadow = '0 0 15px rgba(255, 215, 0, 0.3)';
      }
    });
    
    this.alchemizeBtn.addEventListener('click', () => this.startAlchemy());
    
    this.container.appendChild(this.alchemizeBtn);
  }

  private setupHerbSlot(): void {
    this.herbSlot = new HerbSlot(this.container);
    this.herbSlot.onHerbChange((elements) => {
      this.alchemyEngine.updateElements(elements);
      const percentages = this.alchemyEngine.getElementPercentages();
      this.updateDashboard(percentages);
      this.alchemyEngine.renderIdleFrame();
    });
  }

  private setupAlchemyEngine(): void {
    this.alchemyEngine = new AlchemyEngine(this.fireCanvas);
    this.alchemyEngine.onComplete((result) => {
      this.onAlchemyComplete(result);
    });
    this.alchemyEngine.renderIdleFrame();
  }

  private startAlchemy(): void {
    if (this.isAlchemizing) return;
    
    const success = this.alchemyEngine.startAlchemy();
    if (!success) return;
    
    this.isAlchemizing = true;
    this.furnaceShake = 0;
    this.alchemizeBtn.textContent = '炼丹中...';
    this.alchemizeBtn.style.cursor = 'not-allowed';
    this.alchemizeBtn.style.opacity = '0.7';
  }

  private onAlchemyComplete(result: ElixirResult): void {
    this.isAlchemizing = false;
    this.alchemizeBtn.textContent = '炼 丹';
    this.alchemizeBtn.style.cursor = 'pointer';
    this.alchemizeBtn.style.opacity = '1';
    
    this.showElixirResult(result);
    this.addLogEntry(result);
    
    this.herbSlot.clearAll();
  }

  private showElixirResult(result: ElixirResult): void {
    const elixir = document.createElement('div');
    elixir.className = 'elixir-result';
    elixir.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: radial-gradient(circle at 30% 30%, white, ${result.color});
      box-shadow: 0 0 30px ${result.color}, inset -10px -10px 20px rgba(0,0,0,0.3);
      z-index: 200;
      transform: translate(-50%, -50%) scale(0);
      animation: elixirFly 0.8s ease-out forwards;
    `;
    
    const sheen = document.createElement('div');
    sheen.style.cssText = `
      position: absolute;
      top: 15%;
      left: 20%;
      width: 30%;
      height: 20%;
      background: rgba(255, 255, 255, 0.6);
      border-radius: 50%;
      transform: rotate(-30deg);
    `;
    elixir.appendChild(sheen);
    
    this.container.appendChild(elixir);
    
    confetti({
      particleCount: 300,
      spread: 100,
      origin: { y: 0.6 },
      colors: [result.color, '#ffd700', '#ffffff', result.color],
      scalar: 1.2,
      gravity: 0.6,
      ticks: 120
    });
    
    const infoPanel = document.createElement('div');
    infoPanel.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, 80px);
      text-align: center;
      z-index: 201;
      opacity: 0;
      animation: fadeIn 0.5s ease-out 0.3s forwards;
    `;
    
    const nameEl = document.createElement('div');
    nameEl.textContent = result.name;
    nameEl.style.cssText = `
      font-size: 32px;
      color: ${result.color};
      text-shadow: 0 0 20px ${result.color};
      font-weight: bold;
      margin-bottom: 10px;
    `;
    infoPanel.appendChild(nameEl);
    
    const effectEl = document.createElement('div');
    effectEl.textContent = result.effect;
    effectEl.style.cssText = `
      font-size: 16px;
      color: #d4c9a8;
      margin-bottom: 10px;
    `;
    infoPanel.appendChild(effectEl);
    
    const powerEl = document.createElement('div');
    powerEl.textContent = `药力: ${result.power}`;
    powerEl.style.cssText = `
      font-size: 14px;
      color: #ffd700;
    `;
    infoPanel.appendChild(powerEl);
    
    this.container.appendChild(infoPanel);
    
    setTimeout(() => {
      elixir.remove();
      infoPanel.remove();
    }, 3000);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.onResize());
    
    const style = document.createElement('style');
    style.textContent = `
      @keyframes elementGlow {
        0%, 100% { filter: brightness(1); }
        50% { filter: brightness(1.5) drop-shadow(0 0 5px currentColor); }
      }
      
      @keyframes elixirFly {
        0% { transform: translate(-50%, -200px) scale(0); opacity: 0; }
        60% { transform: translate(-50%, -60%) scale(1.2); opacity: 1; }
        100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
      }
      
      @keyframes fadeIn {
        from { opacity: 0; transform: translate(-50%, 100px); }
        to { opacity: 1; transform: translate(-50%, 80px); }
      }
      
      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-3px); }
        75% { transform: translateX(3px); }
      }
      
      .log-panel::-webkit-scrollbar {
        width: 6px;
      }
      
      .log-panel::-webkit-scrollbar-track {
        background: rgba(0,0,0,0.3);
        border-radius: 3px;
      }
      
      .log-panel::-webkit-scrollbar-thumb {
        background: #8b4513;
        border-radius: 3px;
      }
      
      @media (max-width: 768px) {
        .dashboard {
          right: 10px !important;
          top: 80px !important;
          width: 140px !important;
          padding: 10px !important;
        }
        
        .log-panel {
          right: 10px !important;
          bottom: 200px !important;
          width: 160px !important;
          max-height: 180px !important;
        }
        
        .alchemize-btn {
          padding: 12px 30px !important;
          font-size: 18px !important;
          bottom: 30px !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());
    
    const delta = this.clock.getDelta();
    
    this.danFurnace.update(delta);
    
    if (this.isAlchemizing) {
      this.furnaceShake += delta;
      const shakeAmount = Math.sin(this.furnaceShake * 30) * 0.05;
      this.danFurnace.group.position.x = shakeAmount;
    } else {
      this.danFurnace.group.position.x = 0;
    }
    
    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new AlchemyGame('app');
});
