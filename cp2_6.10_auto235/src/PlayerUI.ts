import { GameEngine, GameState } from './GameEngine';
import {
  WATER_CONFIG,
  RARITY_CONFIG,
  CaughtFish,
  FISH_SPECIES,
  FishSpecies,
} from './FishData';

const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 480;

export class PlayerUI {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private engine: GameEngine;
  private expBarFill: HTMLDivElement;
  private expBarText: HTMLDivElement;
  private collectionGrid: HTMLDivElement;
  private waterButtons: NodeListOf<HTMLButtonElement>;
  private collectionPanel: HTMLDivElement;
  private collectionToggle: HTMLButtonElement;
  private collectionVisible: boolean = true;

  constructor(canvas: HTMLCanvasElement, engine: GameEngine) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.engine = engine;

    this.expBarFill = document.querySelector('.experience-bar-fill') as HTMLDivElement;
    this.expBarText = document.querySelector('.experience-text') as HTMLDivElement;
    this.collectionGrid = document.getElementById('collectionGrid') as HTMLDivElement;
    this.waterButtons = document.querySelectorAll('.water-buttons .pixel-btn') as NodeListOf<HTMLButtonElement>;
    this.collectionPanel = document.querySelector('.collection-panel') as HTMLDivElement;
    this.collectionToggle = document.querySelector('.collection-toggle') as HTMLButtonElement;

