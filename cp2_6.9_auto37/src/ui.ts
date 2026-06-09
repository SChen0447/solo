export interface TrafficInfo {
  simTime: string;
  vehicleCount: number;
  averageSpeed: number;
}

export type TimeChangeCallback = (minutes: number) => void;

export class UIManager {
  private timeSlider: HTMLInputElement;
  private timeDisplay: HTMLElement;
  private simTimeDisplay: HTMLElement;
  private vehicleCountDisplay: HTMLElement;
  private avgSpeedDisplay: HTMLElement;

  private currentMinutes: number = 480;
  private onTimeChangeCallback: TimeChangeCallback | null = null;
  private isDragging: boolean = false;

  constructor() {
    this.timeSlider = document.getElementById('time-slider') as HTMLInputElement;
    this.timeDisplay = document.getElementById('time-display') as HTMLElement;
    this.simTimeDisplay = document.getElementById('sim-time') as HTMLElement;
    this.vehicleCountDisplay = document.getElementById('vehicle-count') as HTMLElement;
    this.avgSpeedDisplay = document.getElementById('avg-speed') as HTMLElement;

    this.bindEvents();
    this.updateTimeDisplay(this.currentMinutes);
  }

  private bindEvents() {
    this.timeSlider.addEventListener('input', (e) => {
      this.isDragging = true;
      const value = parseInt((e.target as HTMLInputElement).value, 10);
      this.currentMinutes = value;
      this.updateTimeDisplay(value);
      if (this.onTimeChangeCallback) {
        this.onTimeChangeCallback(value);
      }
    });

    this.timeSlider.addEventListener('change', () => {
      this.isDragging = false;
    });
  }

  onTimeChange(callback: TimeChangeCallback) {
    this.onTimeChangeCallback = callback;
  }

  setTime(minutes: number) {
    this.currentMinutes = minutes;
    this.timeSlider.value = minutes.toString();
    this.updateTimeDisplay(minutes);
  }

  getTime(): number {
    return this.currentMinutes;
  }

  private updateTimeDisplay(minutes: number) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const timeStr = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    this.timeDisplay.textContent = timeStr;
    this.simTimeDisplay.textContent = timeStr;
  }

  updateStats(info: TrafficInfo) {
    this.vehicleCountDisplay.textContent = info.vehicleCount.toString();
    this.avgSpeedDisplay.textContent = `${info.averageSpeed.toFixed(1)} km/h`;
  }

  formatTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }
}
