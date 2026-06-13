import { Renderer, PaperPuppet, PuppetType, createPuppet } from './renderer';
import gsap from 'gsap';

export interface ScriptConfig {
  id: string;
  title: string;
  description: string;
  puppets: Array<{
    id: string;
    type: PuppetType;
    color: string;
    startX: number;
    startY: number;
    scale?: number;
  }>;
}

const SCRIPTS: Record<string, ScriptConfig> = {
  baishezhuan: {
    id: 'baishezhuan',
    title: '白蛇传·断桥',
    description: '断桥相遇，白素贞与许仙的千古情缘',
    puppets: [
      { id: 'baisuzhen', type: 'female', color: '#c41e3a', startX: 0.3, startY: 0.55 },
      { id: 'xiaoqing', type: 'female', color: '#228b22', startX: 0.2, startY: 0.6 },
      { id: 'xuxian', type: 'scholar', color: '#4169e1', startX: 0.7, startY: 0.55 },
      { id: 'butterfly1', type: 'butterfly1', color: '#c41e3a', startX: 0.5, startY: 0.25, scale: 0.5 },
      { id: 'butterfly2', type: 'butterfly2', color: '#4169e1', startX: 0.55, startY: 0.3, scale: 0.45 }
    ]
  },
  sanda: {
    id: 'sanda',
    title: '三打白骨精',
    description: '孙悟空火眼金睛，识破妖魔三次化身',
    puppets: [
      { id: 'wukong', type: 'monkey', color: '#d4a017', startX: 0.25, startY: 0.55 },
      { id: 'tangseng', type: 'oldman', color: '#8b4513', startX: 0.55, startY: 0.55 },
      { id: 'baishenjing', type: 'skeleton', color: '#f5f5dc', startX: 0.8, startY: 0.55 },
      { id: 'oldwoman', type: 'oldman', color: '#9370db', startX: 0.7, startY: 0.35, scale: 0.85 },
      { id: 'girl', type: 'female', color: '#ff69b4', startX: 0.35, startY: 0.3, scale: 0.85 }
    ]
  },
  liangzhu: {
    id: 'liangzhu',
    title: '梁祝·化蝶',
    description: '楼台相会，化蝶双飞的凄美爱情',
    puppets: [
      { id: 'liangshanbo', type: 'scholar', color: '#1e90ff', startX: 0.35, startY: 0.5 },
      { id: 'zhuyingtai', type: 'female', color: '#ff1493', startX: 0.65, startY: 0.5 },
      { id: 'butterfly1', type: 'butterfly1', color: '#ff1493', startX: 0.4, startY: 0.2, scale: 0.6 },
      { id: 'butterfly2', type: 'butterfly2', color: '#1e90ff', startX: 0.6, startY: 0.25, scale: 0.55 },
      { id: 'butterfly3', type: 'butterfly1', color: '#ffd700', startX: 0.5, startY: 0.15, scale: 0.4 }
    ]
  }
};

