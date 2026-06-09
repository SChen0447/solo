import { RideStats } from './ridePlayer';

type FileUploadCallback = (file: File) => void;
type PlayCallback = () => void;
type PauseCallback = () => void;
type ResetCallback = () => void;
type ProgressCallback = (progress: number) => void;
type SpeedCallback = (speed: number) => void;
type TerrainCallback = (amplitude: number) => void;

export interface ElevationPoint {
  distance: number;
  elevation: number;
}

export class UIController {
  private uploadArea: HTMLElement;
  private fileInput: HTMLInputElement;
  private fileNameDisplay: HTMLElement;

  private playBtn: HTMLButtonElement;
  private resetBtn: HTMLButtonElement;
  private progressSlider: HTMLInputElement;
  private progressValue: HTMLElement;
  private speedSlider: HTMLInputElement;
  private speedValue: HTMLElement;
  private terrainSlider: HTMLInputElement;
  private terrainValue: HTMLElement;

  private elevationCanvas: HTMLCanvasElement;
  private elevationCtx: CanvasRenderingContext2D;

  private statDistance: HTMLElement;
  private statElevation: HTMLElement;
  private statSpeed: HTMLElement;
  private statDuration: HTMLElement;

  private onFileUpload: FileUploadCallback | null = null;
  private onPlay: PlayCallback | null = null;
  private onPause: PauseCallback | null = null;
  private onReset: ResetCallback | null = null;
  private onProgressChange: ProgressCallback | null = null;
  private onSpeedChange: SpeedCallback | null = null;
  private onTerrainChange: TerrainCallback | null = null;

  private isPlaying: boolean = false;
  private elevationProfile: ElevationPoint[] = [];
  private currentProgress: number = 0;
  private lastChartUpdate: number = 0;
  private chartUpdateInterval: number = 200;

  private chartLineBlinkTime: number = 0;

  constructor() {
    this.uploadArea = document.getElementById('upload-area') as HTMLElement;
    this.fileInput = document.getElementById('file-input') as HTMLInputElement;
    this.fileNameDisplay = document.getElementById('file-name') as HTMLElement;

    this.playBtn = document.getElementById('play-btn') as HTMLButtonElement;
    this.resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
    this.progressSlider = document.getElementById('progress-slider') as HTMLInputElement;
    this.progressValue = document.getElementById('progress-value') as HTMLElement;
    this.speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
    this.speedValue = document.getElementById('speed-value') as HTMLElement;
    this.terrainSlider = document.getElementById('terrain-slider') as HTMLInputElement;
    this.terrainValue = document.getElementById('terrain-value') as HTMLElement;

    this.elevationCanvas = document.getElementById('elevation-chart') as HTMLCanvasElement;
    this.elevationCtx = this.elevationCanvas.getContext('2d')!;

    this.statDistance = document.getElementById('stat-distance') as HTMLElement;
    this.statElevation = document.getElementById('stat-elevation') as HTMLElement;
    this.statSpeed = document.getElementById('stat-speed') as HTMLElement;
    this.statDuration = document.getElementById('stat-duration') as HTMLElement;

    this.bindEvents();
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
    this.drawEmptyChart();
  }

