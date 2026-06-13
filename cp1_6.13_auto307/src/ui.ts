import { TimeState, ResponsiveConfig } from './types';

export class UIManager {
  private panelEl: HTMLDivElement;
  private countEl: HTMLDivElement;
  private timeCanvas: HTMLCanvasElement;
  private timeCtx: CanvasRenderingContext2D;
  private bottomBar: HTMLDivElement;
  private config: ResponsiveConfig;
  private onBottomClick: (x: number, y: number) => void;

  constructor(config: ResponsiveConfig, onBottomClick: (x: number, y: number) => void) {
    this.config = config;
    this.onBottomClick = onBottomClick;

    this.panelEl = document.createElement('div');
    this.panelEl.id = 'info-panel';
    Object.assign(this.panelEl.style, {
      position: 'fixed',
      zIndex: '10',
      pointerEvents: 'none',
      background: 'rgba(0,0,0,0.3)',
      backdropFilter: 'blur(4px)',
      WebkitBackdropFilter: 'blur(4px)',
      borderRadius: '8px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      padding: '8px',
      transition: 'all 0.3s ease',
    });

    this.countEl = document.createElement('div');
    this.countEl.id = 'particle-count';
    Object.assign(this.countEl.style, {
      color: '#e0e0e0',
      fontFamily: 'monospace',
      textAlign: 'center',
      lineHeight: '1.2',
    });
    this.panelEl.appendChild(this.countEl);

    this.timeCanvas = document.createElement('canvas');
    this.timeCanvas.id = 'time-indicator';
    this.panelEl.appendChild(this.timeCanvas);

    this.timeCtx = this.timeCanvas.getContext('2d')!;

    this.bottomBar = document.createElement('div');
    this.bottomBar.id = 'bottom-bar';
    Object.assign(this.bottomBar.style, {
      position: 'fixed',
      bottom: '0',
      left: '0',
      width: '100%',
      height: '30px',
      background: 'rgba(255,255,255,0.08)',
      backdropFilter: 'blur(4px)',
      WebkitBackdropFilter: 'blur(4px)',
      zIndex: '10',
      cursor: 'pointer',
    });

    document.body.appendChild(this.panelEl);
    document.body.appendChild(this.bottomBar);

    this.bottomBar.addEventListener('click', (e) => {
      this.onBottomClick(e.clientX, e.clientY);
    });

    this.applyConfig();
  }

  private applyConfig() {
    const c = this.config;
    if (c.panelPosition === 'top-right') {
      this.panelEl.style.top = '16px';
      this.panelEl.style.right = '16px';
      this.panelEl.style.bottom = 'auto';
      this.panelEl.style.left = 'auto';
      this.panelEl.style.flexDirection = 'column';
    } else {
      this.panelEl.style.top = 'auto';
      this.panelEl.style.right = '16px';
      this.panelEl.style.bottom = '60px';
      this.panelEl.style.left = 'auto';
      this.panelEl.style.flexDirection = 'row';
    }
    this.panelEl.style.width = c.panelWidth + 'px';
    this.panelEl.style.height = c.panelHeight + 'px';

    if (c.panelLayout === 'vertical') {
      this.countEl.style.fontSize = '10px';
      const canvasSize = Math.min(c.panelWidth - 16, c.panelHeight * 0.6);
      this.timeCanvas.width = canvasSize * 2;
      this.timeCanvas.height = canvasSize * 2;
      this.timeCanvas.style.width = canvasSize + 'px';
      this.timeCanvas.style.height = canvasSize + 'px';
    } else {
      this.countEl.style.fontSize = '10px';
      this.countEl.style.whiteSpace = 'nowrap';
      const canvasSize = 28;
      this.timeCanvas.width = canvasSize * 2;
      this.timeCanvas.height = canvasSize * 2;
      this.timeCanvas.style.width = canvasSize + 'px';
      this.timeCanvas.style.height = canvasSize + 'px';
    }
  }

