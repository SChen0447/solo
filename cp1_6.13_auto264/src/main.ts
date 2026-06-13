import { Rune } from './rune';
import { ParticleSystem, averageColor, triggerRuneBurst, triggerMatrixDissolve } from './particles';
import { LEVELS, ROMAN_NUMERALS, RuneCombination, LevelData } from './data';

declare const gsap: typeof import('gsap').gsap;

class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  dpr: number;

  runes: Rune[];
  gridRows: number;
  gridCols: number;
  runeSize: number;
  runeSpacing: number;

  selectedRunes: Rune[];
  maxSelected: number;

  particleSystem: ParticleSystem;
  levels: LevelData[];
  currentLevelIndex: number;
  levelTransitioning: boolean;

  lastTime: number;
  animationId: number;

  progressDots: HTMLElement;
  levelLabel: HTMLElement;
  spellText: HTMLElement;
  screenFlash: HTMLElement;

  ribbonAnimations: Array<{
    from: Rune;
    to: Rune;
    color: string;
    startTime: number;
    phase: number;
  }>;

  matrixFadeAlpha: number;
  targetFadeAlpha: number;

  hoveredRune: Rune | null;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;

    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.runes = [];
    this.gridRows = 5;
    this.gridCols = 5;
    this.runeSize = 40;
    this.runeSpacing = 120;

    this.selectedRunes = [];
    this.maxSelected = 3;

    this.particleSystem = new ParticleSystem();
    this.levels = JSON.parse(JSON.stringify(LEVELS)) as LevelData[];
    this.currentLevelIndex = 0;
    this.levelTransitioning = false;

    this.lastTime = performance.now();
    this.animationId = 0;

    this.progressDots = document.getElementById('progressDots') as HTMLElement;
    this.levelLabel = document.getElementById('levelLabel') as HTMLElement;
    this.spellText = document.getElementById('spellText') as HTMLElement;
    this.screenFlash = document.getElementById('screenFlash') as HTMLElement;

    this.ribbonAnimations = [];
    this.matrixFadeAlpha = 1;
    this.targetFadeAlpha = 1;
    this.hoveredRune = null;

    this.init();
  }

  init(): void {
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('click', (e) => this.onClick(e));
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (e.touches.length > 0) {
        const t = e.touches[0];
        this.onMouseMove({ clientX: t.clientX, clientY: t.clientY } as MouseEvent);
        this.onClick({ clientX: t.clientX, clientY: t.clientY } as MouseEvent);
      }
    }, { passive: false });
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (e.touches.length > 0) {
        const t = e.touches[0];
        this.onMouseMove({ clientX: t.clientX, clientY: t.clientY } as MouseEvent);
      }
    }, { passive: false });

    this.generateRunes();
    this.updateProgressUI();
    this.loop();
  }

  resize(): void {
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    if (this.width > 1024) {
      this.runeSpacing = 120;
      this.runeSize = 40;
      this.gridRows = 5;
      this.gridCols = 5;
    } else if (this.width >= 768) {
      this.runeSpacing = 90;
      this.runeSize = 32;
      this.gridRows = 5;
      this.gridCols = 5;
    } else {
      this.runeSpacing = 68;
      this.runeSize = 30;
      this.gridRows = 5;
      this.gridCols = 5;
    }

    this.layoutRunes();
  }

  layoutRunes(): void {
    const totalW = (this.gridCols - 1) * this.runeSpacing;
    const totalH = (this.gridRows - 1) * this.runeSpacing;
    const offsetX = this.width / 2 - totalW / 2;
    const offsetY = 60 + this.runeSpacing * 2;

    for (const rune of this.runes) {
      const x = offsetX + rune.col * this.runeSpacing;
      const y = offsetY + rune.row * this.runeSpacing;
      rune.setPosition(x, y, this.runeSize);
    }
  }

  generateRunes(): void {
    this.runes = [];
    for (let r = 0; r < this.gridRows; r++) {
      for (let c = 0; c < this.gridCols; c++) {
        const rune = new Rune(r, c, 0, 0, this.runeSize);
        this.runes.push(rune);
      }
    }
    this.layoutRunes();
  }

  onMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    let foundHover: Rune | null = null;
    for (const rune of this.runes) {
      if (rune.containsPoint(px, py)) {
        foundHover = rune;
        break;
      }
    }

    if (foundHover !== this.hoveredRune) {
      if (this.hoveredRune) {
        this.hoveredRune.state.isHovered = false;
      }
      if (foundHover && !foundHover.state.isUsed) {
        foundHover.state.isHovered = true;
        foundHover.playHoverSound();
      }
      this.hoveredRune = foundHover;
      this.canvas.style.cursor = foundHover && !foundHover.state.isUsed ? 'pointer' : 'default';
    }
  }

  onClick(e: MouseEvent): void {
    if (this.levelTransitioning) return;

    const rect = this.canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const now = performance.now();

    let clicked: Rune | null = null;
    for (const rune of this.runes) {
      if (rune.containsPoint(px, py)) {
        clicked = rune;
        break;
      }
    }

    if (!clicked) return;

    if (clicked.state.isUsed) {
      this.showErrorMark(clicked, now);
      return;
    }

    if (this.selectedRunes.includes(clicked)) {
      const idx = this.selectedRunes.indexOf(clicked);
      for (let i = idx; i < this.selectedRunes.length; i++) {
        this.selectedRunes[i].state.isSelected = false;
      }
      this.selectedRunes.splice(idx);
      return;
    }

    if (this.selectedRunes.length > 0) {
      const last = this.selectedRunes[this.selectedRunes.length - 1];
      if (!last.isAdjacentTo(clicked)) {
        clicked.triggerError(now);
        this.showErrorMark(clicked, now);
        return;
      }
    }

    if (this.selectedRunes.length >= this.maxSelected) {
      return;
    }

    clicked.state.isSelected = true;
    clicked.triggerWave(now);
    this.particleSystem.spawnBurst(clicked.x, clicked.y, clicked.originalColor, 12);
    this.selectedRunes.push(clicked);

    if (this.selectedRunes.length === this.maxSelected) {
      this.checkCombination();
    }
  }

  showErrorMark(rune: Rune, now: number): void {
    rune.triggerError(now);
    const mark = document.createElement('div');
    mark.className = 'error-mark';
    mark.textContent = '✕';
    mark.style.left = (rune.x - 12) + 'px';
    mark.style.top = (rune.y + this.runeSize) + 'px';
    document.getElementById('app')!.appendChild(mark);

    if (typeof gsap !== 'undefined') {
      gsap.fromTo(mark,
        { opacity: 0, y: 0, scale: 0.5 },
        { opacity: 1, y: -10, scale: 1.2, duration: 0.15, ease: 'power2.out' }
      );
      gsap.to(mark, {
        opacity: 0,
        y: -30,
        scale: 0.8,
        duration: 0.35,
        delay: 0.15,
        ease: 'power2.in',
        onComplete: () => mark.remove()
      });
    } else {
      mark.style.opacity = '1';
      setTimeout(() => { mark.remove(); }, 500);
    }
  }

  checkCombination(): void {
    const selected = [...this.selectedRunes];
    const selectedPositions = selected.map(r => [r.row, r.col] as [number, number]);
    const currentLevel = this.levels[this.currentLevelIndex];

    let matched: RuneCombination | null = null;
    for (const combo of currentLevel.combinations) {
      if (combo.completed) continue;
      if (this.positionsMatch(combo.positions, selectedPositions)) {
        matched = combo;
        break;
      }
    }

    if (matched) {
      matched.completed = true;
      this.onCombinationSuccess(selected, matched);
    } else {
      this.onCombinationFail(selected);
    }
  }

  positionsMatch(a: [number, number][], b: [number, number][]): boolean {
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort((x, y) => x[0] * 100 + x[1] - (y[0] * 100 + y[1]));
    const sortedB = [...b].sort((x, y) => x[0] * 100 + x[1] - (y[0] * 100 + y[1]));
    for (let i = 0; i < sortedA.length; i++) {
      if (sortedA[i][0] !== sortedB[i][0] || sortedA[i][1] !== sortedB[i][1]) return false;
    }
    return true;
  }

  onCombinationSuccess(runes: Rune[], combo: RuneCombination): void {
    const now = performance.now();
    runes.forEach(r => {
      r.state.isUsed = true;
      r.state.isSelected = false;
    });
    this.selectedRunes = [];

    triggerRuneBurst(this.particleSystem, runes);
    this.triggerScreenFlash();
    this.showSpellText(combo.spell);

    const avgColor = averageColor(runes.map(r => r.originalColor));
    for (let i = 0; i < runes.length - 1; i++) {
      this.ribbonAnimations.push({
        from: runes[i],
        to: runes[i + 1],
        color: avgColor,
        startTime: now + i * 500,
        phase: i * 0.3
      });
      setTimeout(() => {
        this.particleSystem.spawnRibbon(
          runes[i].x, runes[i].y,
          runes[i + 1].x, runes[i + 1].y,
          avgColor, 30, i * 0.2
        );
      }, i * 500);
    }

    this.updateProgressUI();

    setTimeout(() => {
      this.checkLevelComplete();
    }, 1500);
  }

  onCombinationFail(runes: Rune[]): void {
    runes.forEach(r => {
      r.state.isSelected = false;
      r.state.whiteFlash = 0;
      r.whiteFlashStartTime = 0;
    });
    this.selectedRunes = [];
  }

  checkLevelComplete(): void {
    const level = this.levels[this.currentLevelIndex];
    const allDone = level.combinations.every(c => c.completed);
    if (allDone && !this.levelTransitioning) {
      this.advanceLevel();
    }
  }

  advanceLevel(): void {
    this.levelTransitioning = true;
    triggerMatrixDissolve(this.particleSystem, this.runes);

    if (typeof gsap !== 'undefined') {
      gsap.to(this, {
        matrixFadeAlpha: 0,
        duration: 1.8,
        ease: 'power2.inOut',
        delay: 0.5
      });
    }
    this.targetFadeAlpha = 0;

    setTimeout(() => {
      if (this.currentLevelIndex < this.levels.length - 1) {
        this.currentLevelIndex++;
      } else {
        this.levels = JSON.parse(JSON.stringify(LEVELS)) as LevelData[];
        this.currentLevelIndex = 0;
      }
      this.generateRunes();
      this.selectedRunes = [];
      this.ribbonAnimations = [];
      this.updateProgressUI();

      if (typeof gsap !== 'undefined') {
        gsap.to(this, {
          matrixFadeAlpha: 1,
          duration: 1.2,
          ease: 'power2.out',
          delay: 0.3,
          onComplete: () => { this.levelTransitioning = false; }
        });
      } else {
        this.matrixFadeAlpha = 1;
        this.levelTransitioning = false;
      }
      this.targetFadeAlpha = 1;
    }, 2500);
  }

  triggerScreenFlash(): void {
    if (typeof gsap !== 'undefined') {
      gsap.fromTo(this.screenFlash,
        { opacity: 0 },
        { opacity: 1, duration: 0.1, ease: 'power2.out' }
      );
      gsap.to(this.screenFlash, {
        opacity: 0,
        duration: 0.2,
        delay: 0.1,
        ease: 'power2.in'
      });
    } else {
      this.screenFlash.style.opacity = '1';
      setTimeout(() => { this.screenFlash.style.opacity = '0'; }, 300);
    }
  }

  showSpellText(text: string): void {
    this.spellText.textContent = text;
    if (typeof gsap !== 'undefined') {
      gsap.fromTo(this.spellText,
        { opacity: 0, scale: 0.7, y: 20 },
        { opacity: 1, scale: 1, y: 0, duration: 0.4, ease: 'back.out(1.5)' }
      );
      gsap.to(this.spellText, {
        opacity: 0,
        scale: 1.1,
        y: -20,
        duration: 0.6,
        delay: 2.0,
        ease: 'power2.in'
      });
    } else {
      this.spellText.style.opacity = '1';
      setTimeout(() => { this.spellText.style.opacity = '0'; }, 2500);
    }
  }

  updateProgressUI(): void {
    const level = this.levels[this.currentLevelIndex];
    this.levelLabel.textContent = `关卡 ${ROMAN_NUMERALS[level.id - 1] || level.id}`;

    this.progressDots.innerHTML = '';
    for (const combo of level.combinations) {
      const dot = document.createElement('div');
      dot.className = 'progress-dot' + (combo.completed ? ' completed' : '');
      this.progressDots.appendChild(dot);
    }
  }

  drawBackground(ctx: CanvasRenderingContext2D): void {
    ctx.clearRect(0, 0, this.width, this.height);

    const stars = 80;
    const t = performance.now() * 0.0003;
    ctx.save();
    for (let i = 0; i < stars; i++) {
      const sx = ((i * 97.13) % this.width);
      const sy = ((i * 53.77) % this.height);
      const twinkle = 0.3 + Math.sin(t * 5 + i) * 0.3 + 0.2;
      ctx.globalAlpha = twinkle * 0.5;
      ctx.fillStyle = '#ffffff';
      const size = (i % 3) * 0.5 + 0.5;
      ctx.beginPath();
      ctx.arc(sx, sy, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    const totalW = (this.gridCols - 1) * this.runeSpacing;
    const totalH = (this.gridRows - 1) * this.runeSpacing;
    const cx = this.width / 2;
    const cy = 60 + this.runeSpacing * 2 + totalH / 2;
    const maxDim = Math.max(totalW, totalH) * 1.1;

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxDim);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  updateRibbons(now: number): void {
    for (let i = this.ribbonAnimations.length - 1; i >= 0; i--) {
      const r = this.ribbonAnimations[i];
      const elapsed = (now - r.startTime) / 1000;
      if (elapsed > 2.0) {
        this.ribbonAnimations.splice(i, 1);
      }
    }
  }

  drawRibbons(ctx: CanvasRenderingContext2D, now: number): void {
    for (const r of this.ribbonAnimations) {
      const elapsed = (now - r.startTime) / 1000;
      if (elapsed < 0 || elapsed > 1.5) continue;
      const progress = Math.min(1, elapsed / 1.0);
      const alpha = progress < 0.15
        ? progress / 0.15
        : progress > 0.85
          ? (1 - progress) / 0.15
          : 1;

      const dx = r.to.x - r.from.x;
      const dy = r.to.y - r.from.y;

      ctx.save();
      ctx.globalAlpha = alpha * 0.8;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 3 + Math.sin(now * 0.01) * 1;
      ctx.shadowColor = r.color;
      ctx.shadowBlur = 20;
      ctx.lineCap = 'round';

      const endProgress = Math.min(1, progress * 1.5);
      ctx.beginPath();
      ctx.moveTo(r.from.x, r.from.y);

      const steps = 12;
      for (let s = 1; s <= steps; s++) {
        const t = (s / steps) * endProgress;
        const px = r.from.x + dx * t;
        const py = r.from.y + dy * t;
        const wobble = Math.sin(now * 0.008 + t * 6) * 4;
        const perpX = -dy / Math.sqrt(dx * dx + dy * dy) * wobble;
        const perpY = dx / Math.sqrt(dx * dx + dy * dy) * wobble;
        ctx.lineTo(px + perpX, py + perpY);
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  loop = (): void => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;

    this.particleSystem.update(dt);
    this.updateRibbons(now);

    this.drawBackground(this.ctx);

    this.ctx.save();
    this.ctx.globalAlpha = this.matrixFadeAlpha;

    for (const rune of this.runes) {
      rune.draw(this.ctx, now);
    }

    this.drawRibbons(this.ctx, now);
    this.particleSystem.draw(this.ctx);

    this.ctx.restore();

    this.animationId = requestAnimationFrame(this.loop);
  };
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
