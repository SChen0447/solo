import * as THREE from 'three';

export interface Palette {
  name: string;
  colors: string[];
}

export const palettes: Palette[] = [
  {
    name: '极光',
    colors: ['#00FF87', '#60EFFF', '#FFD700', '#FF6B6B', '#8A2BE2']
  },
  {
    name: '霓虹',
    colors: ['#FF00FF', '#00FFFF', '#FF0080', '#80FF00', '#FFFF00']
  },
  {
    name: '日落',
    colors: ['#FF6B35', '#F7C59F', '#EFEFD0', '#004E89', '#1A659E']
  },
  {
    name: '深海',
    colors: ['#05668D', '#028090', '#00A896', '#02C39A', '#F0F3BD']
  },
  {
    name: '星空',
    colors: ['#7400B8', '#6930C3', '#5E60CE', '#5390D9', '#48BFE3']
  }
];

export class ColorPalette {
  private currentIndex: number = 0;
  private previousColors: THREE.Color[];
  private currentColors: THREE.Color[];
  private transitionProgress: number = 1;
  private isTransitioning: boolean = false;
  private transitionDuration: number = 2;
  private transitionTimer: number = 0;
  private autoSwitchInterval: number = 5;
  private autoSwitchTimer: number = 0;

  constructor() {
    this.currentColors = palettes[0].colors.map(c => new THREE.Color(c));
    this.previousColors = palettes[0].colors.map(c => new THREE.Color(c));
  }

  getCurrentPaletteName(): string {
    return palettes[this.currentIndex].name;
  }

  getPaletteCount(): number {
    return palettes.length;
  }

  nextPalette(): void {
    if (this.isTransitioning) return;
    this.startTransition((this.currentIndex + 1) % palettes.length);
  }

  prevPalette(): void {
    if (this.isTransitioning) return;
    this.startTransition((this.currentIndex - 1 + palettes.length) % palettes.length);
  }

  private startTransition(targetIndex: number): void {
    for (let i = 0; i < 5; i++) {
      this.previousColors[i].copy(this.currentColors[i]);
    }
    this.currentIndex = targetIndex;
    this.transitionProgress = 0;
    this.transitionTimer = 0;
    this.isTransitioning = true;
  }

  update(deltaTime: number): void {
    if (this.isTransitioning) {
      this.transitionTimer += deltaTime;
      this.transitionProgress = Math.min(this.transitionTimer / this.transitionDuration, 1);
      const t = this.transitionProgress;

      for (let i = 0; i < 5; i++) {
        this.currentColors[i].lerpColors(
          this.previousColors[i],
          new THREE.Color(palettes[this.currentIndex].colors[i]),
          t
        );
      }

      if (this.transitionProgress >= 1) {
        this.isTransitioning = false;
      }
    }

    this.autoSwitchTimer += deltaTime;
    if (this.autoSwitchTimer >= this.autoSwitchInterval) {
      this.autoSwitchTimer = 0;
      this.nextPalette();
    }
  }

  getColor(index: number): THREE.Color {
    return this.currentColors[index % 5];
  }

  getRandomColor(): THREE.Color {
    return this.currentColors[Math.floor(Math.random() * 5)];
  }

  getComplementaryColor(baseColor: THREE.Color): THREE.Color {
    const hsl = { h: 0, s: 0, l: 0 };
    baseColor.getHSL(hsl);
    hsl.h = (hsl.h + 0.5) % 1;
    return new THREE.Color().setHSL(hsl.h, hsl.s, hsl.l);
  }

  getDominantColor(): THREE.Color {
    return this.currentColors[0];
  }
}
