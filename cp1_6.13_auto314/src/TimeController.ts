import * as THREE from 'three';
import gsap from 'gsap';

export type TimePhase = 'dawn' | 'noon' | 'dusk' | 'night';

export interface TimeUpdateEvent {
  hour: number;
  phase: TimePhase;
  lightColor: THREE.Color;
  formatted: string;
}

type TimeUpdateCallback = (event: TimeUpdateEvent) => void;

export class TimeController {
  private hour: number = 12;
  private isPlaying: boolean = true;
  private cycleDuration: number = 5000;
  private lastUpdateTime: number = 0;
  private listeners: TimeUpdateCallback[] = [];

  private sliderElement: HTMLInputElement | null = null;
  private toggleButton: HTMLButtonElement | null = null;
  private toggleIcon: HTMLElement | null = null;
  private timeTextElement: HTMLElement | null = null;
  private currentTimeValueElement: HTMLElement | null = null;
  private timeIconElement: HTMLElement | null = null;
  private timeDisplayElement: HTMLElement | null = null;

  private static readonly PHASE_COLORS: Record<TimePhase, string> = {
    dawn: '#ff9f43',
    noon: '#48dbfb',
    dusk: '#a29bfe',
    night: '#636e72',
  };

  private static readonly PHASE_ICONS: Record<TimePhase, string> = {
    dawn: 'fa-sunrise',
    noon: 'fa-sun',
    dusk: 'fa-sunset',
    night: 'fa-moon',
  };

  constructor() {
    this.bindDOM();
    this.bindEvents();
    this.lastUpdateTime = performance.now();
    this.updateUI();
  }

  private bindDOM(): void {
    this.sliderElement = document.getElementById('time-slider') as HTMLInputElement;
    this.toggleButton = document.getElementById('play-toggle') as HTMLButtonElement;
    this.toggleIcon = document.getElementById('toggle-icon') as HTMLElement;
    this.timeTextElement = document.getElementById('time-text') as HTMLElement;
    this.currentTimeValueElement = document.getElementById('current-time-value') as HTMLElement;
    this.timeIconElement = document.getElementById('time-icon') as HTMLElement;
    this.timeDisplayElement = document.getElementById('time-display') as HTMLElement;
  }

  private bindEvents(): void {
    if (this.sliderElement) {
      this.sliderElement.addEventListener('input', (e: Event) => {
        const target = e.target as HTMLInputElement;
        const value = parseFloat(target.value);
        this.setHour((value / 100) * 24, true);
        if (this.isPlaying) {
          this.pause();
        }
      });
    }

    if (this.toggleButton) {
      this.toggleButton.addEventListener('click', () => {
        if (this.isPlaying) {
          this.pause();
        } else {
          this.play();
        }
      });
    }
  }

  public onUpdate(callback: TimeUpdateCallback): void {
    this.listeners.push(callback);
  }

  public play(): void {
    this.isPlaying = true;
    this.lastUpdateTime = performance.now();
    this.updateToggleUI();
  }

  public pause(): void {
    this.isPlaying = false;
    this.updateToggleUI();
  }

  public toggle(): void {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  public getHour(): number {
    return this.hour;
  }

  public setHour(hour: number, silent: boolean = false): void {
    this.hour = ((hour % 24) + 24) % 24;
    if (!silent) {
      this.updateUI();
      this.emitUpdate();
    } else {
      this.updateUI();
    }
  }

  public getPhase(): TimePhase {
    const h = this.hour;
    if (h >= 5 && h < 10) return 'dawn';
    if (h >= 10 && h < 15) return 'noon';
    if (h >= 15 && h < 20) return 'dusk';
    return 'night';
  }

  public getLightColor(): THREE.Color {
    const h = this.hour;
    const colors: Array<{ hour: number; color: THREE.Color }> = [
      { hour: 0, color: new THREE.Color('#0a0a2e') },
      { hour: 5, color: new THREE.Color('#2d1b4e') },
      { hour: 7, color: new THREE.Color('#ff9f43') },
      { hour: 10, color: new THREE.Color('#ffeaa7') },
      { hour: 12, color: new THREE.Color('#48dbfb') },
      { hour: 14, color: new THREE.Color('#74b9ff') },
      { hour: 17, color: new THREE.Color('#fd79a8') },
      { hour: 19, color: new THREE.Color('#a29bfe') },
      { hour: 21, color: new THREE.Color('#2d3436') },
      { hour: 24, color: new THREE.Color('#0a0a2e') },
    ];

    let before = colors[0];
    let after = colors[colors.length - 1];

    for (let i = 0; i < colors.length - 1; i++) {
      if (h >= colors[i].hour && h < colors[i + 1].hour) {
        before = colors[i];
        after = colors[i + 1];
        break;
      }
    }

    const range = after.hour - before.hour;
    const t = range === 0 ? 0 : (h - before.hour) / range;
    return before.color.clone().lerp(after.color, t);
  }

  private formatTime(): string {
    const totalMinutes = Math.floor(this.hour * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  private updateToggleUI(): void {
    if (!this.toggleButton || !this.toggleIcon) return;

    if (this.isPlaying) {
      this.toggleButton.classList.remove('paused');
      this.toggleButton.classList.add('playing');
      this.toggleIcon.className = 'fa-solid fa-pause';
    } else {
      this.toggleButton.classList.remove('playing');
      this.toggleButton.classList.add('paused');
      this.toggleIcon.className = 'fa-solid fa-play';
    }
  }

  private updateUI(): void {
    const phase = this.getPhase();
    const formatted = this.formatTime();
    const phaseColor = TimeController.PHASE_COLORS[phase];
    const lightColor = this.getLightColor();

    const sliderValue = (this.hour / 24) * 100;
    if (this.sliderElement) {
      this.sliderElement.value = sliderValue.toString();
    }

    if (this.timeTextElement) {
      this.timeTextElement.textContent = formatted;
    }

    if (this.currentTimeValueElement) {
      this.currentTimeValueElement.textContent = formatted;
    }

    if (this.timeDisplayElement) {
      gsap.to(this.timeDisplayElement, {
        duration: 0.6,
        color: lightColor.getStyle(),
        ease: 'power1.out',
      });
    }

    if (this.timeIconElement) {
      const iconClass = TimeController.PHASE_ICONS[phase];
      const currentClass = this.timeIconElement.className;
      const newClass = `icon fa-solid ${iconClass}`;
      if (currentClass !== newClass) {
        this.timeIconElement.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
        this.timeIconElement.style.opacity = '0';
        this.timeIconElement.style.transform = 'scale(0.5)';
        setTimeout(() => {
          if (this.timeIconElement) {
            this.timeIconElement.className = newClass;
            this.timeIconElement.style.color = phaseColor;
            this.timeIconElement.style.opacity = '1';
            this.timeIconElement.style.transform = 'scale(1)';
          }
        }, 150);
      } else {
        this.timeIconElement.style.color = phaseColor;
      }
    }
  }

  private emitUpdate(): void {
    const event: TimeUpdateEvent = {
      hour: this.hour,
      phase: this.getPhase(),
      lightColor: this.getLightColor(),
      formatted: this.formatTime(),
    };
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  public update(now: number): void {
    if (!this.isPlaying) {
      this.lastUpdateTime = now;
      return;
    }

    const delta = now - this.lastUpdateTime;
    this.lastUpdateTime = now;

    const hourDelta = (delta / this.cycleDuration) * 24;
    this.hour = (this.hour + hourDelta) % 24;

    this.updateUI();
    this.emitUpdate();
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }
}