    this.setupCollectionToggle();
    this.updateCollectionGrid();
    this.updateWaterButtons();
  }

  private setupCollectionToggle(): void {
    this.collectionToggle.addEventListener('click', () => {
      this.collectionVisible = !this.collectionVisible;
      const grid = this.collectionGrid;
      if (this.collectionVisible) {
        grid.style.display = 'grid';
        this.collectionToggle.textContent = '−';
      } else {
        grid.style.display = 'none';
        this.collectionToggle.textContent = '+';
      }
    });
  }

  public render(): void {
    const state = this.engine.state;
    this.ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    this.drawWaterBackground(state);
    this.drawSurfaceWaves(state);
    this.drawRipples(state);
    this.drawFloat(state);
    this.drawFishingRod(state);

    if (state.phase === 'charging') {
      this.drawChargeBar(state);
      this.drawCastPreview(state);
    }

    if (state.phase === 'biting') {
      this.drawExclamationMark(state);
    }

    if (state.phase === 'reeling') {
      this.drawReelingProgress(state);
    }
  }

  private drawWaterBackground(state: GameState): void {
    const waterConfig = WATER_CONFIG[state.water];
    const baseColor = waterConfig.bgColor;

    const gradient = this.ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, this.lightenColor(baseColor, 20));
    gradient.addColorStop(0.3, baseColor);
    gradient.addColorStop(1, this.darkenColor(baseColor, 30));

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    for (let i = 0; i < 8; i++) {
      const y = 100 + i * 50 + Math.sin(state.floatBobPhase + i) * 3;
      this.ctx.fillStyle = `rgba(255, 255, 255, 0.03)`;
      this.ctx.fillRect(0, y, CANVAS_WIDTH, 2);
    }
  }

  private drawSurfaceWaves(state: GameState): void {
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    for (let x = 0; x <= CANVAS_WIDTH; x += 4) {
      const y = 200 + Math.sin(x * 0.03 + state.floatBobPhase * 0.5) * 4;
      if (x === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }
    this.ctx.stroke();

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    this.ctx.beginPath();
    for (let x = 0; x <= CANVAS_WIDTH; x += 4) {
      const y = 220 + Math.sin(x * 0.025 + state.floatBobPhase * 0.3 + 1) * 3;
      if (x === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }
    this.ctx.stroke();
  }

  private drawRipples(state: GameState): void {
    for (const ripple of state.ripples) {
      this.ctx.strokeStyle = `rgba(200, 230, 255, ${ripple.alpha})`;
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
      this.ctx.stroke();

      if (ripple.radius > 15) {
        this.ctx.strokeStyle = `rgba(200, 230, 255, ${ripple.alpha * 0.5})`;
        this.ctx.beginPath();
        this.ctx.arc(ripple.x, ripple.y, ripple.radius * 0.7, 0, Math.PI * 2);
        this.ctx.stroke();
      }
    }
  }

  private drawFloat(state: GameState): void {
    const pos = this.engine.getCurrentFloatPosition();
    const x = pos.x;
    const y = pos.y;

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    this.ctx.beginPath();
    this.ctx.ellipse(x, y + 8, 10, 3, 0, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.save();
    this.ctx.translate(x, y);

    this.ctx.fillStyle = '#ff4444';
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 10, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#ffffff';
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 10, Math.PI * 0.15, Math.PI * 0.85);
    this.ctx.fill();

    this.ctx.fillStyle = '#ff4444';
    this.ctx.fillRect(-2, -10, 4, -8);

    this.ctx.strokeStyle = '#aa0000';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 10, 0, Math.PI * 2);
    this.ctx.stroke();

    this.ctx.restore();
  }

  private drawFishingRod(state: GameState): void {
    const rodStartX = 30;
    const rodStartY = CANVAS_HEIGHT - 40;
    const rodTipX = 80;
    const rodTipY = CANVAS_HEIGHT - 160;

    this.ctx.strokeStyle = '#8b4513';
    this.ctx.lineWidth = 6;
    this.ctx.lineCap = 'round';
    this.ctx.beginPath();
    this.ctx.moveTo(rodStartX, rodStartY);
    this.ctx.lineTo(rodTipX, rodTipY);
    this.ctx.stroke();

    this.ctx.strokeStyle = '#654321';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.moveTo(rodStartX, rodStartY);
    this.ctx.lineTo(rodTipX, rodTipY);
    this.ctx.stroke();

    const floatPos = this.engine.getCurrentFloatPosition();
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(rodTipX, rodTipY);

    if (state.phase === 'casting') {
      const midX = (rodTipX + floatPos.x) / 2;
      const midY = Math.min(rodTipY, floatPos.y) - 30;
      this.ctx.quadraticCurveTo(midX, midY, floatPos.x, floatPos.y);
    } else {
      const sagOffset = state.phase === 'waiting' || state.phase === 'biting' || state.phase === 'reeling' ? 20 : 5;
      const midX = (rodTipX + floatPos.x) / 2;
      const midY = (rodTipY + floatPos.y) / 2 + sagOffset;
      this.ctx.quadraticCurveTo(midX, midY, floatPos.x, floatPos.y);
    }
    this.ctx.stroke();
  }

  private drawChargeBar(state: GameState): void {
    const barWidth = 200;
    const barHeight = 16;
    const barX = CANVAS_WIDTH / 2 - barWidth / 2;
    const barY = CANVAS_HEIGHT - 40;

    this.ctx.fillStyle = '#1a2a2a';
    this.ctx.fillRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);

    this.ctx.fillStyle = '#2a3a3a';
    this.ctx.fillRect(barX, barY, barWidth, barHeight);

    const fillWidth = barWidth * state.chargePower;
    const gradient = this.ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
    gradient.addColorStop(0, '#6bc47f');
    gradient.addColorStop(0.7, '#d4a047');
    gradient.addColorStop(1, '#ff4444');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(barX, barY, fillWidth, barHeight);

    this.ctx.strokeStyle = '#6bc47f';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(barX, barY, barWidth, barHeight);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 12px "Courier New", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('蓄力中...', CANVAS_WIDTH / 2, barY - 8);
  }

  private drawCastPreview(state: GameState): void {
    this.ctx.setLineDash([4, 4]);
    this.ctx.strokeStyle = 'rgba(107, 196, 127, 0.5)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(state.targetFloatX, 280, 15, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
  }

  private drawExclamationMark(state: GameState): void {
    const blinkPeriod = 250;
    const blinkCount = Math.floor(state.exclamationBlinkTimer / blinkPeriod);
    if (blinkCount >= 6) return;
    if (blinkCount % 2 === 1) return;

    const pos = this.engine.getCurrentFloatPosition();
    const x = pos.x;
    const y = pos.y - 35;

    this.ctx.fillStyle = '#ff3333';
    this.ctx.font = 'bold 24px "Courier New", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    this.ctx.shadowColor = '#ff0000';
    this.ctx.shadowBlur = 10;
    this.ctx.fillText('!', x, y);
    this.ctx.shadowBlur = 0;
  }

  private drawReelingProgress(state: GameState): void {
    const barWidth = 30;
    const barHeight = 200;
    const barX = CANVAS_WIDTH - 60;
    const barY = CANVAS_HEIGHT / 2 - barHeight / 2;

    this.ctx.fillStyle = '#1a2a2a';
    this.ctx.fillRect(barX - 3, barY - 3, barWidth + 6, barHeight + 6);

    this.ctx.fillStyle = '#2a3a3a';
    this.ctx.fillRect(barX, barY, barWidth, barHeight);

    const progressRatio = state.reelingProgress / 100;
    const fillHeight = barHeight * progressRatio;
    const fillY = barY + barHeight - fillHeight;

    const gradient = this.ctx.createLinearGradient(0, barY, 0, barY + barHeight);
    gradient.addColorStop(0, '#ff4444');
    gradient.addColorStop(0.3, '#d4a047');
    gradient.addColorStop(1, '#6bc47f');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(barX, fillY, barWidth, fillHeight);

    this.ctx.strokeStyle = '#6bc47f';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(barX, barY, barWidth, barHeight);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 14px "Courier New", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.save();
    this.ctx.translate(barX + barWidth / 2, barY + barHeight / 2);
    this.ctx.rotate(-Math.PI / 2);
    this.ctx.fillText(`收线 ${Math.floor(state.reelingProgress)}%`, 0, 0);
    this.ctx.restore();

    this.ctx.fillStyle = '#ffdd44';
    this.ctx.font = 'bold 12px "Courier New", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('连击空格!', CANVAS_WIDTH / 2, 60);
  }

  public updateHUD(): void {
    const state = this.engine.state;
    const xpPercent = (state.playerXP / state.xpToNext) * 100;
    this.expBarFill.style.width = `${xpPercent}%`;
    this.expBarText.textContent = `Lv.${state.playerLevel}  ${state.playerXP} / ${state.xpToNext} XP`;

    this.updateWaterButtons();
    this.updateCollectionGrid();
  }

  private updateWaterButtons(): void {
    const state = this.engine.state;
    this.waterButtons.forEach((btn) => {
      const water = btn.getAttribute('data-water') as 'river' | 'lake' | 'ocean';
      if (water === state.water) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
      if (water === 'ocean') {
        if (this.engine.canUseOcean()) {
          btn.disabled = false;
          btn.textContent = '海洋';
        } else {
          btn.disabled = true;
          btn.textContent = `海洋 (Lv.5解锁)`;
        }
      }
    });
  }

  public updateCollectionGrid(): void {
    const state = this.engine.state;
    const species = FISH_SPECIES;

    const existingCards = this.collectionGrid.querySelectorAll('.collection-card');
    if (existingCards.length === species.length) {
      existingCards.forEach((card, index) => {
        const sp = species[index];
        const entry = state.collection.get(sp.id);
        if (entry) {
          card.classList.add('unlocked');
          const tooltip = card.querySelector('.card-tooltip') as HTMLElement;
          if (tooltip) {
            tooltip.textContent = `${sp.name} ×${entry.count}`;
          }
        }
      });
      return;
    }

    this.collectionGrid.innerHTML = '';
    species.forEach((sp: FishSpecies) => {
      const entry = state.collection.get(sp.id);
      const card = document.createElement('div');
      card.className = 'collection-card' + (entry ? ' unlocked' : '');

      const icon = document.createElement('div');
      icon.className = 'fish-icon';
      icon.textContent = sp.emoji;
      icon.style.color = sp.color;
      card.appendChild(icon);

      const tooltip = document.createElement('div');
      tooltip.className = 'card-tooltip';
      tooltip.textContent = entry ? `${sp.name} ×${entry.count}` : `${sp.name} (未解锁)`;
      card.appendChild(tooltip);

      this.collectionGrid.appendChild(card);
    });
  }

  public showCatchPopup(fish: CaughtFish): void {
    const species = this.engine.getSpeciesById(fish.speciesId);
    if (!species) return;

    const overlay = document.createElement('div');
    overlay.className = 'overlay';

    const popup = document.createElement('div');
    popup.className = 'catch-popup';

    const title = document.createElement('div');
    title.className = 'popup-title';
    title.textContent = '🎉 钓上了一条鱼！';
    popup.appendChild(title);

    const fishIcon = document.createElement('div');
    fishIcon.style.fontSize = '48px';
    fishIcon.style.marginBottom = '8px';
    fishIcon.textContent = species.emoji;
    fishIcon.style.filter = `drop-shadow(0 0 10px ${species.color})`;
    popup.appendChild(fishIcon);

    const name = document.createElement('div');
    name.className = 'popup-fish-name';
    name.style.color = species.color;
    name.textContent = species.name;
    popup.appendChild(name);

    const rarity = RARITY_CONFIG[species.rarity];
    const rarityTag = document.createElement('div');
    rarityTag.className = `popup-rarity ${rarity.className}`;
    rarityTag.textContent = rarity.label;
    popup.appendChild(rarityTag);

    const weight = document.createElement('div');
    weight.className = 'popup-detail';
    weight.textContent = `重量：${fish.weight.toFixed(1)} kg`;
    popup.appendChild(weight);

    const water = document.createElement('div');
    water.className = 'popup-detail';
    water.textContent = `钓点：${WATER_CONFIG[fish.water].label}`;
    popup.appendChild(water);

    const time = document.createElement('div');
    time.className = 'popup-detail';
    time.textContent = `收获时间：${this.formatTime(fish.caughtAt)}`;
    popup.appendChild(time);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'popup-close';
    closeBtn.textContent = '关闭 (空格)';
    popup.appendChild(closeBtn);

    const closePopup = () => {
      overlay.remove();
      popup.remove();
      this.engine.closePopup();
    };

    closeBtn.addEventListener('click', closePopup);

    const spaceHandler = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        closePopup();
        window.removeEventListener('keydown', spaceHandler);
      }
    };
    window.addEventListener('keydown', spaceHandler);

    document.body.appendChild(overlay);
    document.body.appendChild(popup);
  }

  public showEscapedBubble(): void {
    const bubble = document.createElement('div');
    bubble.className = 'escaped-bubble';
    bubble.textContent = '💨 鱼溜走了...';
    bubble.style.left = '50%';
    bubble.style.top = '45%';
    bubble.style.transform = 'translateX(-50%)';
    document.body.appendChild(bubble);

    setTimeout(() => {
      bubble.remove();
    }, 1500);
  }

  private formatTime(date: Date): string {
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    const s = date.getSeconds().toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  private lightenColor(hex: string, percent: number): string {
    const num = parseInt(hex.slice(1), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, ((num >> 8) & 0x00ff) + amt);
    const B = Math.min(255, (num & 0x0000ff) + amt);
    return `rgb(${R}, ${G}, ${B})`;
  }

  private darkenColor(hex: string, percent: number): string {
    const num = parseInt(hex.slice(1), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, (num >> 16) - amt);
    const G = Math.max(0, ((num >> 8) & 0x00ff) - amt);
    const B = Math.max(0, (num & 0x0000ff) - amt);
    return `rgb(${R}, ${G}, ${B})`;
  }
}
