import type { TimeOfDay, WindDirection } from './controls';

interface ColorStop {
  color: string;
  position: number;
}

interface TimeColors {
  skyTop: string;
  skyBottom: string;
  duneTop: string;
  duneBottom: string;
  shadowAngle: number;
  waterColor: string;
}

interface PlantInfo {
  id: number;
  x: number;
  y: number;
  leafCount: number;
  droughtLevel: number;
  localName: string;
  leafAngles: number[];
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  speed: number;
}

interface Sparkle {
  x: number;
  y: number;
  alpha: number;
  speed: number;
}

const TIME_COLORS: Record<TimeOfDay, TimeColors> = {
  dawn: {
    skyTop: '#ff9966',
    skyBottom: '#ffcc99',
    duneTop: '#e8b84b',
    duneBottom: '#c2a878',
    shadowAngle: -30,
    waterColor: '#87CEEB'
  },
  morning: {
    skyTop: '#87CEEB',
    skyBottom: '#b8e0f0',
    duneTop: '#f0c860',
    duneBottom: '#d4b078',
    shadowAngle: -15,
    waterColor: '#7EC8E3'
  },
  noon: {
    skyTop: '#87CEEB',
    skyBottom: '#e0f0ff',
    duneTop: '#f4d068',
    duneBottom: '#c8a878',
    shadowAngle: 0,
    waterColor: '#5BC0DE'
  },
  dusk: {
    skyTop: '#f4a460',
    skyBottom: '#e87850',
    duneTop: '#d89038',
    duneBottom: '#a87048',
    shadowAngle: 20,
    waterColor: '#4a90a4'
  },
  night: {
    skyTop: '#1a1a3a',
    skyBottom: '#2a2a4a',
    duneTop: '#4a3a2a',
    duneBottom: '#2a1a0a',
    shadowAngle: 45,
    waterColor: '#1a3a4a'
  }
};

const PLANT_NAMES = ['骆驼刺', '沙漠锦鸡儿', '白刺', '沙拐枣', '红柳'];

export class DesertScene {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private plantContainer: HTMLElement;
  private tooltipContainer: HTMLElement;
  private width: number = 0;
  private height: number = 0;
  private dpr: number = 1;

  private timeOfDay: TimeOfDay = 'noon';
  private windDirection: WindDirection = 'calm';
  private windSpeed: number = 0;

  private targetSkyTop: string = TIME_COLORS.noon.skyTop;
  private targetSkyBottom: string = TIME_COLORS.noon.skyBottom;
  private currentSkyTop: string = TIME_COLORS.noon.skyTop;
  private currentSkyBottom: string = TIME_COLORS.noon.skyBottom;

  private mouseX: number = -1000;
  private mouseY: number = -1000;
  private mouseActive: boolean = false;
  private mouseInfluence: Map<string, number> = new Map();

  private duneGrid: { x: number; y: number; baseY: number; noise: number }[][] = [];
  private gridCols: number = 80;
  private gridRows: number = 40;

  private plants: PlantInfo[] = [];
  private plantElements: Map<number, SVGElement> = new Map();

  private ripples: Ripple[] = [];
  private sparkles: Sparkle[] = [];
  private foamParticles: { x: number; y: number; offset: number; speed: number }[] = [];

  private animationId: number | null = null;
  private lastTime: number = 0;
  private frameCount: number = 0;

  private oasisX: number = 0;
  private oasisY: number = 0;
  private oasisWidth: number = 0;
  private oasisHeight: number = 0;

  constructor(canvasId: string, plantContainerId: string, tooltipContainerId: string) {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    const plantContainer = document.getElementById(plantContainerId);
    const tooltipContainer = document.getElementById(tooltipContainerId);
    if (!canvas || !plantContainer || !tooltipContainer) {
      throw new Error('Required elements not found');
    }
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.plantContainer = plantContainer;
    this.tooltipContainer = tooltipContainer;
    this.dpr = window.devicePixelRatio || 1;
    this.init();
  }

  private init(): void {
    this.resize();
    this.setupDuneGrid();
    this.setupOasis();
    this.setupPlants();
    this.setupFoamParticles();
    this.setupEventListeners();
    this.animate(0);
    window.addEventListener('resize', () => this.resize());
  }

  private resize(): void {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    this.ctx.scale(this.dpr, this.dpr);
    this.setupDuneGrid();
    this.setupOasis();
    this.updatePlantPositions();
  }

