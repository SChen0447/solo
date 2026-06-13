import gsap from 'gsap';

export interface StoryData {
  title: string;
  content: string;
}

export const stories: StoryData[] = [
  {
    title: '造纸术起源',
    content: '东汉元兴元年，蔡伦改进造纸术，以树皮、麻头、破布、旧渔网为原料，造就轻薄柔韧之纸。自此文籍得以广传，文脉绵延不绝。昔时典籍皆赖竹简缣帛，价高而量重，学人苦之。蔡侯纸出，天下称便，书写之史，由此开新篇。'
  },
  {
    title: '丝路书香',
    content: '汉唐盛世，丝绸之路横贯东西。商旅驼队载丝绸瓷器西行，亦携经卷典籍往返。敦煌石室，藏万卷文书；楼兰古迹，遗千年墨痕。佛典儒籍，沿丝路而传布异域；汉文胡语，因交流而互鉴融合。书之为用，大矣哉！'
  },
  {
    title: '拾遗轶事',
    content: '古籍散佚，历代有之。秦始皇焚书坑儒，典籍遭厄；梁元帝江陵焚书，万卷成灰。然文脉不绝，遗书间出。鲁壁藏书，汉时重现；汲冢竹书，晋代发见。学者孜孜以求，搜遗补缺，使先贤智慧不至湮没。此亦修复之深意也。'
  }
];

export class StoryAnimator {
  private panel: HTMLElement;
  private titleEl: HTMLElement;
  private contentEl: HTMLElement;
  private listenBtn: HTMLElement;
  private soundWave: HTMLElement;

  private isPlaying: boolean = false;
  private audioTimer: number | null = null;

  constructor(
    panel: HTMLElement,
    titleEl: HTMLElement,
    contentEl: HTMLElement,
    listenBtn: HTMLElement,
    soundWave: HTMLElement
  ) {
    this.panel = panel;
    this.titleEl = titleEl;
    this.contentEl = contentEl;
    this.listenBtn = listenBtn;
    this.soundWave = soundWave;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.listenBtn.addEventListener('click', () => {
      this.toggleAudio();
    });
  }

  showStory(stepIndex: number): void {
    const story = stories[stepIndex];
    if (!story) return;

    this.titleEl.textContent = story.title;
    this.contentEl.textContent = story.content;

    gsap.set(this.panel, { x: 100, opacity: 0, visibility: 'visible' });

    gsap.to(this.panel, {
      x: 0,
      opacity: 1,
      duration: 1.2,
      ease: 'power3.out',
      onStart: () => {
        this.panel.classList.add('visible');
      }
    });

    gsap.fromTo(
      this.titleEl,
      { y: -10, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, delay: 0.4, ease: 'power2.out' }
    );

    gsap.fromTo(
      this.contentEl,
      { y: 10, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, delay: 0.6, ease: 'power2.out' }
    );

    gsap.fromTo(
      this.listenBtn,
      { scale: 0, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.5, delay: 1, ease: 'back.out(1.7)' }
    );
  }

  hideStory(): void {
    gsap.to(this.panel, {
      x: 100,
      opacity: 0,
      duration: 0.6,
      ease: 'power2.in',
      onComplete: () => {
        this.panel.classList.remove('visible');
      }
    });
  }

  toggleAudio(): void {
    if (this.isPlaying) {
      this.stopAudio();
    } else {
      this.playAudio();
    }
  }

  playAudio(): void {
    if (this.isPlaying) return;

    this.isPlaying = true;
    this.soundWave.classList.add('playing');

    console.log('播放历史故事解说');

    this.audioTimer = window.setTimeout(() => {
      this.stopAudio();
    }, 5000);
  }

  stopAudio(): void {
    this.isPlaying = false;
    this.soundWave.classList.remove('playing');

    if (this.audioTimer !== null) {
      clearTimeout(this.audioTimer);
      this.audioTimer = null;
    }
  }
}

export class ProgressAnimator {
  private progressFill: HTMLElement;
  private progressLabel: HTMLElement;

  constructor(fillEl: HTMLElement, labelEl: HTMLElement) {
    this.progressFill = fillEl;
    this.progressLabel = labelEl;
  }

  updateProgress(percent: number): void {
    const pct = Math.round(percent * 100);

    gsap.to(this.progressFill, {
      width: `${pct}%`,
      duration: 0.5,
      ease: 'power2.out'
    });

    const currentText = this.progressLabel.textContent || '已完成 0%';
    const currentPct = parseInt(currentText.replace(/[^0-9]/g, '')) || 0;

    const obj = { value: currentPct };
    gsap.to(obj, {
      value: pct,
      duration: 0.5,
      ease: 'power2.out',
      onUpdate: () => {
        this.progressLabel.textContent = `已完成 ${Math.round(obj.value)}%`;
      }
    });
  }
}

export class ParticleSystem {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private particles: Particle[] = [];
  private rafId: number = 0;
  private active: boolean = false;

  constructor(container: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 10;
    `;
    container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this.resize();
  }

  resize(): void {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    if (this.ctx) {
      this.ctx.scale(dpr, dpr);
    }
  }

  spawnParticles(x: number, y: number, count: number = 5): void {
    if (!this.ctx) return;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        size: 2 + Math.random() * 4,
        alpha: 1,
        decay: 0.02 + Math.random() * 0.02,
        gravity: 0.05
      });
    }

    if (!this.active) {
      this.active = true;
      this.startLoop();
    }
  }

  private startLoop(): void {
    const loop = () => {
      this.update();
      this.draw();
      if (this.particles.length > 0) {
        this.rafId = requestAnimationFrame(loop);
      } else {
        this.active = false;
      }
    };
    this.rafId = requestAnimationFrame(loop);
  }

  private update(): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.alpha -= p.decay;
      p.size *= 0.98;

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private draw(): void {
    if (!this.ctx || !this.canvas) return;

    const rect = this.canvas.getBoundingClientRect();
    this.ctx.clearRect(0, 0, rect.width, rect.height);

    this.particles.forEach(p => {
      const gradient = this.ctx!.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
      gradient.addColorStop(0, `rgba(255, 248, 225, ${p.alpha})`);
      gradient.addColorStop(0.5, `rgba(212, 175, 55, ${p.alpha * 0.7})`);
      gradient.addColorStop(1, `rgba(212, 175, 55, 0)`);

      this.ctx!.fillStyle = gradient;
      this.ctx!.beginPath();
      this.ctx!.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
      this.ctx!.fill();
    });
  }

  destroy(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  decay: number;
  gravity: number;
}

export function generatePaperTexture(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const w = rect.width;
  const h = rect.height;

  ctx.fillStyle = '#FAF3E0';
  ctx.fillRect(0, 0, w, h);

  ctx.globalAlpha = 0.3;
  ctx.fillStyle = '#E8D5B7';

  for (let i = 0; i < 2000; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const len = 10 + Math.random() * 60;
    const angle = Math.random() * Math.PI;

    ctx.strokeStyle = `rgba(180, 150, 100, ${0.03 + Math.random() * 0.05})`;
    ctx.lineWidth = 0.5 + Math.random() * 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
    ctx.stroke();
  }

  for (let i = 0; i < 50; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const radius = 20 + Math.random() * 80;

    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, 'rgba(200, 170, 120, 0.06)');
    gradient.addColorStop(1, 'rgba(200, 170, 120, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  ctx.globalAlpha = 1;
}
