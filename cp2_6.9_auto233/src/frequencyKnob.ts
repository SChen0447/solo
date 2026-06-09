export type FrequencyChangeCallback = (frequency: number) => void;

export class FrequencyKnob {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private currentFrequency: number = 100;
  private minFrequency: number = 80;
  private maxFrequency: number = 120;
  private minAngle: number = -135 * (Math.PI / 180);
  private maxAngle: number = 135 * (Math.PI / 180);
  private isDragging: boolean = false;
  private lastAngle: number = 0;
  private centerX: number = 50;
  private centerY: number = 50;
  private radius: number = 30;
  private onChangeCallback: FrequencyChangeCallback | null = null;
  private pixelRatio: number;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2D context for knob canvas');
    this.ctx = ctx;
    this.pixelRatio = window.devicePixelRatio || 1;
    this.setupHighDPICanvas();
    this.bindEvents();
    this.draw();
  }

  private setupHighDPICanvas(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * this.pixelRatio;
    this.canvas.height = rect.height * this.pixelRatio;
    this.ctx.scale(this.pixelRatio, this.pixelRatio);
    this.centerX = rect.width / 2;
    this.centerY = rect.height / 2;
    this.radius = Math.min(rect.width, rect.height) / 2 - 10;
  }

  public setOnChange(callback: FrequencyChangeCallback): void {
    this.onChangeCallback = callback;
  }

  public getFrequency(): number {
    return this.currentFrequency;
  }

  public setFrequency(freq: number): void {
    this.currentFrequency = Math.max(this.minFrequency, Math.min(this.maxFrequency, freq));
    this.draw();
    if (this.onChangeCallback) {
      this.onChangeCallback(this.currentFrequency);
    }
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('mouseup', this.onMouseUp.bind(this));

    this.canvas.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    window.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    window.addEventListener('touchend', this.onTouchEnd.bind(this));

    this.canvas.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
  }

  private getAngleFromEvent(clientX: number, clientY: number): number {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left - this.centerX;
    const y = clientY - rect.top - this.centerY;
    return Math.atan2(y, x);
  }

  private onMouseDown(e: MouseEvent): void {
    this.isDragging = true;
    this.lastAngle = this.getAngleFromEvent(e.clientX, e.clientY);
    e.preventDefault();
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return;
    this.handleDrag(e.clientX, e.clientY);
    e.preventDefault();
  }

  private onMouseUp(_e: MouseEvent): void {
    this.isDragging = false;
  }

  private onTouchStart(e: TouchEvent): void {
    if (e.touches.length !== 1) return;
    this.isDragging = true;
    const touch = e.touches[0];
    this.lastAngle = this.getAngleFromEvent(touch.clientX, touch.clientY);
    e.preventDefault();
  }

  private onTouchMove(e: TouchEvent): void {
    if (!this.isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    this.handleDrag(touch.clientX, touch.clientY);
    e.preventDefault();
  }

  private onTouchEnd(_e: TouchEvent): void {
    this.isDragging = false;
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.5 : 0.5;
    this.setFrequency(this.currentFrequency + delta);
  }

  private handleDrag(clientX: number, clientY: number): void {
    const currentAngle = this.getAngleFromEvent(clientX, clientY);
    let deltaAngle = currentAngle - this.lastAngle;

    if (deltaAngle > Math.PI) deltaAngle -= 2 * Math.PI;
    if (deltaAngle < -Math.PI) deltaAngle += 2 * Math.PI;

    const angleRange = this.maxAngle - this.minAngle;
    const freqRange = this.maxFrequency - this.minFrequency;
    const deltaFreq = (deltaAngle / angleRange) * freqRange;

    const newFreq = this.currentFrequency + deltaFreq;
    this.setFrequency(newFreq);
    this.lastAngle = currentAngle;
  }

  private frequencyToAngle(freq: number): number {
    const freqRange = this.maxFrequency - this.minFrequency;
    const angleRange = this.maxAngle - this.minAngle;
    const normalized = (freq - this.minFrequency) / freqRange;
    return this.minAngle + normalized * angleRange;
  }

  private draw(): void {
    const ctx = this.ctx;
    const size = Math.min(this.canvas.width / this.pixelRatio, this.canvas.height / this.pixelRatio);
    ctx.clearRect(0, 0, size, size);

    ctx.save();
    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, this.radius + 8, 0, Math.PI * 2);
    const bgGradient = ctx.createRadialGradient(
      this.centerX, this.centerY, this.radius * 0.5,
      this.centerX, this.centerY, this.radius + 8
    );
    bgGradient.addColorStop(0, '#3A3A4A');
    bgGradient.addColorStop(1, '#1A1A2A');
    ctx.fillStyle = bgGradient;
    ctx.fill();
    ctx.strokeStyle = '#2D2D3D';
    ctx.lineWidth = 2;
    ctx.stroke();

    this.drawTickMarks();

    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, this.radius, 0, Math.PI * 2);
    const knobGradient = ctx.createRadialGradient(
      this.centerX - 5, this.centerY - 5, 2,
      this.centerX, this.centerY, this.radius
    );
    knobGradient.addColorStop(0, '#6A6A7A');
    knobGradient.addColorStop(0.7, '#3A3A4A');
    knobGradient.addColorStop(1, '#2A2A3A');
    ctx.fillStyle = knobGradient;
    ctx.fill();
    ctx.strokeStyle = '#1A1A2A';
    ctx.lineWidth = 2;
    ctx.stroke();

    const knobAngle = this.frequencyToAngle(this.currentFrequency);
    const indicatorX = this.centerX + Math.cos(knobAngle) * (this.radius - 6);
    const indicatorY = this.centerY + Math.sin(knobAngle) * (this.radius - 6);

    ctx.beginPath();
    ctx.moveTo(this.centerX, this.centerY);
    ctx.lineTo(indicatorX, indicatorY);
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#F59E0B';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(indicatorX, indicatorY, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#F59E0B';
    ctx.shadowColor = '#F59E0B';
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  private drawTickMarks(): void {
    const ctx = this.ctx;
    const step = 5;
    for (let freq = this.minFrequency; freq <= this.maxFrequency; freq += step) {
      const angle = this.frequencyToAngle(freq);
      const isMajor = freq % 10 === 0;

      const innerR = this.radius + 2;
      const outerR = isMajor ? this.radius + 12 : this.radius + 8;

      const x1 = this.centerX + Math.cos(angle) * innerR;
      const y1 = this.centerY + Math.sin(angle) * innerR;
      const x2 = this.centerX + Math.cos(angle) * outerR;
      const y2 = this.centerY + Math.sin(angle) * outerR;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = isMajor ? '#F59E0B' : '#5A5A6A';
      ctx.lineWidth = isMajor ? 2 : 1;
      ctx.stroke();

      if (isMajor) {
        const labelR = this.radius + 20;
        const lx = this.centerX + Math.cos(angle) * labelR;
        const ly = this.centerY + Math.sin(angle) * labelR;
        ctx.fillStyle = '#a0a0b0';
        ctx.font = '8px Courier New';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(freq), lx, ly);
      }
    }
  }
}
