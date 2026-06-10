export interface ColorPair {
  from: string;
  to: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
}

const NOTE_WIDTH = 140;
const NOTE_HEIGHT = 160;
const BORDER_RADIUS = 16;
const BORDER_WIDTH = 3;
const PARTICLE_COUNT = 40;

const COLOR_PAIRS: ColorPair[] = [
  { from: '#ff8844', to: '#ffdd88' },
  { from: '#44aaff', to: '#88ddff' },
  { from: '#cc66ff', to: '#ff88dd' },
  { from: '#44dd88', to: '#88ffbb' },
  { from: '#ff4466', to: '#ffaacc' },
];

function getRandomColorPair(): ColorPair {
  return COLOR_PAIRS[Math.floor(Math.random() * COLOR_PAIRS.length)];
}

function easeOutBounce(t: number): number {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (t < 1 / d1) {
    return n1 * t * t;
  } else if (t < 2 / d1) {
    return n1 * (t -= 1.5 / d1) * t + 0.75;
  } else if (t < 2.5 / d1) {
    return n1 * (t -= 2.25 / d1) * t + 0.9375;
  } else {
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  }
}

class NoteItem extends HTMLElement {
  static get observedAttributes() {
    return ['data-id', 'data-text', 'data-color-from', 'data-color-to', 'data-text-color', 'data-rotation', 'data-floating-offset'];
  }

  private shadow!: ShadowRoot;
  private containerEl!: HTMLDivElement;
  private noteEl!: HTMLDivElement;
  private textEl!: HTMLDivElement;
  private canvasEl!: HTMLCanvasElement;

  private startTime = 0;
  private floatPhase = 0;
  private floatPeriod = 3;
  private floatAmplitude = 3;
  private rotationSpeed = 0.3;
  private rotationBase = 0;
  private hovered = false;
  private dragging = false;
  private dissolving = false;
  private dissolveProgress = 0;
  private particles: Particle[] = [];
  private breathingPhase = Math.random() * Math.PI * 2;

  private animId = 0;
  private created: () => void = () => {};
  private destroyed: () => void = () => {};
  private onCreatedResolved = false;

  connectedCallback() {
    if (this.shadow) return;
    this.shadow = this.attachShadow({ mode: 'open' });
    this.render();
    this.bindEvents();
    this.startAnimationLoop();
    this.triggerEntryAnimation();
  }

  disconnectedCallback() {
    this.stopAnimationLoop();
    this.destroyed();
  }

  attributeChangedCallback(name: string, _old: string, value: string) {
    if (!this.shadow) return;
    if (name === 'data-text') {
      this.renderText(value);
    } else if (name === 'data-color-from' || name === 'data-color-to') {
      this.updateGradient();
    } else if (name === 'data-text-color') {
      this.textEl.style.color = value || '#eee';
    } else if (name === 'data-rotation') {
      this.rotationBase = parseFloat(value) || 0;
    } else if (name === 'data-floating-offset') {
      this.floatPhase = parseFloat(value) || 0;
    }
  }

  get noteId(): string {
    return this.getAttribute('data-id') || '';
  }

  get text(): string {
    return this.getAttribute('data-text') || '';
  }

  get colorPair(): ColorPair {
    return {
      from: this.getAttribute('data-color-from') || '#ff8844',
      to: this.getAttribute('data-color-to') || '#ffdd88',
    };
  }

  get textColor(): string {
    return this.getAttribute('data-text-color') || '#eee';
  }

  set textColor(color: string) {
    this.setAttribute('data-text-color', color);
  }

  setColorPair(pair: ColorPair) {
    this.setAttribute('data-color-from', pair.from);
    this.setAttribute('data-color-to', pair.to);
  }

  triggerDissolve() {
    if (this.dissolving) return;
    this.dissolving = true;
    this.dissolveProgress = 0;
    this.spawnParticles();
  }

  onCreated(cb: () => void) {
    this.created = cb;
    if (this.onCreatedResolved) cb();
  }

  onDestroyed(cb: () => void) {
    this.destroyed = cb;
  }