  private setupDuneGrid(): void {
    this.duneGrid = [];
    const cellWidth = this.width / (this.gridCols - 1);
    const cellHeight = (this.height * 0.7) / (this.gridRows - 1);

    for (let row = 0; row < this.gridRows; row++) {
      const rowData = [];
      for (let col = 0; col < this.gridCols; col++) {
        const x = col * cellWidth;
        const baseY = this.height * 0.35 + row * cellHeight;
        const waveOffset = Math.sin(col * 0.15 + row * 0.1) * 12 +
                          Math.sin(col * 0.08 - row * 0.05) * 8;
        const noise = (Math.random() - 0.5) * 4;
        rowData.push({
          x,
          y: baseY + waveOffset + noise,
          baseY: baseY + waveOffset,
          noise
        });
      }
      this.duneGrid.push(rowData);
    }
  }

  private setupOasis(): void {
    this.oasisX = this.width * 0.4;
    this.oasisY = this.height * 0.65;
    this.oasisWidth = Math.min(300, this.width * 0.25);
    this.oasisHeight = Math.min(120, this.height * 0.18);
  }

  private setupPlants(): void {
    this.plants = [];
    this.plantElements.clear();
    this.plantContainer.innerHTML = '';

    const plantCount = 4 + Math.floor(Math.random() * 2);
    const angles = [0.3, 0.7, 1.2, 1.8, 2.3, 2.8];
    const distances = [this.oasisWidth * 0.6, this.oasisWidth * 0.8, this.oasisWidth * 0.7];

    for (let i = 0; i < plantCount; i++) {
      const angle = angles[i % angles.length] + (Math.random() - 0.5) * 0.3;
      const dist = distances[i % distances.length] + (Math.random() - 0.5) * 30;
      const cx = this.oasisX + this.oasisWidth / 2 + Math.cos(angle) * dist;
      const cy = this.oasisY + this.oasisHeight / 2 + Math.sin(angle) * dist * 0.4;

      const leafCount = 3 + Math.floor(Math.random() * 3);
      const leafAngles: number[] = [];
      for (let l = 0; l < leafCount; l++) {
        leafAngles.push((Math.random() - 0.5) * 0.5);
      }

      const plant: PlantInfo = {
        id: i,
        x: cx,
        y: cy,
        leafCount,
        droughtLevel: 3 + Math.floor(Math.random() * 5),
        localName: PLANT_NAMES[i % PLANT_NAMES.length],
        leafAngles
      };
      this.plants.push(plant);
      this.createPlantSVG(plant);
    }
  }

  private createPlantSVG(plant: PlantInfo): void {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'plant-svg');
    svg.setAttribute('data-plant-id', plant.id.toString());
    const plantHeight = 50 + plant.leafCount * 8;
    const plantWidth = 40 + plant.leafCount * 6;
    svg.setAttribute('width', plantWidth.toString());
    svg.setAttribute('height', plantHeight.toString());
    svg.setAttribute('viewBox', `0 0 ${plantWidth} ${plantHeight}`);
    svg.style.left = (plant.x - plantWidth / 2) + 'px';
    svg.style.top = (plant.y - plantHeight) + 'px';

    const stem = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    stem.setAttribute('x1', (plantWidth / 2).toString());
    stem.setAttribute('y1', plantHeight.toString());
    stem.setAttribute('x2', (plantWidth / 2).toString());
    stem.setAttribute('y2', (plantHeight * 0.4).toString());
    stem.setAttribute('stroke', '#5d6b3e');
    stem.setAttribute('stroke-width', '3');
    svg.appendChild(stem);

