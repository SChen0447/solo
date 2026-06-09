import {
  Season,
  WeatherType,
  EffectType,
  SceneConfig,
  SceneState,
  Cloud,
  Bird,
  Particle,
  Firefly,
  Star,
  Raindrop,
  SkyColors,
  WindowSize
} from './types';

const PRESET_SCENES: SceneConfig[] = [
  {
    season: Season.SPRING,
    weather: WeatherType.SUNNY,
    skyColors: { top: '#87CEEB', bottom: '#E0F7FA' },
    groundColor: '#8BC34A',
    effects: [EffectType.CHERRY_BLOSSOMS],
    soundName: 'spring_breeze'
  },
  {
    season: Season.AUTUMN,
    weather: WeatherType.SUNNY,
    skyColors: { top: '#FFB74D', bottom: '#FFE0B2' },
    groundColor: '#D4A373',
    effects: [EffectType.MAPLE_LEAVES],
    soundName: 'autumn_leaves'
  },
  {
    season: Season.WINTER,
    weather: WeatherType.CLOUDY,
    skyColors: { top: '#78909C', bottom: '#CFD8DC' },
    groundColor: '#ECEFF1',
    effects: [EffectType.SNOWFLAKES],
    soundName: 'winter_snow'
  },
  {
    season: Season.SUMMER,
    weather: WeatherType.STARRY,
    skyColors: { top: '#0D1B2A', bottom: '#1B263B' },
    groundColor: '#2E4053',
    effects: [EffectType.FIREFLIES, EffectType.STARS],
    soundName: 'summer_night'
  },
  {
    season: Season.SPRING,
    weather: WeatherType.RAINY,
    skyColors: { top: '#546E7A', bottom: '#90A4AE' },
    groundColor: '#6B8E6B',
    effects: [EffectType.RAIN],
    soundName: 'rain_shower'
  },
  {
    season: Season.AUTUMN,
    weather: WeatherType.SUNSET,
    skyColors: { top: '#FF5722', bottom: '#FFCC80' },
    groundColor: '#8D6E63',
    effects: [],
    soundName: 'sunset_glow'
  }
];

const SEASON_ORDER: Season[] = [Season.SPRING, Season.SUMMER, Season.AUTUMN, Season.WINTER];

const DEFAULT_SCENE: SceneConfig = {
  season: Season.SPRING,
  weather: WeatherType.SUNNY,
  skyColors: { top: '#87CEEB', bottom: '#E0F7FA' },
  groundColor: '#8BC34A',
  effects: [EffectType.CHERRY_BLOSSOMS]
};

const TRANSITION_DURATION = 2000;

