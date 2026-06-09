export const DIVINATION_TEXTS: string[] = [
  '星辰指引，好运将至',
  '命运之轮悄然转动',
  '你心中的疑问已有答案',
  '远方的信使正带来消息',
  '月圆之夜，奇迹降临',
  '相信直觉，它不会欺骗你',
  '旧的结束即是新的开始',
  '真爱正在向你走来',
  '隐藏的真相即将显现',
  '勇气是你最强大的武器',
  '耐心等待，花开有时',
  '贵人正在暗中相助',
  '放下执念，方得自在',
  '财富之门已经开启',
  '梦境中藏着重要的启示',
  '今日宜静不宜动',
  '一个意外的惊喜正在路上',
  '信任之人，终将不负所托',
  '迷雾散去，道路清晰',
  '你所期待的，即将实现'
];

const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

type Callback = () => void;

export class UIController {
  private textEl: HTMLElement;
  private btnDivine: HTMLButtonElement;
  private btnReset: HTMLButtonElement;
  private btnScreenshot: HTMLButtonElement;

  private onDivineCb: Callback | null = null;
  private onResetCb: Callback | null = null;
  private onScreenshotCb: Callback | null = null;

  private texts: string[] = [...DIVINATION_TEXTS];
  private rotationTimer: number | null = null;
  private fadeAnim: number | null = null;
  private lastTextIndex: number = -1;

  constructor() {
    this.textEl = document.getElementById('divination-text')!;
    this.btnDivine = document.getElementById('btn-divine') as HTMLButtonElement;
    this.btnReset = document.getElementById('btn-reset') as HTMLButtonElement;
    this.btnScreenshot = document.getElementById('btn-screenshot') as HTMLButtonElement;

    this.btnDivine.addEventListener('click', () => this.onDivineCb?.());
    this.btnReset.addEventListener('click', () => this.onResetCb?.());
    this.btnScreenshot.addEventListener('click', () => this.onScreenshotCb?.());
  }

  public onDivination(cb: Callback): void {
    this.onDivineCb = cb;
  }

  public onReset(cb: Callback): void {
    this.onResetCb = cb;
  }

  public onScreenshot(cb: Callback): void {
    this.onScreenshotCb = cb;
  }

  private pickRandomText(): string {
    if (this.texts.length === 0) this.texts = [...DIVINATION_TEXTS];
    let idx = Math.floor(Math.random() * this.texts.length);
    if (this.texts.length > 1 && idx === this.lastTextIndex) {
      idx = (idx + 1) % this.texts.length;
    }
    this.lastTextIndex = idx;
    return this.texts[idx];
  }

  public setText(text: string, animate: boolean = true): void {
    if (!animate) {
      this.textEl.textContent = text;
      this.textEl.classList.add('visible');
      return;
    }
    this.crossFadeText(text);
  }

  private crossFadeText(newText: string): void {
    if (this.fadeAnim !== null) {
      cancelAnimationFrame(this.fadeAnim);
      this.fadeAnim = null;
    }

    const duration = 1200;
    const start = performance.now();
    const wasVisible = this.textEl.classList.contains('visible');
    const oldText = this.textEl.textContent || '';
    let swapped = !wasVisible;

    const step = (now: number) => {
      const elapsed = now - start;
      const raw = Math.min(elapsed / duration, 1);
      const t = easeInOutCubic(raw);

      if (!swapped && t >= 0.5) {
        this.textEl.textContent = newText;
        swapped = true;
      }

      if (!swapped) {
        const fade = 1 - t * 2;
        this.textEl.style.opacity = String(Math.max(0, fade));
      } else {
        const fade = (t - 0.5) * 2;
        this.textEl.style.opacity = String(Math.min(1, fade));
      }

      if (raw < 1) {
        this.fadeAnim = requestAnimationFrame(step);
      } else {
        this.textEl.style.opacity = '';
        this.textEl.classList.add('visible');
        this.fadeAnim = null;
        void oldText;
      }
    };
    this.fadeAnim = requestAnimationFrame(step);
  }

  public startTextRotation(): void {
    this.stopTextRotation();
    this.setText(this.pickRandomText(), true);
    this.rotationTimer = window.setInterval(() => {
      this.setText(this.pickRandomText(), true);
    }, 5000);
  }

  public stopTextRotation(): void {
    if (this.rotationTimer !== null) {
      clearInterval(this.rotationTimer);
      this.rotationTimer = null;
    }
  }

  public dispose(): void {
    this.stopTextRotation();
    if (this.fadeAnim !== null) cancelAnimationFrame(this.fadeAnim);
    this.btnDivine.removeEventListener('click', () => this.onDivineCb?.());
    this.btnReset.removeEventListener('click', () => this.onResetCb?.());
    this.btnScreenshot.removeEventListener('click', () => this.onScreenshotCb?.());
  }
}

export function saveScreenshot(canvas: HTMLCanvasElement, filename: string = 'magic-crystal-ball.png'): void {
  try {
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error('截图保存失败:', err);
  }
}