  private render() {
    const cp = this.colorPair;
    const textColor = this.textColor;
    const rotation = parseFloat(this.getAttribute('data-rotation') || '0');
    const floatOffset = parseFloat(this.getAttribute('data-floating-offset') || '0');
    this.rotationBase = rotation;
    this.floatPhase = floatOffset;
    this.floatPeriod = 2 + Math.random() * 2;
    this.rotationSpeed = (Math.random() > 0.5 ? 1 : -1) * 0.3;

    const style = `
      :host {
        display: block;
        position: absolute;
        width: ${NOTE_WIDTH}px;
        height: ${NOTE_HEIGHT}px;
        transform-origin: center center;
        user-select: none;
        cursor: grab;
      }
      :host(.dragging) {
        cursor: grabbing;
        z-index: 9999;
      }
      .container {
        position: relative;
        width: 100%;
        height: 100%;
      }
      .note {
        position: absolute;
        inset: 0;
        border-radius: ${BORDER_RADIUS}px;
        background: rgba(0, 0, 0, 0.33);
        box-shadow: 0 0 2px ${cp.from}, 0 0 6px ${cp.to};
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        overflow: hidden;
      }
      .note::before {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: ${BORDER_RADIUS}px;
        padding: ${BORDER_WIDTH}px;
        background: linear-gradient(135deg, ${cp.from}, ${cp.to});
        -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
        mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
        -webkit-mask-composite: xor;
        mask-composite: exclude;
        pointer-events: none;
      }
      :host(:hover) .note,
      :host(.dragging) .note {
        transform: scale(1.05);
        box-shadow: 0 0 6px ${cp.from}, 0 0 16px ${cp.to};
      }
      :host(.dragging) .note {
        transform: scale(1.15);
        box-shadow: 0 0 10px ${cp.from}, 0 0 30px ${cp.to};
      }
      .text {
        position: absolute;
        inset: 18px 14px;
        color: ${textColor};
        font-size: 14px;
        line-height: 1.6;
        font-family: 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif;
        white-space: pre-wrap;
        word-break: break-word;
        overflow: hidden;
        text-shadow: 0 0 4px rgba(255,255,255,0.3);
      }
      canvas.particles {
        position: absolute;
        top: 0;
        left: 0;
        width: ${NOTE_WIDTH}px;
        height: ${NOTE_HEIGHT}px;
        pointer-events: none;
        border-radius: ${BORDER_RADIUS}px;
      }
    `;

    this.shadow.innerHTML = `
      <style>${style}</style>
      <div class="container">
        <div class="note">
          <div class="text"></div>
        </div>
        <canvas class="particles" width="${NOTE_WIDTH}" height="${NOTE_HEIGHT}"></canvas>
      </div>
    `;

    this.containerEl = this.shadow.querySelector('.container') as HTMLDivElement;
    this.noteEl = this.shadow.querySelector('.note') as HTMLDivElement;
    this.textEl = this.shadow.querySelector('.text') as HTMLDivElement;
    this.canvasEl = this.shadow.querySelector('canvas.particles') as HTMLCanvasElement;

    this.renderText(this.text);
  }

  private renderText(text: string) {
    this.textEl.textContent = text;
    this.adjustFontSize();
  }

  private adjustFontSize() {
    let size = 14;
    this.textEl.style.fontSize = size + 'px';
    const maxAttempts = 8;
    let attempts = 0;
    while (attempts < maxAttempts && this.textEl.scrollHeight > this.textEl.clientHeight && size > 10) {
      size -= 0.5;
      this.textEl.style.fontSize = size + 'px';
      attempts++;
    }
  }

  private updateGradient() {
    const cp = this.colorPair;
    const style = this.shadow.querySelector('style');
    if (!style) return;
    const beforeStyle = `.note::before { content: ''; position: absolute; inset: 0; border-radius: ${BORDER_RADIUS}px; padding: ${BORDER_WIDTH}px; background: linear-gradient(135deg, ${cp.from}, ${cp.to}); -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0); mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0); -webkit-mask-composite: xor; mask-composite: exclude; pointer-events: none; }`;
    const hoverStyle = `:host(:hover) .note, :host(.dragging) .note { transform: scale(1.05); box-shadow: 0 0 6px ${cp.from}, 0 0 16px ${cp.to}; }`;
    const dragStyle = `:host(.dragging) .note { transform: scale(1.15); box-shadow: 0 0 10px ${cp.from}, 0 0 30px ${cp.to}; }`;
    const boxStyle = `.note { position: absolute; inset: 0; border-radius: ${BORDER_RADIUS}px; background: rgba(0, 0, 0, 0.33); box-shadow: 0 0 2px ${cp.from}, 0 0 6px ${cp.to}; transition: transform 0.2s ease, box-shadow 0.2s ease; overflow: hidden; }`;

    const css = style.textContent || '';
    const newCss = css
      .replace(/\.note \{[\s\S]*?\}/, boxStyle)
      .replace(/\.note::before \{[\s\S]*?\}/, beforeStyle)
      .replace(/:host\(:hover\) \.note,\s*:host\(\.dragging\) \.note \{[\s\S]*?\}/, hoverStyle)
      .replace(/:host\(\.dragging\) \.note \{[\s\S]*?\}/, dragStyle);
    style.textContent = newCss;
  }