export class StageManager {
  private renderer: Renderer;
  private canvas: HTMLCanvasElement;
  private currentScriptId: string | null = null;
  private isTransitioning: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new Renderer(canvas);
  }

  init(width: number, height: number): void {
    this.renderer.resize(width, height);
    this.renderer.start();
  }

  resize(width: number, height: number): void {
    this.renderer.resize(width, height);
    
    if (this.currentScriptId) {
      this.loadScript(this.currentScriptId, false);
    }
  }

  addPuppet(
    id: string,
    x: number,
    y: number,
    type: PuppetType = 'female',
    color: string = '#c41e3a',
    scale: number = 1
  ): PaperPuppet | null {
    const existing = this.getPuppetById(id);
    if (existing) {
      console.warn(`Puppet with id "${id}" already exists`);
      return null;
    }

    const puppet = createPuppet(id, x, y, type, color);
    puppet.scale = scale;
    puppet.targetScale = scale;
    this.renderer.addPuppet(puppet);
    return puppet;
  }

  removePuppet(id: string): void {
    this.renderer.removePuppet(id);
  }

  getPuppetById(id: string): PaperPuppet | undefined {
    return this.renderer.getPuppets().find(p => p.id === id);
  }

  getAllPuppets(): PaperPuppet[] {
    return this.renderer.getPuppets();
  }

  movePuppetTo(id: string, x: number, y: number, animated: boolean = true): void {
    const puppet = this.getPuppetById(id);
    if (!puppet) return;

    if (animated) {
      puppet.targetX = x;
      puppet.targetY = y;
    } else {
      puppet.x = x;
      puppet.y = y;
      puppet.targetX = x;
      puppet.targetY = y;
      puppet.velX = 0;
      puppet.velY = 0;
    }
  }

  setPuppetTarget(id: string, x: number, y: number): void {
    const puppet = this.getPuppetById(id);
    if (!puppet) return;
    puppet.targetX = x;
    puppet.targetY = y;
  }

  highlightPuppet(id: string, duration: number = 0.5): void {
    const puppet = this.getPuppetById(id);
    if (!puppet) return;
    puppet.isHighlighted = true;
    puppet.highlightTime = duration;
  }

  getPuppetAtPoint(x: number, y: number): PaperPuppet | null {
    const puppets = this.renderer.getPuppets();
    
    for (let i = puppets.length - 1; i >= 0; i--) {
      const puppet = puppets[i];
      const halfW = (puppet.width * puppet.scale) / 2;
      const halfH = (puppet.height * puppet.scale) / 2;
      
      if (
        x >= puppet.x - halfW &&
        x <= puppet.x + halfW &&
        y >= puppet.y - halfH * 0.3 &&
        y <= puppet.y + halfH
      ) {
        return puppet;
      }
    }
    
    return null;
  }

  loadScript(scriptId: string, animate: boolean = true): void {
    const script = SCRIPTS[scriptId];
    if (!script) {
      console.warn(`Script "${scriptId}" not found`);
      return;
    }

    this.currentScriptId = scriptId;

    if (animate && this.isTransitioning) {
      return;
    }

    if (animate) {
      this.isTransitioning = true;
      
      gsap.to(this, {
        duration: 0.3,
        onStart: () => {
          gsap.to({}, {
            duration: 0.3,
            onUpdate: function() {
              const alpha = this.progress();
              (window as any).stageManager?.setTransitionAlpha?.(alpha);
            }
          });
        },
        onComplete: () => {
          this.setupScriptPuppets(script);
          this.renderer.setScriptTitle(script.title);
          
          gsap.to({}, {
            duration: 0.3,
            onUpdate: function() {
              const alpha = 1 - this.progress();
              (window as any).stageManager?.setTransitionAlpha?.(alpha);
            },
            onComplete: () => {
              this.isTransitioning = false;
            }
          });
        }
      });
    } else {
      this.setupScriptPuppets(script, false);
      this.renderer.setScriptTitle(script.title);
    }
  }

  private setupScriptPuppets(script: ScriptConfig, animate: boolean = true): void {
    this.renderer.clearPuppets();

    const state = this.renderer.getState();
    const w = state.width;
    const h = state.height;

    for (const config of script.puppets) {
      const x = config.startX * w;
      const y = config.startY * h;
      const scale = config.scale || 1;
      
      const puppet = this.addPuppet(config.id, x, y, config.type, config.color, scale);
      
      if (puppet && animate) {
        puppet.scale = 0.5;
        gsap.to(puppet, {
          targetScale: scale,
          duration: 0.6,
          ease: 'back.out(1.5)',
          delay: Math.random() * 0.2
        });
      }
    }

    if (animate) {
      const puppets = this.getAllPuppets();
      puppets.forEach((puppet, index) => {
        gsap.fromTo(
          puppet,
          { y: puppet.y + 50, targetY: puppet.y + 50 },
          {
            y: puppet.y,
            targetY: puppet.y,
            duration: 0.6,
            ease: 'back.out(1.2)',
            delay: index * 0.08
          }
        );
      });
    }
  }

  setTransitionAlpha(alpha: number): void {
    this.renderer.setTransitionAlpha(alpha);
  }

  getScripts(): ScriptConfig[] {
    return Object.values(SCRIPTS);
  }

  getCurrentScriptId(): string | null {
    return this.currentScriptId;
  }

  getRenderer(): Renderer {
    return this.renderer;
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  destroy(): void {
    this.renderer.stop();
  }
}
