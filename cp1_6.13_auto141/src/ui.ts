import { ParticleSystem } from './particle';
import { AudioManager } from './interaction';

export class ControlPanel {
  private particleSystem: ParticleSystem;
  private audioManager: AudioManager;
  
  private connectionWidthSlider: HTMLInputElement | null = null;
  private bounceSpeedSlider: HTMLInputElement | null = null;
  private trailCountSlider: HTMLInputElement | null = null;
  
  private connectionWidthValue: HTMLElement | null = null;
  private bounceValue: HTMLElement | null = null;
  private trailValue: HTMLElement | null = null;
  
  private lastBeepTime: number = 0;
  private beepCooldown: number = 80;

  constructor(particleSystem: ParticleSystem, audioManager: AudioManager) {
    this.particleSystem = particleSystem;
    this.audioManager = audioManager;
    this.init();
  }

  private init(): void {
    this.connectionWidthSlider = document.getElementById('connection-width') as HTMLInputElement;
    this.bounceSpeedSlider = document.getElementById('bounce-speed') as HTMLInputElement;
    this.trailCountSlider = document.getElementById('trail-count') as HTMLInputElement;
    
    this.connectionWidthValue = document.getElementById('connection-width-value');
    this.bounceValue = document.getElementById('bounce-value');
    this.trailValue = document.getElementById('trail-value');
    
    this.bindEvents();
    this.updateDisplayValues();
  }

  private bindEvents(): void {
    if (this.connectionWidthSlider) {
      this.connectionWidthSlider.addEventListener('input', this.onConnectionWidthChange.bind(this));
    }
    
    if (this.bounceSpeedSlider) {
      this.bounceSpeedSlider.addEventListener('input', this.onBounceSpeedChange.bind(this));
    }
    
    if (this.trailCountSlider) {
      this.trailCountSlider.addEventListener('input', this.onTrailCountChange.bind(this));
    }
    
    const sliders = document.querySelectorAll('input[type="range"]');
    sliders.forEach(slider => {
      slider.addEventListener('mousedown', () => {
        this.audioManager.ensureContext();
      });
      slider.addEventListener('touchstart', () => {
        this.audioManager.ensureContext();
      }, { passive: true });
    });
  }

  private onConnectionWidthChange(e: Event): void {
    const target = e.target as HTMLInputElement;
    const value = parseFloat(target.value);
    this.particleSystem.setConnectionWidth(value);
    
    if (this.connectionWidthValue) {
      this.connectionWidthValue.textContent = value.toFixed(1);
    }
    
    this.playBeep();
  }

  private onBounceSpeedChange(e: Event): void {
    const target = e.target as HTMLInputElement;
    const value = parseFloat(target.value);
    this.particleSystem.setBounceDuration(value);
    
    if (this.bounceValue) {
      this.bounceValue.textContent = value.toFixed(1) + 's';
    }
    
    this.playBeep();
  }

  private onTrailCountChange(e: Event): void {
    const target = e.target as HTMLInputElement;
    const value = parseInt(target.value, 10);
    this.particleSystem.setTrailCount(value);
    
    if (this.trailValue) {
      this.trailValue.textContent = value.toString();
    }
    
    this.playBeep();
  }

  private playBeep(): void {
    const now = performance.now();
    if (now - this.lastBeepTime > this.beepCooldown) {
      this.audioManager.playSliderBeep();
      this.lastBeepTime = now;
    }
  }

  private updateDisplayValues(): void {
    if (this.connectionWidthSlider && this.connectionWidthValue) {
      this.connectionWidthValue.textContent = parseFloat(this.connectionWidthSlider.value).toFixed(1);
    }
    if (this.bounceSpeedSlider && this.bounceValue) {
      this.bounceValue.textContent = parseFloat(this.bounceSpeedSlider.value).toFixed(1) + 's';
    }
    if (this.trailCountSlider && this.trailValue) {
      this.trailValue.textContent = parseInt(this.trailCountSlider.value, 10).toString();
    }
  }

  getConnectionWidth(): number {
    return this.connectionWidthSlider ? parseFloat(this.connectionWidthSlider.value) : 1.5;
  }

  getBounceDuration(): number {
    return this.bounceSpeedSlider ? parseFloat(this.bounceSpeedSlider.value) : 2;
  }

  getTrailCount(): number {
    return this.trailCountSlider ? parseInt(this.trailCountSlider.value, 10) : 25;
  }
}