  private bindEvents(): void {
    this.uploadArea.addEventListener('click', () => this.fileInput.click());
    this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

    this.uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.uploadArea.classList.add('dragover');
    });

    this.uploadArea.addEventListener('dragleave', () => {
      this.uploadArea.classList.remove('dragover');
    });

    this.uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      this.uploadArea.classList.remove('dragover');
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        this.processFile(files[0]);
      }
    });

    this.playBtn.addEventListener('click', () => this.togglePlay());
    this.resetBtn.addEventListener('click', () => this.handleReset());

    this.progressSlider.addEventListener('input', () => this.handleProgressInput());
    this.progressSlider.addEventListener('change', () => this.handleProgressChange());

    this.speedSlider.addEventListener('input', () => this.handleSpeedInput());

    this.terrainSlider.addEventListener('input', () => this.handleTerrainInput());
  }

  private handleFileSelect(e: Event): void {
    const target = e.target as HTMLInputElement;
    const files = target.files;
    if (files && files.length > 0) {
      this.processFile(files[0]);
    }
  }

  private processFile(file: File): void {
    const validExtensions = ['.gpx', '.csv'];
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!validExtensions.includes(extension)) {
      alert('请上传 GPX 或 CSV 格式的文件');
      return;
    }

    this.fileNameDisplay.textContent = file.name;

    if (this.onFileUpload) {
      this.onFileUpload(file);
    }
  }

  private togglePlay(): void {
    if (this.isPlaying) {
      this.isPlaying = false;
      this.playBtn.textContent = '▶ 开始播放';
      this.playBtn.classList.remove('pause');
      if (this.onPause) this.onPause();
    } else {
      this.isPlaying = true;
      this.playBtn.textContent = '⏸ 暂停播放';
      this.playBtn.classList.add('pause');
      if (this.onPlay) this.onPlay();
    }
  }

  private handleReset(): void {
    this.isPlaying = false;
    this.playBtn.textContent = '▶ 开始播放';
    this.playBtn.classList.remove('pause');
    this.progressSlider.value = '0';
    this.updateProgressValue(0);
    this.currentProgress = 0;
    if (this.onReset) this.onReset();
    this.drawElevationChart();
  }

  private handleProgressInput(): void {
    const value = parseFloat(this.progressSlider.value);
    this.updateProgressValue(value);
  }

  private handleProgressChange(): void {
    const value = parseFloat(this.progressSlider.value);
    this.currentProgress = value / 100;
    if (this.onProgressChange) {
      this.onProgressChange(this.currentProgress);
    }
  }

  private handleSpeedInput(): void {
    const value = parseFloat(this.speedSlider.value);
    this.speedValue.textContent = value.toFixed(1) + 'x';
    if (this.onSpeedChange) {
      this.onSpeedChange(value);
    }
  }

  private handleTerrainInput(): void {
    const value = parseFloat(this.terrainSlider.value);
    this.terrainValue.textContent = value + '%';
    if (this.onTerrainChange) {
      this.onTerrainChange(value);
    }
  }

  private updateProgressValue(percent: number): void {
    this.progressValue.textContent = percent.toFixed(1) + '%';
    const sliderRect = this.progressSlider.getBoundingClientRect();
    const thumbLeft = (percent / 100) * sliderRect.width;
    this.progressValue.style.left = thumbLeft + 'px';
    this.progressValue.style.transform = 'translateX(-50%)';
  }

  private resizeCanvas(): void {
    const rect = this.elevationCanvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    this.elevationCanvas.width = rect.width * dpr;
    this.elevationCanvas.height = rect.height * dpr;

    this.elevationCtx.scale(dpr, dpr);
    this.drawElevationChart();
  }

  setElevationProfile(profile: ElevationPoint[]): void {
    this.elevationProfile = profile;
    this.drawElevationChart();
  }

  updateCurrentProgress(progress: number): void {
    this.currentProgress = progress;
    const percent = progress * 100;
    this.progressSlider.value = percent.toString();
    this.updateProgressValue(percent);

    const now = performance.now();
    if (now - this.lastChartUpdate >= this.chartUpdateInterval) {
      this.lastChartUpdate = now;
      this.drawElevationChart();
    }
  }

  setPlayingState(playing: boolean): void {
    this.isPlaying = playing;
    if (playing) {
      this.playBtn.textContent = '⏸ 暂停播放';
      this.playBtn.classList.add('pause');
    } else {
      this.playBtn.textContent = '▶ 开始播放';
      this.playBtn.classList.remove('pause');
    }
  }

  updateStats(stats: RideStats): void {
    this.statDistance.textContent = stats.totalDistance.toFixed(2);
    this.statElevation.textContent = Math.round(stats.averageElevation).toString();
    this.statSpeed.textContent = stats.averageSpeed.toFixed(1);
    this.statDuration.textContent = this.formatDuration(stats.totalDuration);
  }

  private formatDuration(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  private drawEmptyChart(): void {
    const rect = this.elevationCanvas.getBoundingClientRect();
    const ctx = this.elevationCtx;
    const width = rect.width;
    const height = rect.height;

    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = 'rgba(0, 210, 255, 0.1)';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('暂无数据', width / 2, height / 2);
  }

  private drawElevationChart(): void {
    const rect = this.elevationCanvas.getBoundingClientRect();
    const ctx = this.elevationCtx;
    const width = rect.width;
    const height = rect.height;
    const padding = { top: 10, right: 10, bottom: 20, left: 35 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    ctx.clearRect(0, 0, width, height);

    if (this.elevationProfile.length === 0) {
      this.drawEmptyChart();
      return;
    }

    let minElevation = Infinity;
    let maxElevation = -Infinity;

    this.elevationProfile.forEach((p) => {
      minElevation = Math.min(minElevation, p.elevation);
      maxElevation = Math.max(maxElevation, p.elevation);
    });

    const elevationRange = Math.max(1, maxElevation - minElevation);
    minElevation -= elevationRange * 0.1;
    maxElevation += elevationRange * 0.1;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;

    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (i / 4) * chartHeight;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartWidth, y);
      ctx.stroke();

      const elevation = maxElevation - (i / 4) * (maxElevation - minElevation);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(Math.round(elevation).toString(), padding.left - 5, y);
    }

    const points: { x: number; y: number }[] = [];
    this.elevationProfile.forEach((p) => {
      const x = padding.left + (p.distance / 100) * chartWidth;
      const y =
        padding.top +
        ((maxElevation - p.elevation) / (maxElevation - minElevation)) * chartHeight;
      points.push({ x, y });
    });

    ctx.save();
    ctx.shadowColor = 'rgba(0, 210, 255, 0.5)';
    ctx.shadowBlur = 8;

    const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight);
    gradient.addColorStop(0, 'rgba(0, 210, 255, 0.4)');
    gradient.addColorStop(1, 'rgba(0, 210, 255, 0.02)');

    ctx.beginPath();
    ctx.moveTo(points[0].x, padding.top + chartHeight);
    points.forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.lineTo(points[points.length - 1].x, padding.top + chartHeight);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    const lineGradient = ctx.createLinearGradient(
      padding.left,
      0,
      padding.left + chartWidth,
      0
    );
    lineGradient.addColorStop(0, '#00d2ff');
    lineGradient.addColorStop(1, '#3a7bd5');

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.strokeStyle = lineGradient;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    this.chartLineBlinkTime += 0.05;
    const blinkAlpha = 0.5 + Math.sin(this.chartLineBlinkTime) * 0.5;

    const progressX = padding.left + this.currentProgress * chartWidth;
    ctx.save();
    ctx.strokeStyle = `rgba(255, 107, 53, ${blinkAlpha})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(progressX, padding.top);
    ctx.lineTo(progressX, padding.top + chartHeight);
    ctx.stroke();
    ctx.restore();

    const progressY = this.getProgressY(padding, chartHeight, maxElevation, minElevation);
    if (progressY !== null) {
      ctx.beginPath();
      ctx.arc(progressX, progressY, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#ff6b35';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('0%', padding.left, padding.top + chartHeight + 5);
    ctx.fillText('100%', padding.left + chartWidth, padding.top + chartHeight + 5);
  }

  private getProgressY(
    padding: { top: number; bottom: number; left: number; right: number },
    chartHeight: number,
    maxElevation: number,
    minElevation: number
  ): number | null {
    if (this.elevationProfile.length === 0) return null;

    const targetDistance = this.currentProgress * 100;

    for (let i = 1; i < this.elevationProfile.length; i++) {
      const prev = this.elevationProfile[i - 1];
      const curr = this.elevationProfile[i];

      if (targetDistance >= prev.distance && targetDistance <= curr.distance) {
        const t = (targetDistance - prev.distance) / (curr.distance - prev.distance);
        const elevation = prev.elevation + (curr.elevation - prev.elevation) * t;

        return (
          padding.top +
          ((maxElevation - elevation) / (maxElevation - minElevation)) * chartHeight
        );
      }
    }

    return null;
  }

  onFileUploadCallback(callback: FileUploadCallback): void {
    this.onFileUpload = callback;
  }

  onPlayCallback(callback: PlayCallback): void {
    this.onPlay = callback;
  }

  onPauseCallback(callback: PauseCallback): void {
    this.onPause = callback;
  }

  onResetCallback(callback: ResetCallback): void {
    this.onReset = callback;
  }

  onProgressChangeCallback(callback: ProgressCallback): void {
    this.onProgressChange = callback;
  }

  onSpeedChangeCallback(callback: SpeedCallback): void {
    this.onSpeedChange = callback;
  }

  onTerrainChangeCallback(callback: TerrainCallback): void {
    this.onTerrainChange = callback;
  }

  animateChart(time: number): void {
    if (Math.floor(time / 500) !== Math.floor((time - 16) / 500)) {
      this.drawElevationChart();
    }
  }
}