  private bindEvents() {
    let startX = 0;
    let startY = 0;
    let origX = 0;
    let origY = 0;
    let moved = false;
    const DRAG_THRESHOLD = 5;

    const onMouseDown = (e: MouseEvent) => {
      e.stopPropagation();
      if (this.dissolving) return;
      this.dragging = true;
      this.classList.add('dragging');
      startX = e.clientX;
      startY = e.clientY;
      const rect = this.getBoundingClientRect();
      origX = rect.left;
      origY = rect.top;
      moved = false;
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      this.dispatchEvent(new CustomEvent('note-drag-start', {
        bubbles: true,
        composed: true,
        detail: { id: this.noteId }
      }));
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!this.dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
        moved = true;
      }
      this.dispatchEvent(new CustomEvent('note-drag-move', {
        bubbles: true,
        composed: true,
        detail: {
          id: this.noteId,
          x: origX + dx,
          y: origY + dy
        }
      }));
    };

    const onMouseUp = (e: MouseEvent) => {
      if (!this.dragging) return;
      this.dragging = false;
      this.classList.remove('dragging');
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      if (!moved) {
        this.dispatchEvent(new CustomEvent('note-click', {
          bubbles: true,
          composed: true,
          detail: {
            id: this.noteId,
            clientX: e.clientX,
            clientY: e.clientY
          }
        }));
      } else {
        this.dispatchEvent(new CustomEvent('note-drag-end', {
          bubbles: true,
          composed: true,
          detail: { id: this.noteId }
        }));
      }
    };

    this.addEventListener('mousedown', onMouseDown);
    this.addEventListener('mouseenter', () => {
      this.hovered = true;
    });
    this.addEventListener('mouseleave', () => {
      this.hovered = false;
    });
  }

  private triggerEntryAnimation() {
    this.startTime = performance.now();
    const duration = 600;
    const animate = () => {
      const elapsed = performance.now() - this.startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = easeOutBounce(t);
      const scale = 0.5 + 0.5 * eased;
      this.containerEl.style.transform = `scale(${scale})`;
      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        this.containerEl.style.transform = '';
        this.onCreatedResolved = true;
        this.created();
      }
    };
    requestAnimationFrame(animate);
  }

  private spawnParticles() {
    this.particles = [];
    const colors = [this.colorPair.from, this.colorPair.to, '#ffffff'];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      this.particles.push({
        x: NOTE_WIDTH / 2 + (Math.random() - 0.5) * NOTE_WIDTH * 0.6,
        y: NOTE_HEIGHT / 2 + (Math.random() - 0.5) * NOTE_HEIGHT * 0.6,
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.5) * 3 - 1,
        size: 2 + Math.random() * 3,
        alpha: 0.8 + Math.random() * 0.2,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
  }

  private startAnimationLoop() {
    const tick = () => {
      this.animId = requestAnimationFrame(tick);
      const now = performance.now();
      if (!this.dissolving) {
        this.floatPhase += (1 / 60) / this.floatPeriod * Math.PI * 2;
        const floatY = Math.sin(this.floatPhase) * this.floatAmplitude;
        const rot = this.rotationBase + Math.sin(now / 5000) * this.rotationSpeed;
        const breathe = 0.7 + 0.3 * (0.5 + 0.5 * Math.sin(now / 1000 + this.breathingPhase));
        this.textEl.style.textShadow = `0 0 ${4 * breathe}px rgba(255,255,255,${0.3 * breathe})`;
        if (!this.dragging && !this.hovered) {
          this.containerEl.style.transform = `translateY(${floatY}px) rotate(${rot}deg)`;
        } else if (this.hovered && !this.dragging) {
          this.containerEl.style.transform = `rotate(${rot}deg)`;
        } else {
          this.containerEl.style.transform = ``;
        }
      } else {
        this.dissolveProgress += 1 / 90;
        this.noteEl.style.opacity = String(Math.max(0, 1 - this.dissolveProgress * 1.2));
        this.textEl.style.opacity = String(Math.max(0, 1 - this.dissolveProgress * 1.2));
        const ctx = this.canvasEl.getContext('2d')!;
        ctx.clearRect(0, 0, NOTE_WIDTH, NOTE_HEIGHT);
        for (const p of this.particles) {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.05;
          p.alpha = Math.max(0, p.alpha - 0.015);
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        if (this.dissolveProgress >= 1) {
          this.dispatchEvent(new CustomEvent('note-delete', {
            bubbles: true,
            composed: true,
            detail: { id: this.noteId }
          }));
          this.stopAnimationLoop();
          return;
        }
      }
    };
    this.animId = requestAnimationFrame(tick);
  }

  private stopAnimationLoop() {
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = 0;
    }
  }
}

customElements.define('x-note-item', NoteItem);

export { NoteItem, getRandomColorPair };
