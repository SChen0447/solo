import type { Emotion } from './PetRenderer';

export interface PetStats {
  hunger: number;
  happiness: number;
  energy: number;
  weight: number;
  skillPoints: number;
}

export interface EnvSettings {
  temperature: number;
  humidity: number;
}

export interface InteractionCallbacks {
  onFeed: () => void;
  onGroom: () => void;
  onTrain: (points: number) => void;
  onMeasure: () => void;
  onEnvChange: (settings: EnvSettings) => void;
  onPetClick: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface FoodItem {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  progress: number;
  active: boolean;
}

interface TrainingTarget {
  x: number;
  y: number;
  size: number;
  life: number;
  active: boolean;
}

interface Bubble {
  x: number;
  y: number;
  text: string;
  life: number;
  maxLife: number;
  active: boolean;
}

export class InteractionUI {
  private container: HTMLElement;
  private callbacks: InteractionCallbacks;
  private stats: PetStats;
  private envSettings: EnvSettings;
  private emotion: Emotion;

  private interactionPanel: HTMLElement | null = null;
  private envPanel: HTMLElement | null = null;
  private statsPanel: HTMLElement | null = null;
  private particleCanvas: HTMLCanvasElement | null = null;
  private particleCtx: CanvasRenderingContext2D | null = null;

  private particles: Particle[] = [];
  private foodItems: FoodItem[] = [];
  private trainingTargets: TrainingTarget[] = [];
  private bubbles: Bubble[] = [];

  private isGrooming: boolean = false;
  private isTraining: boolean = false;
  private lastGroomPos: { x: number; y: number } | null = null;

  private animationFrameId: number | null = null;

  constructor(container: HTMLElement, callbacks: InteractionCallbacks, initialStats: PetStats, initialEnv: EnvSettings) {
    this.container = container;
    this.callbacks = callbacks;
    this.stats = initialStats;
    this.envSettings = initialEnv;
    this.emotion = 'neutral';

    this.createUI();
    this.createParticleCanvas();
    this.startAnimationLoop();
  }

  private createUI(): void {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 10;
    `;

    this.interactionPanel = this.createInteractionPanel();
    this.envPanel = this.createEnvPanel();
    this.statsPanel = this.createStatsPanel();

    wrapper.appendChild(this.interactionPanel);
    wrapper.appendChild(this.envPanel);
    wrapper.appendChild(this.statsPanel);
    this.container.appendChild(wrapper);
  }

  private createInteractionPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'interaction-panel';
    panel.style.cssText = `
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(250, 240, 230, 0.95);
      border-radius: 12px;
      padding: 16px 20px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
      display: flex;
      gap: 12px;
      pointer-events: auto;
      transition: box-shadow 0.3s ease;
    `;

    const buttons = [
      { id: 'feed', label: '🍖 喂食', title: '喂食宠物' },
      { id: 'groom', label: '✨ 梳毛', title: '给宠物梳毛' },
      { id: 'train', label: '🎯 训练', title: '训练小游戏' },
      { id: 'measure', label: '📏 测量', title: '测量体型体重' }
    ];

    for (const btn of buttons) {
      const button = document.createElement('button');
      button.textContent = btn.label;
      button.title = btn.title;
      button.style.cssText = `
        padding: 10px 18px;
        border: none;
        border-radius: 12px;
        background: #d4a574;
        color: #3e2723;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      `;

      button.addEventListener('mouseenter', () => {
        button.style.transform = 'translateY(-2px)';
        button.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.25)';
      });

      button.addEventListener('mouseleave', () => {
        button.style.transform = 'translateY(0)';
        button.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
      });

      button.addEventListener('mousedown', () => {
        button.style.transform = 'scale(0.95)';
        setTimeout(() => {
          button.style.transform = 'scale(1.05)';
          setTimeout(() => {
            button.style.transform = 'scale(1) translateY(0)';
          }, 100);
        }, 100);
      });

      button.addEventListener('click', () => this.handleButtonClick(btn.id));

      panel.appendChild(button);
    }

