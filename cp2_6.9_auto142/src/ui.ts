import { SolarSystem, CelestialBody } from './SolarSystem';
import { EffectController } from './EffectController';

export interface UIState {
  timeSpeed: number;
  pitchAngle: number;
  sunGlow: number;
  moonOrbit: number;
}

export class UIController {
  private solarSystem: SolarSystem;
  private effectController: EffectController;
  public state: UIState;

  private timeSpeedSlider: HTMLInputElement;
  private timeSpeedVal: HTMLElement;
  private pitchSlider: HTMLInputElement;
  private pitchVal: HTMLElement;
  private glowSlider: HTMLInputElement;
  private glowVal: HTMLElement;
  private moonOrbitSlider: HTMLInputElement;
  private moonOrbitVal: HTMLElement;
  private triggerBtn: HTMLButtonElement;

  private infoCard: HTMLElement;
  private cardName: HTMLElement;
  private cardRadius: HTMLElement;
  private cardAngle: HTMLElement;
  private cardDistance: HTMLElement;

  constructor(solarSystem: SolarSystem, effectController: EffectController) {
    this.solarSystem = solarSystem;
    this.effectController = effectController;
    this.state = {
      timeSpeed: 1.0,
      pitchAngle: 30,
      sunGlow: 1.0,
      moonOrbit: 3.2
    };

    this.timeSpeedSlider = document.getElementById('time-speed') as HTMLInputElement;
    this.timeSpeedVal = document.getElementById('time-speed-val') as HTMLElement;
    this.pitchSlider = document.getElementById('pitch-angle') as HTMLInputElement;
    this.pitchVal = document.getElementById('pitch-val') as HTMLElement;
    this.glowSlider = document.getElementById('sun-glow') as HTMLInputElement;
    this.glowVal = document.getElementById('glow-val') as HTMLElement;
    this.moonOrbitSlider = document.getElementById('moon-orbit') as HTMLInputElement;
    this.moonOrbitVal = document.getElementById('moon-orbit-val') as HTMLElement;
    this.triggerBtn = document.getElementById('trigger-eclipse-btn') as HTMLButtonElement;

    this.infoCard = document.getElementById('info-card') as HTMLElement;
    this.cardName = document.getElementById('card-name') as HTMLElement;
    this.cardRadius = document.getElementById('card-radius') as HTMLElement;
    this.cardAngle = document.getElementById('card-angle') as HTMLElement;
    this.cardDistance = document.getElementById('card-distance') as HTMLElement;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.timeSpeedSlider.addEventListener('input', () => {
      this.state.timeSpeed = parseFloat(this.timeSpeedSlider.value);
      this.timeSpeedVal.textContent = this.state.timeSpeed.toFixed(1);
    });

    this.pitchSlider.addEventListener('input', () => {
      this.state.pitchAngle = parseFloat(this.pitchSlider.value);
      this.pitchVal.textContent = `${this.state.pitchAngle}°`;
    });

    this.glowSlider.addEventListener('input', () => {
      this.state.sunGlow = parseFloat(this.glowSlider.value);
      this.glowVal.textContent = this.state.sunGlow.toFixed(1);
      this.solarSystem.setSunGlowIntensity(this.state.sunGlow);
    });

    this.moonOrbitSlider.addEventListener('input', () => {
      this.state.moonOrbit = parseFloat(this.moonOrbitSlider.value);
      this.moonOrbitVal.textContent = this.state.moonOrbit.toFixed(1);
      this.solarSystem.setMoonOrbitRadius(this.state.moonOrbit);
    });

    this.triggerBtn.addEventListener('click', () => {
      this.effectController.triggerEclipse();
    });

    document.addEventListener('click', (e) => {
      if (!this.infoCard.contains(e.target as Node) &&
          !(e.target as HTMLElement).closest('#control-panel') &&
          !(e.target as HTMLElement).closest('#title')) {
        this.hideInfoCard();
      }
    });
  }

  public showInfoCard(body: CelestialBody, screenX: number, screenY: number): void {
    this.cardName.textContent = body.name;
    this.cardRadius.textContent = `${body.radius.toFixed(2)} 单位`;

    const angleDeg = (body.angle * (180 / Math.PI)) % 360;
    const normalizedAngle = angleDeg < 0 ? angleDeg + 360 : angleDeg;
    this.cardAngle.textContent = `${normalizedAngle.toFixed(1)}°`;

    const dist = this.solarSystem.getDistanceToNearestBody(body);
    this.cardDistance.textContent = `${dist.toFixed(2)} 单位`;

    const padding = 16;
    const cardW = 220;
    const cardH = 130;
    let left = screenX + padding;
    let top = screenY - cardH / 2;

    if (left + cardW > window.innerWidth - padding) {
      left = screenX - cardW - padding;
    }
    if (top < padding) top = padding;
    if (top + cardH > window.innerHeight - padding) {
      top = window.innerHeight - cardH - padding;
    }

    this.infoCard.style.left = `${left}px`;
    this.infoCard.style.top = `${top}px`;
    this.infoCard.style.display = 'block';
  }

  public hideInfoCard(): void {
    this.infoCard.style.display = 'none';
  }
}