  updateConfig(config: ResponsiveConfig) {
    this.config = config;
    this.applyConfig();
  }

  updateCount(count: number) {
    this.countEl.textContent = String(count);
  }

  renderTimeIndicator(timeState: TimeState) {
    const ctx = this.timeCtx;
    const cw = this.timeCanvas.width;
    const ch = this.timeCanvas.height;
    ctx.clearRect(0, 0, cw, ch);

    const centerX = cw / 2;
    const centerY = ch / 2;
    const outerR = Math.min(cw, ch) * 0.42;
    const innerR = outerR * 0.7;
    const midR = (outerR + innerR) / 2;
    const ringWidth = outerR - innerR;

    const phase = timeState.phase;

    ctx.beginPath();
    ctx.arc(centerX, centerY, outerR, Math.PI, 0, false);
    ctx.arc(centerX, centerY, innerR, 0, Math.PI, true);
    ctx.closePath();

    const bgGrad = ctx.createLinearGradient(centerX - outerR, centerY, centerX + outerR, centerY);
    bgGrad.addColorStop(0, `rgba(${Math.round(timeState.bgTopR)},${Math.round(timeState.bgTopG)},${Math.round(timeState.bgTopB)},0.3)`);
    bgGrad.addColorStop(1, `rgba(${Math.round(timeState.bgBotR)},${Math.round(timeState.bgBotG)},${Math.round(timeState.bgBotB)},0.3)`);
    ctx.fillStyle = bgGrad;
    ctx.fill();

    const segmentCount = 60;
    for (let i = 0; i < segmentCount; i++) {
      const t = i / segmentCount;
      const nextT = (i + 1) / segmentCount;
      const startAngle = Math.PI + t * Math.PI;
      const endAngle = Math.PI + nextT * Math.PI;

      let segR: number, segG: number, segB: number;
      if (t < 0.25) {
        [segR, segG, segB] = lerpRgb3(30, 58, 138, 96, 165, 250, t / 0.25);
      } else if (t < 0.5) {
        [segR, segG, segB] = lerpRgb3(96, 165, 250, 251, 191, 36, (t - 0.25) / 0.25);
      } else if (t < 0.75) {
        [segR, segG, segB] = lerpRgb3(251, 191, 36, 249, 115, 22, (t - 0.5) / 0.25);
      } else {
        [segR, segG, segB] = lerpRgb3(249, 115, 22, 30, 58, 138, (t - 0.75) / 0.25);
      }

      ctx.beginPath();
      ctx.arc(centerX, centerY, outerR, startAngle, endAngle, false);
      ctx.arc(centerX, centerY, innerR, endAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = `rgb(${Math.round(segR)},${Math.round(segG)},${Math.round(segB)})`;
      ctx.fill();
    }

    const dotAngle = Math.PI + phase * Math.PI;
    const dotX = centerX + Math.cos(dotAngle) * midR;
    const dotY = centerY + Math.sin(dotAngle) * midR;
    const dotR = ringWidth * 0.35;

    const glowGrad = ctx.createRadialGradient(dotX, dotY, 0, dotX, dotY, dotR * 3);
    glowGrad.addColorStop(0, timeState.dotColor);
    glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.arc(dotX, dotY, dotR * 3, 0, Math.PI * 2);
    ctx.fillStyle = glowGrad;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(dotX, dotY, dotR, 0, Math.PI * 2);
    ctx.fillStyle = timeState.dotColor;
    ctx.fill();
  }

  isBottomBar(y: number): boolean {
    return y >= window.innerHeight - 30;
  }
}

function lerpRgb3(
  r1: number, g1: number, b1: number,
  r2: number, g2: number, b2: number,
  t: number
): [number, number, number] {
  return [
    r1 + (r2 - r1) * t,
    g1 + (g2 - g1) * t,
    b1 + (b2 - b1) * t,
  ];
}