export class SceneManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private state: SceneState;
  private clouds: Cloud[] = [];
  private birds: Bird[] = [];
  private particles: Particle[] = [];
  private fireflies: Firefly[] = [];
  private stars: Star[] = [];
  private raindrops: Raindrop[] = [];
  private transitionStartTime = 0;
  private windowSize: WindowSize = { width: 800, height: 600 };
  private scale = 1;
  private lastBirdSpawn = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }
    this.ctx = ctx;
    this.state = {
      currentScene: { ...DEFAULT_SCENE },
      transitionProgress: 0,
      isTransitioning: false
    };
    this.initClouds();
    this.initEffects();
  }

  setWindowSize(size: WindowSize): void {
    this.windowSize = size;
    this.canvas.width = size.width;
    this.canvas.height = size.height;
    this.initClouds();
    this.initStars();
  }

  setScale(scale: number): void {
    this.scale = scale;
  }

  getCurrentScene(): SceneConfig {
    return this.state.currentScene;
  }

  getState(): SceneState {
    return this.state;
  }

  nextSeason(): void {
    if (this.state.isTransitioning) return;
    const currentIdx = SEASON_ORDER.indexOf(this.state.currentScene.season);
    const nextIdx = (currentIdx + 1) % SEASON_ORDER.length;
    const nextSeason = SEASON_ORDER[nextIdx];
    const targetScene = this.getSceneForSeason(nextSeason);
    this.startTransition(targetScene);
  }

  applyPreset(index?: number): void {
    if (this.state.isTransitioning) return;
    let scene: SceneConfig;
    if (index !== undefined && index >= 0 && index < PRESET_SCENES.length) {
      scene = PRESET_SCENES[index];
    } else {
      scene = PRESET_SCENES[Math.floor(Math.random() * PRESET_SCENES.length)];
    }
    this.startTransition(scene);
  }

  reset(): void {
    if (this.state.isTransitioning) return;
    this.startTransition({ ...DEFAULT_SCENE });
  }

  private getSceneForSeason(season: Season): SceneConfig {
    const scenes: Record<Season, SceneConfig> = {
      [Season.SPRING]: {
        season: Season.SPRING,
        weather: WeatherType.SUNNY,
        skyColors: { top: '#87CEEB', bottom: '#E0F7FA' },
        groundColor: '#8BC34A',
        effects: [EffectType.CHERRY_BLOSSOMS]
      },
      [Season.SUMMER]: {
        season: Season.SUMMER,
        weather: WeatherType.SUNNY,
        skyColors: { top: '#4FC3F7', bottom: '#B3E5FC' },
        groundColor: '#66BB6A',
        effects: [EffectType.FIREFLIES]
      },
      [Season.AUTUMN]: {
        season: Season.AUTUMN,
        weather: WeatherType.SUNNY,
        skyColors: { top: '#FFB74D', bottom: '#FFE0B2' },
        groundColor: '#D4A373',
        effects: [EffectType.MAPLE_LEAVES]
      },
      [Season.WINTER]: {
        season: Season.WINTER,
        weather: WeatherType.CLOUDY,
        skyColors: { top: '#B0BEC5', bottom: '#CFD8DC' },
        groundColor: '#ECEFF1',
        effects: [EffectType.SNOWFLAKES]
      }
    };
    return scenes[season];
  }

  private startTransition(targetScene: SceneConfig): void {
    this.state.previousScene = { ...this.state.currentScene };
    this.state.currentScene = { ...targetScene };
    this.state.isTransitioning = true;
    this.state.transitionProgress = 0;
    this.transitionStartTime = performance.now();
    this.initEffects();
  }

  private initClouds(): void {
    this.clouds = [];
    const count = 5 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      this.clouds.push(this.createCloud(true));
    }
  }

  private createCloud(randomX = false): Cloud {
    const skyHeight = this.windowSize.height * 0.6;
    return {
      x: randomX ? Math.random() * this.windowSize.width : this.windowSize.width + 50,
      y: 20 + Math.random() * (skyHeight * 0.5),
      width: 80 + Math.random() * 120,
      height: 30 + Math.random() * 40,
      opacity: 0.4 + Math.random() * 0.3,
      speed: 8 + Math.random() * 15
    };
  }

  private initBirds(): void {
    this.birds = [];
  }

  private spawnBird(): void {
    const skyHeight = this.windowSize.height * 0.6;
    const fromLeft = Math.random() > 0.5;
    this.birds.push({
      x: fromLeft ? -30 : this.windowSize.width + 30,
      y: skyHeight * 0.3 + Math.random() * (skyHeight * 0.4),
      baseY: skyHeight * 0.3 + Math.random() * (skyHeight * 0.4),
      speed: 40 + Math.random() * 20,
      amplitude: 25 + Math.random() * 10,
      phase: Math.random() * Math.PI * 2,
      direction: fromLeft ? 1 : -1,
      active: true
    });
  }

  private initEffects(): void {
    this.particles = [];
    this.fireflies = [];
    this.stars = [];
    this.raindrops = [];

    const scene = this.state.currentScene;

    if (scene.effects.includes(EffectType.CHERRY_BLOSSOMS)) {
      for (let i = 0; i < 30; i++) {
        this.particles.push(this.createCherryBlossom());
      }
    }

    if (scene.effects.includes(EffectType.MAPLE_LEAVES)) {
      for (let i = 0; i < 25; i++) {
        this.particles.push(this.createMapleLeaf());
      }
    }

    if (scene.effects.includes(EffectType.SNOWFLAKES)) {
      for (let i = 0; i < 60; i++) {
        this.particles.push(this.createSnowflake(true));
      }
    }

    if (scene.effects.includes(EffectType.FIREFLIES)) {
      for (let i = 0; i < 35; i++) {
        this.fireflies.push(this.createFirefly());
      }
    }

    if (scene.effects.includes(EffectType.STARS)) {
      this.initStars();
    }

    if (scene.effects.includes(EffectType.RAIN)) {
      for (let i = 0; i < 100; i++) {
        this.raindrops.push(this.createRaindrop(true));
      }
    }
  }

  private initStars(): void {
    this.stars = [];
    const skyHeight = this.windowSize.height * 0.6;
    for (let i = 0; i < 80; i++) {
      this.stars.push({
        x: Math.random() * this.windowSize.width,
        y: Math.random() * skyHeight,
        size: 0.5 + Math.random() * 2,
        opacity: 0.3 + Math.random() * 0.7,
        twinkleSpeed: 0.5 + Math.random() * 2,
        twinklePhase: Math.random() * Math.PI * 2
      });
    }
  }

  private createCherryBlossom(): Particle {
    return {
      x: Math.random() * this.windowSize.width,
      y: -10 - Math.random() * 100,
      vx: (Math.random() - 0.5) * 20,
      vy: 20 + Math.random() * 20,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: 0.5 + Math.random() * 0.5,
      opacity: 0.6 + Math.random() * 0.4,
      size: 4 + Math.random() * 3,
      color: `hsl(${330 + Math.random() * 20}, 80%, ${75 + Math.random() * 10}%)`,
      active: true
    };
  }

  private createMapleLeaf(): Particle {
    const hue = 15 + Math.random() * 25;
    return {
      x: Math.random() * this.windowSize.width,
      y: -10 - Math.random() * 150,
      vx: (Math.random() - 0.5) * 30,
      vy: 25 + Math.random() * 20,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 1.5,
      opacity: 0.7 + Math.random() * 0.3,
      size: 6 + Math.random() * 4,
      color: `hsl(${hue}, 70%, ${40 + Math.random() * 20}%)`,
      active: true
    };
  }

  private createSnowflake(randomY = false): Particle {
    return {
      x: Math.random() * this.windowSize.width,
      y: randomY ? Math.random() * this.windowSize.height : -10 - Math.random() * 50,
      vx: (Math.random() - 0.5) * 10,
      vy: 30 + Math.random() * 20,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.5,
      opacity: 0.5 + Math.random() * 0.3,
      size: 3 + Math.random() * 4,
      active: true
    };
  }

  private createFirefly(): Firefly {
    return {
      x: Math.random() * this.windowSize.width,
      y: this.windowSize.height * 0.4 + Math.random() * (this.windowSize.height * 0.5),
      vx: (Math.random() - 0.5) * 15,
      vy: (Math.random() - 0.5) * 15,
      rotation: 0,
      rotationSpeed: 0,
      opacity: 1,
      size: 2 + Math.random() * 2,
      brightness: 0.5 + Math.random() * 0.5,
      brightnessSpeed: 0.8 + Math.random() * 1.2,
      glowRadius: 8 + Math.random() * 6,
      life: Math.random() * 100,
      active: true
    };
  }

  private createRaindrop(randomY = false): Raindrop {
    return {
      x: Math.random() * this.windowSize.width,
      y: randomY ? Math.random() * this.windowSize.height : -10 - Math.random() * 100,
      speed: 250 + Math.random() * 150,
      length: 10 + Math.random() * 15,
      opacity: 0.3 + Math.random() * 0.4
    };
  }

  update(deltaTime: number, currentTime: number): void {
    if (this.state.isTransitioning) {
      const elapsed = currentTime - this.transitionStartTime;
      this.state.transitionProgress = Math.min(elapsed / TRANSITION_DURATION, 1);
      if (this.state.transitionProgress >= 1) {
        this.state.isTransitioning = false;
        this.state.previousScene = undefined;
      }
    }

    this.updateClouds(deltaTime);
    this.updateBirds(deltaTime, currentTime);
    this.updateParticles(deltaTime);
    this.updateFireflies(deltaTime, currentTime);
    this.updateRaindrops(deltaTime);
    this.updateStars(deltaTime, currentTime);
  }

  private updateClouds(deltaTime: number): void {
    for (let i = this.clouds.length - 1; i >= 0; i--) {
      const cloud = this.clouds[i];
      cloud.x -= cloud.speed * deltaTime;
      if (cloud.x + cloud.width < -50) {
        this.clouds[i] = this.createCloud(false);
      }
    }
  }

  private updateBirds(deltaTime: number, currentTime: number): void {
    const spawnInterval = 5000 + Math.random() * 3000;
    if (currentTime - this.lastBirdSpawn > spawnInterval) {
      this.spawnBird();
      this.lastBirdSpawn = currentTime;
    }

    for (let i = this.birds.length - 1; i >= 0; i--) {
      const bird = this.birds[i];
      if (!bird.active) continue;
      bird.x += bird.speed * bird.direction * deltaTime;
      bird.phase += deltaTime * 2;
      bird.y = bird.baseY + Math.sin(bird.phase) * bird.amplitude;
      if ((bird.direction === 1 && bird.x > this.windowSize.width + 50) ||
          (bird.direction === -1 && bird.x < -50)) {
        this.birds.splice(i, 1);
      }
    }
  }

  private updateParticles(deltaTime: number): void {
    const effects = this.state.currentScene.effects;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      if (!p.active) continue;
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      p.rotation += p.rotationSpeed * deltaTime;
      if (effects.includes(EffectType.MAPLE_LEAVES)) {
        p.vx += Math.sin(p.rotation * 2) * 5 * deltaTime;
      }
      if (p.y > this.windowSize.height + 20 || p.x < -50 || p.x > this.windowSize.width + 50) {
        if (effects.includes(EffectType.CHERRY_BLOSSOMS)) {
          this.particles[i] = this.createCherryBlossom();
        } else if (effects.includes(EffectType.MAPLE_LEAVES)) {
          this.particles[i] = this.createMapleLeaf();
        } else if (effects.includes(EffectType.SNOWFLAKES)) {
          this.particles[i] = this.createSnowflake(false);
        } else {
          p.active = false;
        }
      }
    }
  }

  private updateFireflies(deltaTime: number, currentTime: number): void {
    for (let i = this.fireflies.length - 1; i >= 0; i--) {
      const f = this.fireflies[i];
      if (!f.active) continue;
      f.x += f.vx * deltaTime;
      f.y += f.vy * deltaTime;
      f.vx += (Math.random() - 0.5) * 20 * deltaTime;
      f.vy += (Math.random() - 0.5) * 20 * deltaTime;
      f.vx = Math.max(-30, Math.min(30, f.vx));
      f.vy = Math.max(-30, Math.min(30, f.vy));
      f.brightness = 0.5 + 0.5 * Math.abs(Math.sin(currentTime * 0.001 * f.brightnessSpeed));
      const groundY = this.windowSize.height * 0.4;
      if (f.x < 0 || f.x > this.windowSize.width) f.vx *= -1;
      if (f.y < groundY || f.y > this.windowSize.height - 10) f.vy *= -1;
    }
  }

  private updateRaindrops(deltaTime: number): void {
    for (let i = this.raindrops.length - 1; i >= 0; i--) {
      const r = this.raindrops[i];
      r.y += r.speed * deltaTime;
      if (r.y > this.windowSize.height) {
        this.raindrops[i] = this.createRaindrop(false);
      }
    }
  }

  private updateStars(_deltaTime: number, currentTime: number): void {
    for (const star of this.stars) {
      star.opacity = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(currentTime * 0.001 * star.twinkleSpeed + star.twinklePhase));
    }
  }

  render(): void {
    const ctx = this.ctx;
    const { width, height } = this.windowSize;

    ctx.save();
    ctx.clearRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;
    ctx.translate(centerX, centerY);
    ctx.scale(this.scale, this.scale);
    ctx.translate(-centerX, -centerY);

    this.renderSky(ctx, width, height);
    this.renderGround(ctx, width, height);
    this.renderClouds(ctx);
    this.renderStars(ctx);
    this.renderBirds(ctx);
    this.renderRaindrops(ctx);
    this.renderParticles(ctx);
    this.renderFireflies(ctx);
    this.renderVignette(ctx, width, height);

    ctx.restore();
  }

  private interpolateColor(color1: string, color2: string, t: number): string {
    const c1 = this.hexToRgb(color1);
    const c2 = this.hexToRgb(color2);
    if (!c1 || !c2) return color1;
    const r = Math.round(c1.r + (c2.r - c1.r) * t);
    const g = Math.round(c1.g + (c2.g - c1.g) * t);
    const b = Math.round(c1.b + (c2.b - c1.b) * t);
    return `rgb(${r}, ${g}, ${b})`;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  private renderSky(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const skyHeight = height * 0.6;
    const scene = this.state.currentScene;
    let skyColors: SkyColors = scene.skyColors;

    if (this.state.isTransitioning && this.state.previousScene) {
      const t = this.state.transitionProgress;
      skyColors = {
        top: this.interpolateColor(this.state.previousScene.skyColors.top, scene.skyColors.top, t),
        bottom: this.interpolateColor(this.state.previousScene.skyColors.bottom, scene.skyColors.bottom, t)
      };
    }

    const gradient = ctx.createLinearGradient(0, 0, 0, skyHeight);
    gradient.addColorStop(0, skyColors.top);
    gradient.addColorStop(1, skyColors.bottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, skyHeight);
  }

  private renderGround(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const skyHeight = height * 0.6;
    const groundHeight = height * 0.4;
    const scene = this.state.currentScene;
    let groundColor = scene.groundColor;

    if (this.state.isTransitioning && this.state.previousScene) {
      const t = this.state.transitionProgress;
      groundColor = this.interpolateColor(this.state.previousScene.groundColor, scene.groundColor, t);
    }

    const gradient = ctx.createLinearGradient(0, skyHeight, 0, height);
    gradient.addColorStop(0, groundColor);
    gradient.addColorStop(1, this.darkenColor(groundColor, 0.85));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, skyHeight, width, groundHeight);

    this.drawHills(ctx, width, height, groundColor);
  }

  private darkenColor(color: string, factor: number): string {
    const rgb = this.hexToRgb(color);
    if (!rgb) return color;
    return `rgb(${Math.round(rgb.r * factor)}, ${Math.round(rgb.g * factor)}, ${Math.round(rgb.b * factor)})`;
  }

  private drawHills(ctx: CanvasRenderingContext2D, width: number, height: number, groundColor: string): void {
    const skyHeight = height * 0.6;
    const hillColor = this.darkenColor(groundColor, 0.9);
    ctx.fillStyle = hillColor;
    ctx.beginPath();
    ctx.moveTo(0, skyHeight + 30);
    ctx.quadraticCurveTo(width * 0.25, skyHeight - 20, width * 0.5, skyHeight + 20);
    ctx.quadraticCurveTo(width * 0.75, skyHeight + 50, width, skyHeight + 10);
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();

    const hill2Color = this.darkenColor(groundColor, 0.75);
    ctx.fillStyle = hill2Color;
    ctx.beginPath();
    ctx.moveTo(0, skyHeight + 60);
    ctx.quadraticCurveTo(width * 0.3, skyHeight + 10, width * 0.6, skyHeight + 50);
    ctx.quadraticCurveTo(width * 0.85, skyHeight + 80, width, skyHeight + 40);
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();

    this.drawTrees(ctx, width, height, groundColor);
  }

  private drawTrees(ctx: CanvasRenderingContext2D, width: number, height: number, groundColor: string): void {
    const skyHeight = height * 0.6;
    const season = this.state.currentScene.season;
    
    const treeColors: Record<Season, string> = {
      [Season.SPRING]: '#66BB6A',
      [Season.SUMMER]: '#388E3C',
      [Season.AUTUMN]: '#E65100',
      [Season.WINTER]: '#455A64'
    };

    const foliageColor = treeColors[season] || treeColors[Season.SPRING];
    const trunkColor = '#5D4037';

    const treePositions = [
      { x: width * 0.15, scale: 1.2 },
      { x: width * 0.3, scale: 0.8 },
      { x: width * 0.7, scale: 1 },
      { x: width * 0.85, scale: 0.9 }
    ];

    for (const tree of treePositions) {
      const baseY = skyHeight + 80;
      const treeHeight = 80 * tree.scale;
      const treeWidth = 40 * tree.scale;
      
      ctx.fillStyle = trunkColor;
      ctx.fillRect(tree.x - 5 * tree.scale, baseY - treeHeight * 0.3, 10 * tree.scale, treeHeight * 0.4);
      
      ctx.fillStyle = foliageColor;
      ctx.beginPath();
      ctx.arc(tree.x, baseY - treeHeight * 0.5, treeWidth, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(tree.x - treeWidth * 0.5, baseY - treeHeight * 0.35, treeWidth * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(tree.x + treeWidth * 0.5, baseY - treeHeight * 0.35, treeWidth * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private renderClouds(ctx: CanvasRenderingContext2D): void {
    for (const cloud of this.clouds) {
      this.drawCloud(ctx, cloud);
    }
  }

  private drawCloud(ctx: CanvasRenderingContext2D, cloud: Cloud): void {
    ctx.save();
    ctx.globalAlpha = cloud.opacity;
    ctx.fillStyle = '#FFFFFF';
    
    const x = cloud.x;
    const y = cloud.y;
    const w = cloud.width;
    const h = cloud.height;

    ctx.beginPath();
    ctx.ellipse(x, y, w * 0.5, h * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x - w * 0.3, y + h * 0.1, w * 0.35, h * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + w * 0.3, y + h * 0.1, w * 0.35, h * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x, y + h * 0.2, w * 0.4, h * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }

  private renderBirds(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#2C3E50';
    for (const bird of this.birds) {
      if (!bird.active) continue;
      this.drawBird(ctx, bird);
    }
  }

  private drawBird(ctx: CanvasRenderingContext2D, bird: Bird): void {
    ctx.save();
    ctx.translate(bird.x, bird.y);
    if (bird.direction === -1) ctx.scale(-1, 1);
    
    const wingFlap = Math.sin(bird.phase * 3) * 0.3;
    const size = 8;
    
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-size, -size * (0.8 + wingFlap));
    ctx.lineTo(-size * 0.5, 0);
    ctx.closePath();
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(size, -size * (0.8 + wingFlap));
    ctx.lineTo(size * 0.5, 0);
    ctx.closePath();
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(-size * 0.3, 0);
    ctx.lineTo(size * 0.3, 0);
    ctx.lineTo(0, size * 0.3);
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
  }

  private renderParticles(ctx: CanvasRenderingContext2D): void {
    const effects = this.state.currentScene.effects;
    for (const p of this.particles) {
      if (!p.active) continue;
      if (effects.includes(EffectType.CHERRY_BLOSSOMS)) {
        this.drawCherryBlossom(ctx, p);
      } else if (effects.includes(EffectType.MAPLE_LEAVES)) {
        this.drawMapleLeaf(ctx, p);
      } else if (effects.includes(EffectType.SNOWFLAKES)) {
        this.drawSnowflake(ctx, p);
      }
    }
  }

  private drawCherryBlossom(ctx: CanvasRenderingContext2D, p: Particle): void {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.globalAlpha = p.opacity;
    ctx.fillStyle = p.color || '#FFB7C5';
    
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
      const petalX = Math.cos(angle) * p.size * 0.5;
      const petalY = Math.sin(angle) * p.size * 0.5;
      ctx.beginPath();
      ctx.ellipse(petalX, petalY, p.size * 0.4, p.size * 0.25, angle, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.fillStyle = '#FFE082';
    ctx.beginPath();
    ctx.arc(0, 0, p.size * 0.15, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }

  private drawMapleLeaf(ctx: CanvasRenderingContext2D, p: Particle): void {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.globalAlpha = p.opacity;
    ctx.fillStyle = p.color || '#E65100';
    
    const s = p.size;
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(-s * 0.8, -s * 0.3);
    ctx.lineTo(-s * 0.5, -s * 0.5);
    ctx.lineTo(-s, s * 0.2);
    ctx.lineTo(-s * 0.4, 0);
    ctx.lineTo(-s * 0.5, s);
    ctx.lineTo(0, s * 0.5);
    ctx.lineTo(s * 0.5, s);
    ctx.lineTo(s * 0.4, 0);
    ctx.lineTo(s, s * 0.2);
    ctx.lineTo(s * 0.5, -s * 0.5);
    ctx.lineTo(s * 0.8, -s * 0.3);
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
  }

  private drawSnowflake(ctx: CanvasRenderingContext2D, p: Particle): void {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.globalAlpha = p.opacity;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1;
    
    const s = p.size;
    for (let i = 0; i < 6; i++) {
      ctx.rotate(Math.PI / 3);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, s);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, s * 0.6);
      ctx.lineTo(-s * 0.25, s * 0.8);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, s * 0.6);
      ctx.lineTo(s * 0.25, s * 0.8);
      ctx.stroke();
    }
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.arc(0, 0, p.size * 0.3, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }

  private renderFireflies(ctx: CanvasRenderingContext2D): void {
    for (const f of this.fireflies) {
      if (!f.active) continue;
      this.drawFirefly(ctx, f);
    }
  }

  private drawFirefly(ctx: CanvasRenderingContext2D, f: Firefly): void {
    ctx.save();
    
    const glowIntensity = f.brightness;
    const gradient = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.glowRadius);
    gradient.addColorStop(0, `rgba(200, 255, 100, ${0.8 * glowIntensity})`);
    gradient.addColorStop(0.3, `rgba(150, 255, 50, ${0.4 * glowIntensity})`);
    gradient.addColorStop(1, 'rgba(100, 200, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.glowRadius, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = `rgba(220, 255, 150, ${f.brightness})`;
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.size * 0.5, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }

  private renderStars(ctx: CanvasRenderingContext2D): void {
    for (const star of this.stars) {
      ctx.save();
      ctx.globalAlpha = star.opacity;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private renderRaindrops(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = 'rgba(200, 220, 255, 0.5)';
    ctx.lineWidth = 1;
    for (const r of this.raindrops) {
      ctx.globalAlpha = r.opacity;
      ctx.beginPath();
      ctx.moveTo(r.x, r.y);
      ctx.lineTo(r.x - 1, r.y + r.length);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  private renderVignette(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const vignetteStrength = 0.1 + (this.scale - 1) * 0.2;
    const gradient = ctx.createRadialGradient(
      width / 2, height / 2, Math.min(width, height) * 0.3,
      width / 2, height / 2, Math.max(width, height) * 0.7
    );
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, `rgba(0, 0, 0, ${Math.min(0.3, vignetteStrength)})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }
}
