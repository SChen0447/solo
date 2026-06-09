import { ParticleSystem } from './particles.js';

const ROMAN_NUMERALS = [
  'XII', 'I', 'II', 'III', 'IV', 'V',
  'VI', 'VII', 'VIII', 'IX', 'X', 'XI'
];

export class Sundial {
  private container: HTMLElement;
  private shadowMask: HTMLElement;
  private romanNumeralsContainer: HTMLElement;
  private timeDisplay: HTMLElement;
  private particleSystem: ParticleSystem;
  private canvas: HTMLCanvasElement;

  private currentAngle: number = 0;
  private targetAngle: number = 0;
  private smoothedAngle: number = 0;

  private currentSeconds: number = 0;
  private smoothedSeconds: number = 0;

  private isMobile: boolean;
  private containerRect: DOMRect | null = null;

  constructor(
    container: HTMLElement,
    shadowMask: HTMLElement,
    romanNumeralsContainer: HTMLElement,
    timeDisplay: HTMLElement,
    canvas: HTMLCanvasElement
  ) {
    this.container = container;
    this.shadowMask = shadowMask;
    this.romanNumeralsContainer = romanNumeralsContainer;
    this.timeDisplay = timeDisplay;
    this.canvas = canvas;

    this.isMobile = window.innerWidth < 768;
    this.particleSystem = new ParticleSystem(canvas, this.isMobile);

    this.setupRomanNumerals();
    this.setupEventListeners();
    this.updateContainerRect();

    this.smoothedAngle = 180;
    this.targetAngle = 180;
    this.currentAngle = 180;
  }

  private setupRomanNumerals(): void {
    this.romanNumeralsContainer.innerHTML = '';
    const rect = this.romanNumeralsContainer.getBoundingClientRect();
    const radius = Math.min(rect.width, rect.height) / 2 - (this.isMobile ? 24 : 38);

    for (let i = 0; i < 12; i++) {
      const angle = (i * 30 - 90) * (Math.PI / 180);
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      const span = document.createElement('span');
      span.className = 'roman-numeral';
      span.textContent = ROMAN_NUMERALS[i];
      span.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;

      this.romanNumeralsContainer.appendChild(span);
    }
  }

  private setupEventListeners(): void {
    window.addEventListener('mousemove', (e) => {
      this.handleMouseMove(e.clientX, e.clientY);
    });

    window.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        this.handleMouseMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    window.addEventListener('resize', () => {
      this.handleResize();
    });
  }

  private updateContainerRect(): void {
    this.containerRect = this.container.getBoundingClientRect();
  }

  private handleMouseMove(clientX: number, clientY: number): void {
    if (!this.containerRect) {
      this.updateContainerRect();
    }

    const centerX = this.containerRect!.left + this.containerRect!.width / 2;
    const centerY = this.containerRect!.top + this.containerRect!.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;

    let angle = Math.atan2(dy, dx) * (180 / Math.PI);
    angle = (angle + 360) % 360;

    this.targetAngle = angle;
    this.particleSystem.updateMousePosition(clientX, clientY);
  }

  private handleResize(): void {
    const nowMobile = window.innerWidth < 768;
    if (nowMobile !== this.isMobile) {
      this.isMobile = nowMobile;
      this.particleSystem.reinitializeForMobile(this.isMobile);
      this.setupRomanNumerals();
    }

    this.particleSystem.resize();
    this.updateContainerRect();
  }

  private angleToTime(angle: number): { hours: number; minutes: number; seconds: number } {
    const normalizedAngle = (angle + 360) % 360;

    const totalSeconds = (normalizedAngle / 360) * 24 * 60 * 60;

    const hours = Math.floor(totalSeconds / 3600) % 24;
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);

    return { hours, minutes, seconds };
  }

  private formatTime(hours: number, minutes: number, seconds: number): string {
    const h = hours.toString().padStart(2, '0');
    const m = minutes.toString().padStart(2, '0');
    const s = seconds.toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  private updateShadowMask(angle: number): void {
    const featherPx = this.isMobile ? 8 : 12;
    const shadowWidth = 25;
    const startAngle = angle - shadowWidth / 2;
    const endAngle = angle + shadowWidth / 2;

    const shadowBg = `conic-gradient(
      from ${startAngle - featherPx}deg at 50% 50%,
      rgba(93, 64, 55, 0) 0deg,
      rgba(93, 64, 55, 0.55) ${featherPx}deg,
      rgba(93, 64, 55, 0.65) ${shadowWidth / 2}deg,
      rgba(93, 64, 55, 0.55) ${shadowWidth - featherPx}deg,
      rgba(93, 64, 55, 0) ${shadowWidth}deg
    )`;

    this.shadowMask.style.background = shadowBg;

    const maskGradient = `radial-gradient(
      circle at 50% 50%,
      transparent 0%,
      transparent 8%,
      black 8%,
      black 100%
    )`;

    this.shadowMask.style.webkitMaskImage = maskGradient;
    this.shadowMask.style.maskImage = maskGradient;
  }

  public update(): void {
    const angleDiff = this.targetAngle - this.currentAngle;
    const shortestDiff = ((angleDiff + 540) % 360) - 180;
    this.currentAngle += shortestDiff * 0.12;
    this.smoothedAngle = this.currentAngle;

    const targetSeconds = ((this.smoothedAngle + 360) % 360) / 360 * 24 * 60 * 60;
    let secDiff = targetSeconds - this.smoothedSeconds;
    if (secDiff > 12 * 3600) secDiff -= 24 * 3600;
    if (secDiff < -12 * 3600) secDiff += 24 * 3600;
    this.smoothedSeconds += secDiff * 0.1;

    const displaySeconds = ((this.smoothedSeconds % (24 * 3600)) + 24 * 3600) % (24 * 3600);
    const time = this.angleToTime((displaySeconds / (24 * 3600)) * 360);
    this.timeDisplay.textContent = this.formatTime(time.hours, time.minutes, time.seconds);

    this.updateShadowMask(this.smoothedAngle);
    this.particleSystem.update();
  }

  public render(): void {
    this.particleSystem.render();
  }

  public getParticleSystem(): ParticleSystem {
    return this.particleSystem;
  }
}
