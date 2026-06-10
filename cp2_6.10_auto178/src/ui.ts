import _ from 'lodash';

export interface LapRecord {
  lapNumber: number;
  time: number;
  averageSpeed: number;
}

const MAX_LAPS = 5;
const MAX_SPEED = 5;

export class UIManager {
  private lapRecords: LapRecord[] = [];
  private lapListElement: HTMLElement;
  private totalTimeElement: HTMLElement;
  private speedValueElement: HTMLElement;
  private statusTextElement: HTMLElement;
  private controlHintElement: HTMLElement;
  private speedCanvas: HTMLCanvasElement;
  private speedCtx: CanvasRenderingContext2D;
  private currentSpeed: number = 0;
  private pulseTime: number = 0;

  constructor() {
    this.lapListElement = document.getElementById('lapList')!;
    this.totalTimeElement = document.getElementById('totalTime')!;
    this.speedValueElement = document.getElementById('speedValue')!;
    this.statusTextElement = document.getElementById('statusText')!;
    this.controlHintElement = document.getElementById('controlHint')!;
    this.speedCanvas = document.getElementById('speedCanvas') as HTMLCanvasElement;
    this.speedCtx = this.speedCanvas.getContext('2d')!;
    this.updateLapList();
    this.updateTotalTime();
  }

  public addLapRecord(lapNumber: number, time: number, trackLength: number): void {
    const averageSpeed = trackLength > 0 ? (trackLength / 60) / time : 0;

    this.lapRecords.push({
      lapNumber,
      time,
      averageSpeed
    });

    if (this.lapRecords.length > MAX_LAPS) {
      this.lapRecords = this.lapRecords.slice(-MAX_LAPS);
    }

    this.updateLapList();
    this.updateTotalTime();
  }

  private updateLapList(): void {
    this.lapListElement.innerHTML = '';

    if (this.lapRecords.length === 0) {
      const emptyItem = document.createElement('div');
      emptyItem.style.cssText = 'font-size: 13px; color: #888; text-align: center; padding: 8px 0;';
      emptyItem.textContent = '暂无成绩';
      this.lapListElement.appendChild(emptyItem);
      return;
    }

    const sortedRecords = _.sortBy(this.lapRecords, ['time']);

    for (let i = 0; i < sortedRecords.length; i++) {
      const record = sortedRecords[i];
      const lapItem = document.createElement('div');
      lapItem.className = 'lap-item';

      const rankSpan = document.createElement('span');
      rankSpan.textContent = `#${i + 1} (第${record.lapNumber}圈)`;
      rankSpan.style.fontSize = '12px';

      const infoDiv = document.createElement('div');
      infoDiv.className = 'lap-info';
      infoDiv.style.alignItems = 'flex-end';

      const timeSpan = document.createElement('span');
      timeSpan.textContent = `${record.time.toFixed(3)}s`;
      timeSpan.style.fontWeight = 'bold';

      const speedSpan = document.createElement('span');
      speedSpan.textContent = `${record.averageSpeed.toFixed(2)} u/s`;
      speedSpan.style.fontSize = '11px';
      speedSpan.style.color = '#aaa';

      infoDiv.appendChild(timeSpan);
      infoDiv.appendChild(speedSpan);
      lapItem.appendChild(rankSpan);
      lapItem.appendChild(infoDiv);
      this.lapListElement.appendChild(lapItem);
    }
  }

  private updateTotalTime(): void {
    const recentRecords = this.lapRecords.slice(-MAX_LAPS);
    const total = recentRecords.reduce((sum, r) => sum + r.time, 0);
    this.totalTimeElement.textContent = `${total.toFixed(3)}s`;
  }

  public updateSpeed(speed: number): void {
    this.currentSpeed = Math.max(0, Math.min(MAX_SPEED, speed));
    this.speedValueElement.textContent = this.currentSpeed.toFixed(2);
  }

  public drawSpeedometer(dt: number): void {
    this.pulseTime += dt;
    const pulseAlpha = 0.8 + 0.2 * Math.sin((this.pulseTime / 2) * Math.PI * 2);

    const ctx = this.speedCtx;
    const canvas = this.speedCanvas;
    const w = canvas.width;
    const h = canvas.height;
    const centerX = w / 2;
    const centerY = h * 0.6;
    const radius = Math.min(w, h) * 0.4;

    ctx.clearRect(0, 0, w, h);

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, Math.PI, 0);
    ctx.strokeStyle = '#3a3a50';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.stroke();

    const speedRatio = this.currentSpeed / MAX_SPEED;
    const endAngle = Math.PI + speedRatio * Math.PI;

    const gradient = ctx.createLinearGradient(centerX - radius, centerY, centerX + radius, centerY);
    gradient.addColorStop(0, '#4caf50');
    gradient.addColorStop(0.5, '#ffeb3b');
    gradient.addColorStop(1, '#f44336');

    ctx.globalAlpha = pulseAlpha;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, Math.PI, endAngle);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillText('0', centerX - radius + 5, centerY + 12);
    ctx.fillText('2.5', centerX, centerY - radius - 8);
    ctx.fillText('5', centerX + radius - 5, centerY + 12);
  }

  public updateStatus(isStopped: boolean): void {
    if (isStopped) {
      this.statusTextElement.textContent = '已停止';
      this.statusTextElement.style.color = '#f44336';
      this.controlHintElement.classList.add('blinking');
    } else {
      this.statusTextElement.textContent = '飞行中';
      this.statusTextElement.style.color = '#4caf50';
      this.controlHintElement.classList.remove('blinking');
    }
  }

  public reset(): void {
    this.lapRecords = [];
    this.currentSpeed = 0;
    this.updateLapList();
    this.updateTotalTime();
    this.updateSpeed(0);
    this.updateStatus(false);
  }
}