    for (let i = 0; i < plant.leafCount; i++) {
      const leaf = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      leaf.setAttribute('class', 'leaf');
      leaf.setAttribute('data-leaf-index', i.toString());

      const baseAngle = (i - (plant.leafCount - 1) / 2) * 0.4;
      const leafLength = 25 + Math.random() * 15;
      const leafWidth = 4 + Math.random() * 3;
      const startX = plantWidth / 2;
      const startY = plantHeight - 10 - i * 8;

      const endX = startX + Math.sin(baseAngle) * leafLength;
      const endY = startY - Math.cos(baseAngle) * leafLength;
      const ctrlX = startX + Math.sin(baseAngle) * leafLength * 0.5;
      const ctrlY = startY - Math.cos(baseAngle) * leafLength * 0.5 - leafWidth;

      const d = `M ${startX} ${startY} Q ${ctrlX} ${ctrlY} ${endX} ${endY}`;
      leaf.setAttribute('d', d);
      leaf.setAttribute('fill', 'none');
      leaf.setAttribute('stroke', `url(#leafGradient${plant.id}_${i})`);
      leaf.setAttribute('stroke-width', leafWidth.toString());
      leaf.setAttribute('stroke-linecap', 'round');

      const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
      gradient.setAttribute('id', `leafGradient${plant.id}_${i}`);
      gradient.setAttribute('x1', '0%');
      gradient.setAttribute('y1', '100%');
      gradient.setAttribute('x2', '0%');
      gradient.setAttribute('y2', '0%');

      const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
      stop1.setAttribute('offset', '0%');
      stop1.setAttribute('stop-color', '#2d4a1e');

      const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
      stop2.setAttribute('offset', '100%');
      stop2.setAttribute('stop-color', '#7a8c5a');

      gradient.appendChild(stop1);
      gradient.appendChild(stop2);
      defs.appendChild(gradient);
      svg.insertBefore(defs, svg.firstChild);

      svg.appendChild(leaf);
    }

