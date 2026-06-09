import { AlchemySystem, MATERIALS, MaterialType, type Recipe, type CraftedProduct } from './AlchemySystem.js';
import { Renderer } from './Renderer.js';

interface DragState {
  active: boolean;
  material: MaterialType | null;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

const RARITY_LABELS: Record<string, string> = {
  common: '普通',
  uncommon: '优良',
  rare: '稀有',
  legendary: '传说'
};

const MATERIAL_ICONS_SVG: Record<MaterialType, string> = {
  [MaterialType.SULFUR]: '<svg viewBox="0 0 16 16"><polygon points="8,2 14,14 2,14" fill="#FFD700" stroke="#B8860B" stroke-width="1"/></svg>',
  [MaterialType.MERCURY]: '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" fill="#C0C0C0" stroke="#808080" stroke-width="1"/><circle cx="6" cy="6" r="1.5" fill="#E8E8E8"/></svg>',
  [MaterialType.SALT]: '<svg viewBox="0 0 16 16"><rect x="3" y="3" width="10" height="10" fill="#F5F5F5" stroke="#A9A9A9" stroke-width="1"/><rect x="5" y="5" width="2" height="2" fill="#E0E0E0"/></svg>',
  [MaterialType.HERB]: '<svg viewBox="0 0 16 16"><rect x="7" y="2" width="2" height="12" fill="#228B22"/><rect x="2" y="7" width="12" height="2" fill="#228B22"/><rect x="5" y="5" width="2" height="2" fill="#32CD32"/><rect x="9" y="9" width="2" height="2" fill="#32CD32"/></svg>',
  [MaterialType.METAL]: '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" fill="#808080" stroke="#404040" stroke-width="1"/><rect x="7" y="4" width="2" height="8" fill="#606060"/><rect x="4" y="7" width="8" height="2" fill="#606060"/></svg>'
};

const LOCK_ICON_SVG = '<svg viewBox="0 0 16 16" class="lock-icon"><rect x="3" y="6" width="10" height="9" fill="#808080" stroke="#404040" stroke-width="1"/><path d="M5 6V4a3 3 0 0 1 6 0v2" fill="none" stroke="#808080" stroke-width="1.5"/><circle cx="8" cy="10" r="1.5" fill="#404040"/></svg>';

export class UIManager {
  private alchemy: AlchemySystem;
  private renderer: Renderer;
  private canvas: HTMLCanvasElement;
  private dragGhost: HTMLElement;
  private dragState: DragState;
  private onHeat: (() => void) | null = null;
  private onStir: (() => void) | null = null;
  private onUnlockRecipe: ((recipeId: string, productId: string) => void) | null = null;

  constructor(alchemy: AlchemySystem, renderer: Renderer, canvas: HTMLCanvasElement) {
    this.alchemy = alchemy;
    this.renderer = renderer;
    this.canvas = canvas;
    this.dragGhost = document.getElementById('drag-ghost') as HTMLElement;
    this.dragState = {
      active: false,
      material: null,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0
    };
  }

  public setCallbacks(onHeat: () => void, onStir: () => void, onUnlockRecipe: (recipeId: string, productId: string) => void): void {
    this.onHeat = onHeat;
    this.onStir = onStir;
    this.onUnlockRecipe = onUnlockRecipe;
  }

  public init(): void {
    this.renderMaterials();
    this.bindEvents();
    this.updateStatus();
    this.renderNotes();
  }

  private renderMaterials(): void {
    const grid = document.getElementById('materials-grid') as HTMLElement;
    grid.innerHTML = '';
    for (const type of Object.values(MaterialType)) {
      const config = MATERIALS[type];
      const div = document.createElement('div');
      div.className = 'material-icon';
      div.draggable = true;
      div.title = config.name;
      div.dataset.material = type;
      div.innerHTML = MATERIAL_ICONS_SVG[type];
      this.bindDragEvents(div, type);
      grid.appendChild(div);
    }
  }

