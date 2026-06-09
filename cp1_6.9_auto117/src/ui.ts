import { ButterflyGame } from './main.js';
import { FlowerType, FLOWER_INFO } from './garden.js';
import { ButterflySpecies, BUTTERFLY_SPECIES } from './butterfly.js';

export class UIController {
  game: ButterflyGame;
  selectedBedId: number | null = null;
  discoveryDates: Map<string, string> = new Map();

  shopModal: HTMLElement;
  shopClose: HTMLElement;
  seedList: HTMLElement;
  shopHint: HTMLElement;

  backpackModal: HTMLElement;
  backpackClose: HTMLElement;
  butterflyGrid: HTMLElement;
  backpackCount: HTMLElement;
  backpackTitleCount: HTMLElement;
  backpackIndicator: HTMLElement;

  btnShop: HTMLElement;
  btnBackpack: HTMLElement;

  catchToast: HTMLElement;

  constructor(game: ButterflyGame) {
    this.game = game;

    this.shopModal = document.getElementById('shop-modal')!;
    this.shopClose = document.getElementById('shop-close')!;
    this.seedList = document.getElementById('seed-list')!;
    this.shopHint = document.getElementById('shop-hint')!;

    this.backpackModal = document.getElementById('backpack-modal')!;
    this.backpackClose = document.getElementById('backpack-close')!;
    this.butterflyGrid = document.getElementById('butterfly-grid')!;
    this.backpackCount = document.getElementById('backpack-count')!;
    this.backpackTitleCount = document.getElementById('backpack-title-count')!;
    this.backpackIndicator = document.getElementById('backpack-indicator')!;

    this.btnShop = document.getElementById('btn-shop')!;
    this.btnBackpack = document.getElementById('btn-backpack')!;

    this.catchToast = document.getElementById('catch-toast')!;

    this.buildSeedList();
    this.bindEvents();
    this.updateBackpackCount();
  }

  buildSeedList() {
    this.seedList.innerHTML = '';
    for (const type of [FlowerType.Lavender, FlowerType.Rose, FlowerType.Sunflower]) {
      const info = FLOWER_INFO[type];
      const row = document.createElement('div');
      row.style.cssText = 'display:flex; align-items:center; gap:14px; padding:12px 14px; border-radius:12px; background:rgba(255,255,255,0.06); cursor:pointer; transition:all 0.2s;';
      row.className = 'seed-row';
      row.onmouseenter = () => { row.style.background = 'rgba(255,255,255,0.14)'; row.style.transform = 'translateX(4px)'; };
      row.onmouseleave = () => { row.style.background = 'rgba(255,255,255,0.06)'; row.style.transform = 'translateX(0)'; };
      row.onclick = () => this.plantSelected(type);

      const swatch = document.createElement('div');
      swatch.style.cssText = `width:36px; height:36px; border-radius:50%; background:#${info.color.toString(16).padStart(6, '0')}; box-shadow:0 0 12px #${info.color.toString(16).padStart(6, '0')}88; flex-shrink:0;`;

      const meta = document.createElement('div');
      meta.style.cssText = 'flex:1;';
      const name = document.createElement('div');
      name.style.cssText = 'font-size:15px; font-weight:700;';
      name.textContent = info.name;
      const desc = document.createElement('div');
      desc.style.cssText = 'font-size:12px; color:#bbb; margin-top:2px;';
      desc.textContent = `颜色：#${info.color.toString(16).padStart(6, '0').toUpperCase()}`;
      meta.appendChild(name);
      meta.appendChild(desc);

      const arrow = document.createElement('div');
      arrow.style.cssText = 'font-size:18px; color:#888;';
      arrow.textContent = '→';

      row.appendChild(swatch);
      row.appendChild(meta);
      row.appendChild(arrow);
      this.seedList.appendChild(row);
    }
  }

  bindEvents() {
    this.shopClose.addEventListener('click', () => this.closeShop());
    this.backpackClose.addEventListener('click', () => this.closeBackpack());

    this.btnShop.addEventListener('click', () => {
      this.selectedBedId = null;
      this.shopHint.textContent = '请在花园中点击一个空花坛来种植花朵';
      this.openShop();
    });
    this.btnBackpack.addEventListener('click', () => this.openBackpack());
    this.backpackIndicator.addEventListener('click', () => this.openBackpack());

    this.shopModal.addEventListener('click', (e) => {
      if (e.target === this.shopModal) this.closeShop();
    });
    this.backpackModal.addEventListener('click', (e) => {
      if (e.target === this.backpackModal) this.closeBackpack();
    });
  }