    svg.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showPlantTooltip(plant);
    });

    this.plantContainer.appendChild(svg);
    this.plantElements.set(plant.id, svg);
  }

  private updatePlantPositions(): void {
    this.plants.forEach((plant, i) => {
      const svg = this.plantElements.get(plant.id);
      if (svg) {
        const plantHeight = 50 + plant.leafCount * 8;
        const plantWidth = 40 + plant.leafCount * 6;
        svg.style.left = (plant.x - plantWidth / 2) + 'px';
        svg.style.top = (plant.y - plantHeight) + 'px';
      }
    });
  }

  private setupFoamParticles(): void {
    this.foamParticles = [];
    for (let i = 0; i < 40; i++) {
      this.foamParticles.push({
        x: Math.random(),
        y: Math.random(),
        offset: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 1
      });
    }
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;
      this.mouseActive = true;
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.mouseActive = false;
      this.mouseX = -1000;
      this.mouseY = -1000;
    });
  }

  setTimeOfDay(time: TimeOfDay): void {
    this.timeOfDay = time;
    const colors = TIME_COLORS[time];
    this.targetSkyTop = colors.skyTop;
    this.targetSkyBottom = colors.skyBottom;
    this.ripples = [];
  }

  setWind(direction: WindDirection, speed: number): void {
    this.windDirection = direction;
    this.windSpeed = speed;
  }

  private lerpColor(color1: string, color2: string, t: number): string {
    const c1 = this.parseColor(color1);
    const c2 = this.parseColor(color2);
    const r = Math.round(c1.r + (c2.r - c1.r) * t);
    const g = Math.round(c1.g + (c2.g - c1.g) * t);
    const b = Math.round(c1.b + (c2.b - c1.b) * t);
    return `rgb(${r}, ${g}, ${b})`;
  }

  private parseColor(color: string): { r: number; g: number; b: number } {
    const hexMatch = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
    if (hexMatch) {
      return {
        r: parseInt(hexMatch[1], 16),
        g: parseInt(hexMatch[2], 16),
        b: parseInt(hexMatch[3], 16)
      };
    }
    const rgbMatch = /^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i.exec(color);
    if (rgbMatch) {
      return {
        r: parseInt(rgbMatch[1], 10),
        g: parseInt(rgbMatch[2], 10),
        b: parseInt(rgbMatch[3], 10)
      };
    }
    return { r: 0, g: 0, b: 0 };
  }

  private easeOut(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private showPlantTooltip(plant: PlantInfo): void {
    const existing = this.tooltipContainer.querySelector(`[data-plant-id="${plant.id}"]`);
    if (existing) {
      existing.remove();
    }

    const tooltip = document.createElement('div');
    tooltip.className = 'plant-tooltip';
    tooltip.setAttribute('data-plant-id', plant.id.toString());
    tooltip.innerHTML = `
      <div><strong>${plant.localName}</strong></div>
      <div>耐旱等级: ${'★'.repeat(plant.droughtLevel)}${'☆'.repeat(8 - plant.droughtLevel)}</div>
    `;

    tooltip.style.left = plant.x + 'px';
    tooltip.style.top = (plant.y - 60) + 'px';

    this.tooltipContainer.appendChild(tooltip);

    requestAnimationFrame(() => {
      tooltip.classList.add('visible');
    });

    setTimeout(() => {
      tooltip.classList.remove('visible');
      setTimeout(() => {
        if (tooltip.parentNode) {
          tooltip.parentNode.removeChild(tooltip);
        }
      }, 500);
    }, 2000);
  }

  private updatePlantAnimation(time: number): void {
    this.plants.forEach((plant) => {
      const svg = this.plantElements.get(plant.id);
      if (!svg) return;

      const leaves = svg.querySelectorAll('.leaf');
      leaves.forEach((leaf, index) => {
        const baseAngle = plant.leafAngles[index] || 0;
        const windOffset = Math.sin(time * 0.003 * this.windSpeed + index + plant.id) *
                          this.windSpeed * 15 * (1 + index * 0.2);
        (leaf as SVGElement).style.transform = `rotate(${baseAngle + windOffset}deg)`;
      });
    });
  }

  private addRipple(): void {
    if (this.ripples.length > 15) return;

    let x = this.oasisX + Math.random() * this.oasisWidth;
    let y = this.oasisY + Math.random() * this.oasisHeight;
    let speed = 1;

    switch (this.windDirection) {
      case 'E':
        x = this.oasisX + this.oasisWidth * 0.9;
        speed = 1.5;
        break;
      case 'W':
        x = this.oasisX + this.oasisWidth * 0.1;
        speed = 1.5;
        break;
      case 'N':
        y = this.oasisY + this.oasisHeight * 0.1;
        speed = 1.2;
        break;
      case 'S':
        y = this.oasisY + this.oasisHeight * 0.9;
        speed = 1.2;
        break;
      default:
        speed = 0.8;
        break;
    }

    this.ripples.push({
      x,
      y,
      radius: 0,
      maxRadius: 40 + Math.random() * 60,
      alpha: 0.4,
      speed
    });
  }

  private updateRipples(deltaTime: number): void {
    this.ripples = this.ripples.filter((ripple) => {
      ripple.radius += ripple.speed * deltaTime * 0.06;
      ripple.alpha = 0.4 * (1 - ripple.radius / ripple.maxRadius);
      return ripple.radius < ripple.maxRadius;
    });

    const spawnRate = this.windDirection === 'calm' ? 0.01 : 0.08 * this.windSpeed;
    if (Math.random() < spawnRate) {
      this.addRipple();
    }
  }

  private updateSparkles(deltaTime: number): void {
    this.sparkles = this.sparkles.filter((sparkle) => {
      sparkle.alpha -= sparkle.speed * deltaTime * 0.003;
      return sparkle.alpha > 0;
    });

    if (this.mouseActive && this.sparkles.length < 20 && Math.random() < 0.3) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 60;
      this.sparkles.push({
        x: this.mouseX + Math.cos(angle) * dist,
        y: this.mouseY + Math.sin(angle) * dist,
        alpha: 0.3 + Math.random() * 0.2,
        speed: 0.5 + Math.random() * 1
      });
    }
  }

  private drawSky(ctx: CanvasRenderingContext2D, deltaTime: number): void {
    const colorT = Math.min(1, deltaTime / 500);
    this.currentSkyTop = this.lerpColor(this.currentSkyTop, this.targetSkyTop, colorT);
    this.currentSkyBottom = this.lerpColor(this.currentSkyBottom, this.targetSkyBottom, colorT);

    const gradient = ctx.createLinearGradient(0, 0, 0, this.height * 0.4);
    gradient.addColorStop(0, this.currentSkyTop);
    gradient.addColorStop(1, this.currentSkyBottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height * 0.4);

    if (this.timeOfDay === 'night') {
      const time = performance.now();
      for (let i = 0; i < 50; i++) {
        const sx = (i * 137.5) % this.width;
        const sy = (i * 73.3) % (this.height * 0.35);
        const twinkle = Math.sin(time * 0.002 + i) * 0.3 + 0.7;
        ctx.fillStyle = `rgba(255, 255, 255, ${twinkle * 0.8})`;
        ctx.beginPath();
        ctx.arc(sx, sy, 1 + (i % 3) * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private drawDunes(ctx: CanvasRenderingContext2D, time: number): void {
    const colors = TIME_COLORS[this.timeOfDay];
    const cellWidth = this.width / (this.gridCols - 1);

    for (let row = 0; row < this.gridRows - 1; row++) {
      for (let col = 0; col < this.gridCols - 1; col++) {
        const p1 = this.duneGrid[row][col];
        const p2 = this.duneGrid[row][col + 1];
        const p3 = this.duneGrid[row + 1][col + 1];
        const p4 = this.duneGrid[row + 1][col];

        const mouseDist1 = Math.hypot(p1.x - this.mouseX, p1.y - this.mouseY);
        const mouseDist2 = Math.hypot(p2.x - this.mouseX, p2.y - this.mouseY);
        const mouseDist3 = Math.hypot(p3.x - this.mouseX, p3.y - this.mouseY);
        const mouseDist4 = Math.hypot(p4.x - this.mouseX, p4.y - this.mouseY);

        const influence1 = mouseDist1 < 80 ? this.easeOut(1 - mouseDist1 / 80) : 0;
        const influence2 = mouseDist2 < 80 ? this.easeOut(1 - mouseDist2 / 80) : 0;
        const influence3 = mouseDist3 < 80 ? this.easeOut(1 - mouseDist3 / 80) : 0;
        const influence4 = mouseDist4 < 80 ? this.easeOut(1 - mouseDist4 / 80) : 0;

        const key1 = `${row}_${col}`;
        const key2 = `${row}_${col + 1}`;
        const key3 = `${row + 1}_${col + 1}`;
        const key4 = `${row + 1}_${col}`;

        const currentInf1 = this.mouseInfluence.get(key1) || 0;
        const currentInf2 = this.mouseInfluence.get(key2) || 0;
        const currentInf3 = this.mouseInfluence.get(key3) || 0;
        const currentInf4 = this.mouseInfluence.get(key4) || 0;

        const targetInf1 = this.mouseActive ? influence1 : 0;
        const targetInf2 = this.mouseActive ? influence2 : 0;
        const targetInf3 = this.mouseActive ? influence3 : 0;
        const targetInf4 = this.mouseActive ? influence4 : 0;

        const newInf1 = currentInf1 + (targetInf1 - currentInf1) * 0.08;
        const newInf2 = currentInf2 + (targetInf2 - currentInf2) * 0.08;
        const newInf3 = currentInf3 + (targetInf3 - currentInf3) * 0.08;
        const newInf4 = currentInf4 + (targetInf4 - currentInf4) * 0.08;

        this.mouseInfluence.set(key1, newInf1);
        this.mouseInfluence.set(key2, newInf2);
        this.mouseInfluence.set(key3, newInf3);
        this.mouseInfluence.set(key4, newInf4);

        const windWave = Math.sin(time * 0.001 + col * 0.05 + row * 0.03) * 2 * this.windSpeed;
        const mouseWave1 = newInf1 * (3 + Math.random() * 5);
        const mouseWave2 = newInf2 * (3 + Math.random() * 5);
        const mouseWave3 = newInf3 * (3 + Math.random() * 5);
        const mouseWave4 = newInf4 * (3 + Math.random() * 5);

        const y1 = p1.baseY + p1.noise + windWave - mouseWave1;
        const y2 = p2.baseY + p2.noise + windWave - mouseWave2;
        const y3 = p3.baseY + p3.noise + windWave - mouseWave3;
        const y4 = p4.baseY + p4.noise + windWave - mouseWave4;

        p1.y = y1;
        p2.y = y2;
        p3.y = y3;
        p4.y = y4;

        const avgY = (y1 + y2 + y3 + y4) / 4;
        const shadeT = (avgY - this.height * 0.35) / (this.height * 0.45);
        const duneColor = this.lerpColor(colors.duneTop, colors.duneBottom, Math.min(1, Math.max(0, shadeT)));

        ctx.fillStyle = duneColor;
        ctx.strokeStyle = duneColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(p1.x, y1);
        ctx.lineTo(p2.x, y2);
        ctx.lineTo(p3.x, y3);
        ctx.lineTo(p4.x, y4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        const grainAlpha = 0.05 + (newInf1 + newInf2 + newInf3 + newInf4) * 0.1;
        if (Math.random() < 0.3) {
          ctx.fillStyle = `rgba(255, 255, 255, ${grainAlpha})`;
          const gx = p1.x + Math.random() * cellWidth;
          const gy = y1 + Math.random() * (y3 - y1);
          ctx.fillRect(gx, gy, 1, 1);
        }
      }
    }
  }

  private drawOasis(ctx: CanvasRenderingContext2D, time: number): void {
    const colors = TIME_COLORS[this.timeOfDay];
    const ox = this.oasisX;
    const oy = this.oasisY;
    const ow = this.oasisWidth;
    const oh = this.oasisHeight;

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(ox + ow / 2, oy + oh / 2, ow / 2, oh / 2, 0, 0, Math.PI * 2);
    ctx.clip();

    const waterGradient = ctx.createRadialGradient(
      ox + ow / 2, oy + oh / 2, 0,
      ox + ow / 2, oy + oh / 2, ow / 2
    );
    waterGradient.addColorStop(0, this.lerpColor(colors.waterColor, '#ffffff', 0.2));
    waterGradient.addColorStop(0.7, colors.waterColor);
    waterGradient.addColorStop(1, this.lerpColor(colors.waterColor, '#000000', 0.3));
    ctx.fillStyle = waterGradient;
    ctx.fillRect(ox, oy, ow, oh);

    const reflectionAlpha = 0.3 + Math.sin(time * 0.002) * 0.1;
    ctx.globalAlpha = reflectionAlpha;

    const reflectGradient = ctx.createLinearGradient(ox, oy, ox, oy + oh);
    reflectGradient.addColorStop(0, this.currentSkyBottom);
    reflectGradient.addColorStop(1, this.currentSkyTop);
    ctx.fillStyle = reflectGradient;
    ctx.fillRect(ox, oy, ow, oh);

    ctx.globalAlpha = 1;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    this.ripples.forEach((ripple) => {
      ctx.globalAlpha = ripple.alpha;
      ctx.beginPath();

      let spacing = 12;
      switch (this.windDirection) {
        case 'E':
        case 'W':
          spacing = 10 + Math.random() * 5;
          break;
        case 'S':
          spacing = 15 + Math.random() * 5;
          break;
      }

      ctx.ellipse(
        ripple.x,
        ripple.y,
        ripple.radius,
        ripple.radius * (this.windDirection === 'S' ? 0.5 : 0.6),
        0, 0, Math.PI * 2
      );
      ctx.stroke();
    });
    ctx.globalAlpha = 1;

    ctx.restore();

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.setLineDash([2, 4]);

    this.foamParticles.forEach((particle, i) => {
      const waveY = Math.sin(time * 0.003 * particle.speed + particle.offset) * 2;
      const px = ox + particle.x * ow;
      const py = oy + particle.y * oh + waveY;

      const distToEdge = Math.hypot(
        (px - ox - ow / 2) / (ow / 2),
        (py - oy - oh / 2) / (oh / 2)
      );
      if (Math.abs(distToEdge - 1) < 0.15) {
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(px, py, 1, 0, Math.PI * 2);
        ctx.stroke();
      }
    });
    ctx.restore();
  }

  private drawSparkles(ctx: CanvasRenderingContext2D): void {
    this.sparkles.forEach((sparkle) => {
      ctx.fillStyle = `rgba(255, 255, 255, ${sparkle.alpha})`;
      ctx.beginPath();
      ctx.arc(sparkle.x, sparkle.y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  private drawShadowOverlay(ctx: CanvasRenderingContext2D): void {
    if (this.timeOfDay === 'noon' || this.timeOfDay === 'night') return;

    const colors = TIME_COLORS[this.timeOfDay];
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    const shadowGradient = ctx.createLinearGradient(0, 0, this.width, 0);
    const shadowAlpha = this.timeOfDay === 'dawn' || this.timeOfDay === 'dusk' ? 0.15 : 0.08;
    shadowGradient.addColorStop(0, `rgba(0, 0, 0, ${shadowAlpha})`);
    shadowGradient.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
    shadowGradient.addColorStop(1, `rgba(0, 0, 0, ${shadowAlpha * 0.5})`);
    ctx.fillStyle = shadowGradient;
    ctx.fillRect(0, this.height * 0.35, this.width, this.height * 0.65);
    ctx.restore();
  }

  private animate = (time: number): void => {
    const oldLastTime = this.lastTime;
    const deltaTime = time - oldLastTime;
    this.lastTime = time;
    this.frameCount++;

    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    this.drawSky(ctx, deltaTime);
    this.drawDunes(ctx, time);
    this.drawOasis(ctx, time);
    this.drawSparkles(ctx);
    this.drawShadowOverlay(ctx);

    this.updateRipples(deltaTime);
    this.updateSparkles(deltaTime);
    this.updatePlantAnimation(time);

    this.animationId = requestAnimationFrame(this.animate);
  };

  getFPS(): number {
    return this.frameCount / ((this.lastTime || 1) / 1000);
  }

  destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