    return panel;
  }

  private createEnvPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'env-panel';
    panel.style.cssText = `
      position: absolute;
      right: 20px;
      top: 50%;
      transform: translateY(-50%);
      background: rgba(250, 240, 230, 0.95);
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
      width: 180px;
      pointer-events: auto;
      transition: box-shadow 0.3s ease;
    `;

    const title = document.createElement('div');
    title.textContent = '🌡️ 环境调节';
    title.style.cssText = 'font-weight: 600; color: #5d4037; margin-bottom: 12px; font-size: 14px;';
    panel.appendChild(title);

    const tempContainer = document.createElement('div');
    tempContainer.style.cssText = 'margin-bottom: 12px;';
    
    const tempLabel = document.createElement('div');
    tempLabel.style.cssText = 'font-size: 12px; color: #6d4c41; margin-bottom: 4px; display: flex; justify-content: space-between;';
    tempLabel.innerHTML = `<span>温度</span><span id="temp-value">${this.envSettings.temperature}°C</span>`;
    tempContainer.appendChild(tempLabel);

    const tempSlider = document.createElement('input');
    tempSlider.type = 'range';
    tempSlider.min = '5';
    tempSlider.max = '40';
    tempSlider.value = String(this.envSettings.temperature);
    tempSlider.style.cssText = `
      width: 100%;
      height: 6px;
      border-radius: 3px;
      background: #d7ccc8;
      outline: none;
      -webkit-appearance: none;
    `;
    tempSlider.addEventListener('input', (e) => {
      const value = Number((e.target as HTMLInputElement).value);
      this.envSettings.temperature = value;
      tempLabel.querySelector('#temp-value')!.textContent = `${value}°C`;
      this.callbacks.onEnvChange(this.envSettings);
      this.updateBackgroundTint();
    });
    tempContainer.appendChild(tempSlider);
    panel.appendChild(tempContainer);

    const humidContainer = document.createElement('div');
    
    const humidLabel = document.createElement('div');
    humidLabel.style.cssText = 'font-size: 12px; color: #6d4c41; margin-bottom: 4px; display: flex; justify-content: space-between;';
    humidLabel.innerHTML = `<span>湿度</span><span id="humid-value">${this.envSettings.humidity}%</span>`;
    humidContainer.appendChild(humidLabel);

    const humidSlider = document.createElement('input');
    humidSlider.type = 'range';
    humidSlider.min = '0';
    humidSlider.max = '100';
    humidSlider.value = String(this.envSettings.humidity);
    humidSlider.style.cssText = `
      width: 100%;
      height: 6px;
      border-radius: 3px;
      background: #d7ccc8;
      outline: none;
      -webkit-appearance: none;
    `;
    humidSlider.addEventListener('input', (e) => {
      const value = Number((e.target as HTMLInputElement).value);
      this.envSettings.humidity = value;
      humidLabel.querySelector('#humid-value')!.textContent = `${value}%`;
      this.callbacks.onEnvChange(this.envSettings);
      this.updateBackgroundTint();
    });
    humidContainer.appendChild(humidSlider);
    panel.appendChild(humidContainer);

    return panel;
  }

  private createStatsPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'stats-panel';
    panel.style.cssText = `
      position: absolute;
      left: 20px;
      top: 50%;
      transform: translateY(-50%);
      background: rgba(250, 240, 230, 0.95);
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
      width: 180px;
      pointer-events: auto;
      transition: box-shadow 0.3s ease;
    `;

    const title = document.createElement('div');
    title.textContent = '📊 宠物状态';
    title.style.cssText = 'font-weight: 600; color: #5d4037; margin-bottom: 12px; font-size: 14px;';
    panel.appendChild(title);

    const stats = [
      { id: 'hunger', label: '饥饿度', value: this.stats.hunger, color: '#ff7043' },
      { id: 'happiness', label: '快乐值', value: this.stats.happiness, color: '#66bb6a' },
      { id: 'energy', label: '精力值', value: this.stats.energy, color: '#42a5f5' }
    ];

    for (const stat of stats) {
      const statContainer = document.createElement('div');
      statContainer.style.cssText = 'margin-bottom: 10px;';

      const statLabel = document.createElement('div');
      statLabel.style.cssText = 'font-size: 12px; color: #6d4c41; margin-bottom: 4px; display: flex; justify-content: space-between;';
      statLabel.innerHTML = `<span>${stat.label}</span><span class="stat-value">${Math.round(stat.value)}%</span>`;
      statContainer.appendChild(statLabel);

      const barBg = document.createElement('div');
      barBg.style.cssText = `
        height: 8px;
        background: #d7ccc8;
        border-radius: 4px;
        overflow: hidden;
      `;

      const barFill = document.createElement('div');
      barFill.className = `stat-bar-${stat.id}`;
      barFill.style.cssText = `
        height: 100%;
        width: ${stat.value}%;
        background: ${stat.color};
        border-radius: 4px;
        transition: width 0.3s ease;
      `;
      barBg.appendChild(barFill);
      statContainer.appendChild(barBg);

      panel.appendChild(statContainer);
    }

    const weightContainer = document.createElement('div');
    weightContainer.style.cssText = 'margin-top: 12px; padding-top: 12px; border-top: 1px solid #d7ccc8;';
    
    const weightLabel = document.createElement('div');
    weightLabel.style.cssText = 'font-size: 12px; color: #6d4c41; margin-bottom: 4px;';
    weightLabel.textContent = `体重: ${this.stats.weight.toFixed(1)} kg`;
    weightContainer.appendChild(weightLabel);

    const skillLabel = document.createElement('div');
    skillLabel.style.cssText = 'font-size: 12px; color: #6d4c41;';
    skillLabel.textContent = `技能点: ${this.stats.skillPoints}`;
    weightContainer.appendChild(skillLabel);

    panel.appendChild(weightContainer);

    return panel;
  }

  private createParticleCanvas(): void {
    this.particleCanvas = document.createElement('canvas');
    this.particleCanvas.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 15;
    `;
    this.particleCtx = this.particleCanvas.getContext('2d');
    this.container.appendChild(this.particleCanvas);
    this.resizeParticleCanvas();
    window.addEventListener('resize', () => this.resizeParticleCanvas());
  }

  private resizeParticleCanvas(): void {
    if (!this.particleCanvas) return;
    this.particleCanvas.width = window.innerWidth;
    this.particleCanvas.height = window.innerHeight;
  }

  private handleButtonClick(buttonId: string): void {
    switch (buttonId) {
      case 'feed':
        this.startFeedAnimation();
        break;
      case 'groom':
        this.startGroomMode();
        break;
      case 'train':
        this.startTrainingGame();
        break;
      case 'measure':
        this.showMeasurement();
        break;
    }
  }

  private startFeedAnimation(): void {
    const petCanvas = this.container.querySelector('canvas');
    if (!petCanvas) return;

    const rect = petCanvas.getBoundingClientRect();
    const containerRect = this.container.getBoundingClientRect();

    const targetX = rect.left - containerRect.left + rect.width / 2;
    const targetY = rect.top - containerRect.top + rect.height / 2;
    const startX = -50;
    const startY = targetY + Math.random() * 40 - 20;

    this.foodItems.push({
      x: startX,
      y: startY,
      targetX,
      targetY,
      progress: 0,
      active: true
    });

    this.callbacks.onFeed();
  }

  private startGroomMode(): void {
    if (this.isGrooming) {
      this.isGrooming = false;
      this.container.style.cursor = 'default';
      return;
    }

    this.isGrooming = true;
    this.isTraining = false;
    this.container.style.cursor = 'grab';
    this.showTemporaryMessage('梳毛模式：在宠物身上拖动鼠标');
  }

  private startTrainingGame(): void {
    if (this.isTraining) {
      this.isTraining = false;
      this.trainingTargets = [];
      return;
    }

    this.isTraining = true;
    this.isGrooming = false;
    this.showTemporaryMessage('训练模式：点击靶心获得技能点！');
    this.spawnTrainingTarget();
  }

  private spawnTrainingTarget(): void {
    if (!this.isTraining) return;

    const petCanvas = this.container.querySelector('canvas');
    if (!petCanvas) return;

    const rect = petCanvas.getBoundingClientRect();
    const containerRect = this.container.getBoundingClientRect();

    const centerX = rect.left - containerRect.left + rect.width / 2;
    const centerY = rect.top - containerRect.top + rect.height / 2;
    const radius = Math.min(rect.width, rect.height) * 0.4;

    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * radius * 0.8;

    this.trainingTargets.push({
      x: centerX + Math.cos(angle) * distance,
      y: centerY + Math.sin(angle) * distance,
      size: 30,
      life: 2000,
      active: true
    });

    const nextSpawn = 1500 + Math.random() * 2000;
    setTimeout(() => this.spawnTrainingTarget(), nextSpawn);
  }

  private showMeasurement(): void {
    this.callbacks.onMeasure();
    this.showTemporaryMessage(`体型测量中... 体重: ${this.stats.weight.toFixed(1)}kg`);
  }

  private showTemporaryMessage(message: string): void {
    this.bubbles.push({
      x: window.innerWidth / 2,
      y: 100,
      text: message,
      life: 2000,
      maxLife: 2000,
      active: true
    });
  }

  updateStats(stats: PetStats): void {
    this.stats = stats;

    const barIds = ['hunger', 'happiness', 'energy'];
    for (const id of barIds) {
      const bar = this.statsPanel?.querySelector(`.stat-bar-${id}`) as HTMLElement;
      const valueEl = this.statsPanel?.querySelectorAll('.stat-value')[barIds.indexOf(id)] as HTMLElement;
      if (bar && valueEl) {
        const value = (stats as any)[id];
        bar.style.width = `${value}%`;
        valueEl.textContent = `${Math.round(value)}%`;
      }
    }

    const weightLabel = this.statsPanel?.querySelector('div:nth-child(5) > div:first-child') as HTMLElement;
    const skillLabel = this.statsPanel?.querySelector('div:nth-child(5) > div:last-child') as HTMLElement;
    if (weightLabel) weightLabel.textContent = `体重: ${this.stats.weight.toFixed(1)} kg`;
    if (skillLabel) skillLabel.textContent = `技能点: ${this.stats.skillPoints}`;
  }

  setEmotion(emotion: Emotion): void {
    this.emotion = emotion;
    
    if (emotion === 'hungry') {
      const petCanvas = this.container.querySelector('canvas');
      if (petCanvas) {
        const rect = petCanvas.getBoundingClientRect();
        const containerRect = this.container.getBoundingClientRect();
        this.bubbles.push({
          x: rect.left - containerRect.left + rect.width / 2,
          y: rect.top - containerRect.top + rect.height * 0.2,
          text: '咕噜~',
          life: 1500,
          maxLife: 1500,
          active: true
        });
      }
    }
  }

  handleMouseMove(e: MouseEvent): void {
    if (!this.isGrooming) return;

    const rect = this.container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (this.lastGroomPos) {
      const dx = x - this.lastGroomPos.x;
      const dy = y - this.lastGroomPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 5) {
        this.spawnGroomParticles(x, y);
        this.callbacks.onGroom();
      }
    }

    this.lastGroomPos = { x, y };
  }

  handleClick(e: MouseEvent): void {
    const rect = this.container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (this.isTraining) {
      for (let i = this.trainingTargets.length - 1; i >= 0; i--) {
        const target = this.trainingTargets[i];
        if (!target.active) continue;

        const dx = x - target.x;
        const dy = y - target.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < target.size) {
          target.active = false;
          const points = Math.floor(5 + Math.random() * 10);
          this.callbacks.onTrain(points);
          this.spawnHitParticles(target.x, target.y);
          return;
        }
      }
    }

    const petCanvas = this.container.querySelector('canvas');
    if (petCanvas) {
      const canvasRect = petCanvas.getBoundingClientRect();
      const canvasX = e.clientX - canvasRect.left;
      const canvasY = e.clientY - canvasRect.top;

      if (canvasX >= 0 && canvasX <= canvasRect.width &&
          canvasY >= 0 && canvasY <= canvasRect.height) {
        this.callbacks.onPetClick();
      }
    }
  }

  private spawnGroomParticles(x: number, y: number): void {
    for (let i = 0; i < 5; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 20,
        vx: (Math.random() - 0.5) * 2,
        vy: -Math.random() * 2 - 1,
        life: 1000,
        maxLife: 1000,
        color: `hsl(${40 + Math.random() * 20}, 100%, 70%)`,
        size: 3 + Math.random() * 4
      });
    }
  }

  private spawnHitParticles(x: number, y: number): void {
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * (2 + Math.random() * 2),
        vy: Math.sin(angle) * (2 + Math.random() * 2),
        life: 800,
        maxLife: 800,
        color: '#ffd54f',
        size: 4 + Math.random() * 4
      });
    }
  }

  private updateBackgroundTint(): void {
    const app = document.getElementById('app');
    if (!app) return;

    const temp = this.envSettings.temperature;
    const tempFactor = (temp - 22) / 20;

    let topColor: string;
    let bottomColor: string;

    if (tempFactor < 0) {
      const t = Math.abs(tempFactor);
      topColor = this.lerpColor('#2a4d3a', '#1a3a5c', t);
      bottomColor = this.lerpColor('#6b9e7a', '#4a7a9a', t);
    } else {
      const t = Math.min(tempFactor, 1);
      topColor = this.lerpColor('#2a4d3a', '#5d4037', t);
      bottomColor = this.lerpColor('#6b9e7a', '#8d6e63', t);
    }

    app.style.background = `linear-gradient(180deg, ${topColor} 0%, ${bottomColor} 100%)`;
  }

  private lerpColor(color1: string, color2: string, t: number): string {
    const c1 = this.hexToRgb(color1);
    const c2 = this.hexToRgb(color2);

    const r = Math.round(c1.r + (c2.r - c1.r) * t);
    const g = Math.round(c1.g + (c2.g - c1.g) * t);
    const b = Math.round(c1.b + (c2.b - c1.b) * t);

    return `rgb(${r}, ${g}, ${b})`;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
      : { r: 0, g: 0, b: 0 };
  }

  private startAnimationLoop(): void {
    const animate = () => {
      this.update();
      this.render();
      this.animationFrameId = requestAnimationFrame(animate);
    };
    animate();
  }

  private update(): void {
    const dt = 16;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05;
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    for (let i = this.foodItems.length - 1; i >= 0; i--) {
      const food = this.foodItems[i];
      if (!food.active) continue;

      food.progress += dt / 300;
      if (food.progress >= 1) {
        food.active = false;
        this.foodItems.splice(i, 1);
        continue;
      }

      const t = food.progress;
      food.x = food.x + (food.targetX - food.x) * 0.1;
      food.y = food.y + (food.targetY - food.y) * 0.1;
    }

    for (let i = this.trainingTargets.length - 1; i >= 0; i--) {
      const target = this.trainingTargets[i];
      if (!target.active) continue;

      target.life -= dt;
      if (target.life <= 0) {
        target.active = false;
        this.trainingTargets.splice(i, 1);
      }
    }

    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const bubble = this.bubbles[i];
      if (!bubble.active) continue;

      bubble.life -= dt;
      bubble.y -= 0.3;
      if (bubble.life <= 0) {
        bubble.active = false;
        this.bubbles.splice(i, 1);
      }
    }
  }

  private render(): void {
    if (!this.particleCtx || !this.particleCanvas) return;
    const ctx = this.particleCtx;
    const w = this.particleCanvas.width;
    const h = this.particleCanvas.height;

    ctx.clearRect(0, 0, w, h);

    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const food of this.foodItems) {
      if (!food.active) continue;
      ctx.font = '24px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🍖', food.x, food.y);
    }

    for (const target of this.trainingTargets) {
      if (!target.active) continue;
      
      const alpha = Math.min(1, target.life / 500);
      const pulse = 1 + Math.sin(Date.now() / 100) * 0.1;
      const size = target.size * pulse;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#e53935';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(target.x, target.y, size, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(target.x, target.y, size * 0.6, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#e53935';
      ctx.beginPath();
      ctx.arc(target.x, target.y, size * 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const bubble of this.bubbles) {
      if (!bubble.active) continue;

      const alpha = Math.min(1, bubble.life / 500);
      
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = '14px "Segoe UI", sans-serif';
      const textWidth = ctx.measureText(bubble.text).width;
      const bubbleWidth = textWidth + 30;
      const bubbleHeight = 30;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.strokeStyle = '#d7ccc8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(bubble.x - bubbleWidth / 2, bubble.y - bubbleHeight / 2, bubbleWidth, bubbleHeight, 15);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(bubble.x - 8, bubble.y + bubbleHeight / 2);
      ctx.lineTo(bubble.x + 8, bubble.y + bubbleHeight / 2);
      ctx.lineTo(bubble.x, bubble.y + bubbleHeight / 2 + 8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#5d4037';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(bubble.text, bubble.x, bubble.y);
      ctx.restore();
    }
  }

  destroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}