  openShopForBed(bedId: number, _clientX: number, _clientY: number) {
    this.selectedBedId = bedId;
    this.shopHint.textContent = `为花坛 #${bedId + 1} 选择花种`;
    this.openShop();
  }

  openShop() {
    this.shopModal.classList.add('active');
  }

  closeShop() {
    this.shopModal.classList.remove('active');
    this.selectedBedId = null;
  }

  plantSelected(type: FlowerType) {
    if (this.selectedBedId === null) {
      this.shopHint.textContent = '请先点击花园中的空花坛';
      this.shopHint.style.color = '#ff9999';
      setTimeout(() => { this.shopHint.style.color = '#aaa'; }, 1500);
      return;
    }
    const ok = this.game.garden.plantFlower(this.selectedBedId, type);
    if (ok) {
      this.closeShop();
    }
  }

  openBackpack() {
    this.renderButterflyGrid();
    this.backpackModal.classList.add('active');
  }

  closeBackpack() {
    this.backpackModal.classList.remove('active');
  }

  formatDate(iso: string): string {
    try {
      const d = new Date(iso);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    } catch { return iso; }
  }

  renderButterflyGrid() {
    this.butterflyGrid.innerHTML = '';
    for (const species of BUTTERFLY_SPECIES) {
      const collected = this.game.butterflyManager.isCollected(species.id);
      const card = document.createElement('div');
      card.style.cssText = 'background:rgba(255,255,255,0.06); border-radius:14px; padding:14px 12px; text-align:center; transition:all 0.25s;';
      if (collected) {
        card.onmouseenter = () => { card.style.background = 'rgba(255,255,255,0.12)'; card.style.transform = 'translateY(-3px)'; };
        card.onmouseleave = () => { card.style.background = 'rgba(255,255,255,0.06)'; card.style.transform = 'translateY(0)'; };
      }

      const preview = document.createElement('div');
      preview.style.cssText = 'width:100%; height:60px; border-radius:10px; display:flex; align-items:center; justify-content:center; margin-bottom:8px;';

      if (collected) {
        preview.style.background = `linear-gradient(135deg, ${species.primaryHex} 0%, ${species.secondaryHex} 100%)`;
        preview.style.boxShadow = `0 4px 15px ${species.primaryHex}55`;
        const butterfly = document.createElement('div');
        butterfly.textContent = '🦋';
        butterfly.style.cssText = 'font-size:28px; filter:drop-shadow(0 1px 2px rgba(0,0,0,0.4));';
        preview.appendChild(butterfly);

        const name = document.createElement('div');
        name.style.cssText = 'font-size:14px; font-weight:700; margin-bottom:2px;';
        name.textContent = species.name;

        const date = document.createElement('div');
        date.style.cssText = 'font-size:11px; color:#9cb;';
        const d = this.discoveryDates.get(species.id) || new Date().toISOString();
        date.textContent = `发现于 ${this.formatDate(d)}`;

        card.appendChild(preview);
        card.appendChild(name);
        card.appendChild(date);
      } else {
        preview.style.background = 'rgba(120,120,140,0.18)';
        preview.style.border = '1px dashed rgba(255,255,255,0.1)';
        const q = document.createElement('div');
        q.textContent = '❓';
        q.style.cssText = 'font-size:26px; opacity:0.5;';
        preview.appendChild(q);

        const name = document.createElement('div');
        name.style.cssText = 'font-size:13px; font-weight:600; color:#888; margin-bottom:2px;';
        name.textContent = '???';

        const date = document.createElement('div');
        date.style.cssText = 'font-size:11px; color:#666;';
        date.textContent = '尚未发现';

        card.appendChild(preview);
        card.appendChild(name);
        card.appendChild(date);
      }
      this.butterflyGrid.appendChild(card);
    }
  }

  updateBackpackCount() {
    const cur = this.game.butterflyManager.getCollectedCount();
    const total = this.game.butterflyManager.getTotalSpecies();
    this.backpackCount.textContent = `${cur}/${total}`;
    this.backpackTitleCount.textContent = `${cur}/${total}`;
  }

  onButterflyCaught(species: ButterflySpecies) {
    if (!this.discoveryDates.has(species.id)) {
      this.discoveryDates.set(species.id, new Date().toISOString());
    }
    this.updateBackpackCount();

    this.catchToast.style.opacity = '1';
    this.catchToast.style.transform = 'translate(-50%,-50%) scale(1)';
    this.catchToast.textContent = `🎉 捕捉到 ${species.name}！`;
    setTimeout(() => {
      this.catchToast.style.opacity = '0';
      this.catchToast.style.transform = 'translate(-50%,-50%) scale(0.5)';
    }, 1600);
  }
}