  private bindDragEvents(el: HTMLElement, material: MaterialType): void {
    el.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.startDrag(material, e.clientX, e.clientY, el);
    });
    el.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      this.startDrag(material, touch.clientX, touch.clientY, el);
    }, { passive: true });
  }

  private startDrag(material: MaterialType, x: number, y: number, sourceEl: HTMLElement): void {
    const svg = sourceEl.querySelector('svg');
    if (!svg) return;
    this.dragState.active = true;
    this.dragState.material = material;
    this.dragState.startX = x;
    this.dragState.startY = y;
    this.dragState.currentX = x;
    this.dragState.currentY = y;
    this.dragGhost.innerHTML = svg.outerHTML;
    this.dragGhost.style.display = 'block';
    this.updateDragGhostPosition(x, y);
    document.body.style.cursor = 'grabbing';
  }

  private updateDragGhostPosition(x: number, y: number): void {
    this.dragGhost.style.left = (x - 16) + 'px';
    this.dragGhost.style.top = (y - 16) + 'px';
  }

  private endDrag(): void {
    if (!this.dragState.active) return;
    const rect = this.canvas.getBoundingClientRect();
    const canvasX = this.dragState.currentX - rect.left;
    const canvasY = this.dragState.currentY - rect.top;
    if (this.dragState.material && this.renderer.isInCrucible(canvasX, canvasY)) {
      this.alchemy.addMaterial(this.dragState.material);
      this.updateStatus();
    }
    this.dragState.active = false;
    this.dragState.material = null;
    this.dragGhost.style.display = 'none';
    document.body.style.cursor = '';
  }

  private bindEvents(): void {
    const heatBtn = document.getElementById('heat-btn') as HTMLButtonElement;
    const stirBtn = document.getElementById('stir-btn') as HTMLButtonElement;
    const mobileToggle = document.getElementById('mobile-toggle') as HTMLButtonElement;
    const panel = document.getElementById('panel') as HTMLElement;

    heatBtn.addEventListener('click', () => {
      this.pressButton(heatBtn);
      this.onHeat?.();
    });

    stirBtn.addEventListener('click', () => {
      this.pressButton(stirBtn);
      this.onStir?.();
    });

    mobileToggle.addEventListener('click', () => {
      panel.classList.toggle('expanded');
      mobileToggle.textContent = panel.classList.contains('expanded') ? '-' : '+';
    });

    document.addEventListener('mousemove', (e) => {
      if (this.dragState.active) {
        this.dragState.currentX = e.clientX;
        this.dragState.currentY = e.clientY;
        this.updateDragGhostPosition(e.clientX, e.clientY);
      }
    });

    document.addEventListener('mouseup', () => {
      this.endDrag();
    });

    document.addEventListener('touchmove', (e) => {
      if (this.dragState.active && e.touches[0]) {
        this.dragState.currentX = e.touches[0].clientX;
        this.dragState.currentY = e.touches[0].clientY;
        this.updateDragGhostPosition(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    document.addEventListener('touchend', () => {
      this.endDrag();
    });
  }

  private pressButton(btn: HTMLButtonElement): void {
    btn.style.transform = 'translateY(2px)';
    btn.style.boxShadow = '0 0 0 #3E2723';
    setTimeout(() => {
      btn.style.transform = '';
      btn.style.boxShadow = '';
    }, 100);
  }

  public updateStatus(): void {
    const heat = this.alchemy.getHeat();
    const stir = this.alchemy.getStirCount();
    const heatValue = document.getElementById('heat-value') as HTMLElement;
    const stirValue = document.getElementById('stir-value') as HTMLElement;
    const heatBar = document.getElementById('heat-bar') as HTMLElement;
    const stirBar = document.getElementById('stir-bar') as HTMLElement;
    if (heatValue) heatValue.textContent = `${heat}/100`;
    if (stirValue) stirValue.textContent = `${stir}/20`;
    if (heatBar) heatBar.style.width = `${heat}%`;
    if (stirBar) stirBar.style.width = `${stir * 5}%`;
  }

  public renderNotes(): void {
    const notesBody = document.getElementById('notes-body') as HTMLElement;
    const lockedContainer = document.getElementById('locked-recipes') as HTMLElement;
    if (!notesBody || !lockedContainer) return;
    notesBody.innerHTML = '';
    const products = this.alchemy.getCraftedProducts();
    const recipes = this.alchemy.getRecipes();
    const seen = new Set<string>();
    for (const product of products) {
      if (seen.has(product.recipeId)) continue;
      seen.add(product.recipeId);
      const tr = document.createElement('tr');
      const materialsText = product.materials.map(m => MATERIALS[m].name).join('+');
      tr.innerHTML = `
        <td>${product.name}</td>
        <td class="rarity-${product.rarity}">${RARITY_LABELS[product.rarity]}</td>
        <td>${materialsText}</td>
      `;
      notesBody.appendChild(tr);
    }
    lockedContainer.innerHTML = '';
    const lockedRecipes = this.alchemy.getLockedRecipes();
    for (const recipe of lockedRecipes) {
      const div = document.createElement('div');
      div.className = 'locked-recipe';
      div.title = `消耗1个产物解锁：${recipe.name}`;
      div.innerHTML = `
        ${LOCK_ICON_SVG}
        <span class="locked-text">点击消耗产物解锁配方</span>
      `;
      div.addEventListener('click', () => this.handleUnlockClick(recipe));
      lockedContainer.appendChild(div);
    }
  }

  private handleUnlockClick(recipe: Recipe): void {
    const products = this.alchemy.getCraftedProducts();
    if (products.length === 0) {
      this.showToast('没有可用的产物来解锁配方');
      return;
    }
    const productToUse = products[0];
    this.onUnlockRecipe?.(recipe.id, productToUse.id);
  }

  private showToast(message: string): void {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #8B4513;
      color: #FFD700;
      padding: 10px 20px;
      border: 2px solid #3E2723;
      font-family: 'Courier New', monospace;
      font-size: 14px;
      font-weight: bold;
      z-index: 2000;
      opacity: 0;
      transition: opacity 0.3s;
    `;
    document.body.appendChild(toast);
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
    });
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }

  public getMaterialNames(types: MaterialType[]): string {
    return types.map(t => MATERIALS[t].name).join('+');
  }
}
