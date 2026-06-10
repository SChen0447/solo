import { Tower, TowerType, TOWER_CONFIGS, TOWER_NAMES } from './tower';

export interface UIEvents {
  onHexClick: (q: number, r: number) => void;
  onTowerSelect: (tower: Tower | null) => void;
  onTowerDeploy: (type: TowerType) => void;
  onTowerUpgrade: (towerId: number) => void;
  onMouseMove: (x: number, y: number) => void;
}

export class UIManager {
  private waveValue: HTMLElement;
  private energyValue: HTMLElement;
  private killsValue: HTMLElement;
  private towerMenu: HTMLElement;
  private towerTooltip: HTMLElement;
  private waveAnnouncement: HTMLElement;
  private canvas: HTMLCanvasElement;
  private events: UIEvents;

  private selectedHex: { q: number; r: number } | null = null;

  constructor(canvas: HTMLCanvasElement, events: UIEvents) {
    this.canvas = canvas;
    this.events = events;

    this.waveValue = document.getElementById('wave-value')!;
    this.energyValue = document.getElementById('energy-value')!;
    this.killsValue = document.getElementById('kills-value')!;
    this.towerMenu = document.getElementById('tower-menu')!;
    this.towerTooltip = document.getElementById('tower-tooltip')!;
    this.waveAnnouncement = document.getElementById('wave-announcement')!;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
      const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
      this.events.onMouseMove(x, y);
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
      const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
      this.events.onMouseMove(x, y);
    });

    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.hideTowerMenu();
      this.hideTowerTooltip();
      this.events.onTowerSelect(null);
    });

    const options = this.towerMenu.querySelectorAll('.tower-option');
    options.forEach((opt) => {
      opt.addEventListener('click', (e) => {
        e.stopPropagation();
        const type = (opt as HTMLElement).dataset.type as TowerType;
        if (type && !(opt as HTMLElement).classList.contains('disabled')) {
          this.events.onTowerDeploy(type);
          this.hideTowerMenu();
        }
      });
    });

    document.addEventListener('click', (e) => {
      if (!this.towerMenu.contains(e.target as Node) && e.target !== this.canvas) {
        this.hideTowerMenu();
      }
    });
  }

  updateStats(wave: number, energy: number, kills: number): void {
    this.waveValue.textContent = String(wave);
    this.energyValue.textContent = String(energy);
    this.killsValue.textContent = String(kills);
  }

  showTowerMenu(screenX: number, screenY: number, energy: number): void {
    const options = this.towerMenu.querySelectorAll('.tower-option');
    options.forEach((opt) => {
      const type = (opt as HTMLElement).dataset.type as TowerType;
      const cost = TOWER_CONFIGS[type].baseCost;
      if (energy < cost) {
        (opt as HTMLElement).classList.add('disabled');
      } else {
        (opt as HTMLElement).classList.remove('disabled');
      }
    });

    this.towerMenu.style.display = 'block';

    const menuRect = this.towerMenu.getBoundingClientRect();
    let left = screenX;
    let top = screenY;

    if (left + menuRect.width > window.innerWidth) {
      left = window.innerWidth - menuRect.width - 10;
    }
    if (top + menuRect.height > window.innerHeight) {
      top = window.innerHeight - menuRect.height - 10;
    }

    this.towerMenu.style.left = left + 'px';
    this.towerMenu.style.top = top + 'px';
  }

  hideTowerMenu(): void {
    this.towerMenu.style.display = 'none';
    this.selectedHex = null;
  }

  showTowerTooltip(tower: Tower, screenX: number, screenY: number, energy: number): void {
    const cfg = tower.config;
    const upgradeCost = tower.getUpgradeCost();
    const canUpgrade = tower.canUpgrade() && energy >= upgradeCost;

    let upgradeHtml = '';
    if (tower.canUpgrade()) {
      upgradeHtml = `<div class="tooltip-upgrade ${canUpgrade ? '' : 'disabled'}" data-tower-id="${tower.id}">
        升级 Lv.${tower.level + 1} (${upgradeCost} 能量)
      </div>`;
    } else {
      upgradeHtml = `<div class="tooltip-upgrade maxed">已满级</div>`;
    }

    this.towerTooltip.innerHTML = `
      <div class="tooltip-title">${tower.name} Lv.${tower.level}</div>
      <div class="tooltip-row">
        <span class="tooltip-label">伤害</span>
        <span class="tooltip-value">${tower.damage.toFixed(1)}</span>
      </div>
      <div class="tooltip-row">
        <span class="tooltip-label">射程</span>
        <span class="tooltip-value">${tower.range.toFixed(1)}</span>
      </div>
      <div class="tooltip-row">
        <span class="tooltip-label">射速</span>
        <span class="tooltip-value">${tower.fireRate.toFixed(2)}/秒</span>
      </div>
      ${upgradeHtml}
    `;

    this.towerTooltip.style.display = 'block';

    const tooltipRect = this.towerTooltip.getBoundingClientRect();
    let left = screenX + 15;
    let top = screenY - 10;

    if (left + tooltipRect.width > window.innerWidth) {
      left = screenX - tooltipRect.width - 15;
    }
    if (top + tooltipRect.height > window.innerHeight) {
      top = window.innerHeight - tooltipRect.height - 10;
    }
    if (top < 10) top = 10;

    this.towerTooltip.style.left = left + 'px';
    this.towerTooltip.style.top = top + 'px';

    const upgradeBtn = this.towerTooltip.querySelector('.tooltip-upgrade:not(.maxed):not(.disabled)');
    if (upgradeBtn) {
      upgradeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = parseInt((upgradeBtn as HTMLElement).dataset.towerId || '0');
        if (id) {
          this.events.onTowerUpgrade(id);
        }
      });
    }
  }

  hideTowerTooltip(): void {
    this.towerTooltip.style.display = 'none';
  }

  showWaveAnnouncement(wave: number): void {
    this.waveAnnouncement.textContent = `第 ${wave} 波`;
    this.waveAnnouncement.style.opacity = '1';
    this.waveAnnouncement.style.transition = 'none';
    this.waveAnnouncement.style.transform = 'translate(-50%, -50%) scale(1.2)';

    requestAnimationFrame(() => {
      this.waveAnnouncement.style.transition = 'all 1.5s ease-out';
      this.waveAnnouncement.style.opacity = '0';
      this.waveAnnouncement.style.transform = 'translate(-50%, -50%) scale(1)';
    });
  }
}
