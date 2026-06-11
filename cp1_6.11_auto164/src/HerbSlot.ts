import { ElementType, ELEMENT_COLORS, ELEMENT_NAMES, HERBS, Herb, ELEMENTS } from './constants';

export class HerbSlot {
  private container: HTMLElement;
  private slots: Map<ElementType, HTMLElement> = new Map();
  private selectedHerbs: Map<ElementType, Herb | null> = new Map();
  private selectorPanel: HTMLElement | null = null;
  private currentSlot: ElementType | null = null;
  private onHerbChangeCallback: (elements: Record<ElementType, number>) => void = () => {};

  constructor(container: HTMLElement) {
    this.container = container;
    this.init();
  }

  private init(): void {
    const slotContainer = document.createElement('div');
    slotContainer.className = 'herb-slots-container';
    slotContainer.style.cssText = `
      position: absolute;
      bottom: 120px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 40px;
      z-index: 100;
    `;
    
    ELEMENTS.forEach((element) => {
      const slot = this.createSlot(element);
      slotContainer.appendChild(slot);
      this.slots.set(element, slot);
      this.selectedHerbs.set(element, null);
    });
    
    this.container.appendChild(slotContainer);
    this.createSelectorPanel();
    this.addResponsiveStyles();
  }

  private createSlot(element: ElementType): HTMLElement {
    const slot = document.createElement('div');
    slot.className = `herb-slot slot-${element}`;
    slot.dataset.element = element;
    
    const color = ELEMENT_COLORS[element];
    
    slot.style.cssText = `
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: ${color};
      background: radial-gradient(circle at 30% 30%, ${color}dd, ${color}66);
      border: 2px solid ${color};
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
      position: relative;
      overflow: visible;
      box-shadow: 0 0 10px ${color}44;
    `;
    
    const label = document.createElement('div');
    label.textContent = ELEMENT_NAMES[element];
    label.style.cssText = `
      color: white;
      font-size: 16px;
      font-weight: bold;
      text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
      pointer-events: none;
    `;
    slot.appendChild(label);
    
    slot.addEventListener('mouseenter', () => {
      slot.style.transform = 'scale(1.15)';
      slot.style.filter = 'blur(1px) brightness(1.2)';
      slot.style.boxShadow = `0 0 20px ${color}aa`;
    });
    
    slot.addEventListener('mouseleave', () => {
      slot.style.transform = 'scale(1)';
      slot.style.filter = 'none';
      slot.style.boxShadow = `0 0 10px ${color}44`;
    });
    
    slot.addEventListener('click', () => this.openSelector(element));
    
    return slot;
  }

  private createSelectorPanel(): void {
    const panel = document.createElement('div');
    panel.className = 'herb-selector-panel';
    panel.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0);
      background: linear-gradient(135deg, #2c1810 0%, #1a2a1a 100%);
      border: 3px solid #8b4513;
      border-radius: 20px;
      padding: 30px;
      z-index: 1000;
      box-shadow: 0 0 30px rgba(255, 215, 0, 0.3);
      transition: transform 0.3s ease;
      max-width: 90vw;
    `;
    
    const title = document.createElement('div');
    title.textContent = '选择草药';
    title.style.cssText = `
      text-align: center;
      color: #ffd700;
      font-size: 24px;
      margin-bottom: 20px;
      font-weight: bold;
    `;
    panel.appendChild(title);
    
    const grid = document.createElement('div');
    grid.className = 'herb-grid';
    grid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
    `;
    
    HERBS.forEach((herb) => {
      const herbItem = this.createHerbItem(herb);
      grid.appendChild(herbItem);
    });
    
    panel.appendChild(grid);
    
    const closeBtn = document.createElement('div');
    closeBtn.textContent = '取消';
    closeBtn.style.cssText = `
      text-align: center;
      color: #a0a0a0;
      font-size: 16px;
      margin-top: 20px;
      cursor: pointer;
      padding: 10px;
      border: 1px solid #555;
      border-radius: 8px;
      transition: all 0.2s;
    `;
    
    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.color = '#ffd700';
      closeBtn.style.borderColor = '#ffd700';
    });
    
    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.color = '#a0a0a0';
      closeBtn.style.borderColor = '#555';
    });
    
    closeBtn.addEventListener('click', () => this.closeSelector());
    panel.appendChild(closeBtn);
    
    this.selectorPanel = panel;
    this.container.appendChild(panel);
  }

  private createHerbItem(herb: Herb): HTMLElement {
    const item = document.createElement('div');
    item.className = 'herb-item';
    item.dataset.herbId = herb.id;
    
    item.style.cssText = `
      width: 70px;
      height: 70px;
      border-radius: 12px;
      background: linear-gradient(145deg, ${herb.color}66, ${herb.color}22);
      border: 2px solid ${herb.color};
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
      position: relative;
    `;
    
    const herbIcon = document.createElement('div');
    herbIcon.textContent = herb.name.charAt(0);
    herbIcon.style.cssText = `
      font-size: 28px;
      color: ${herb.color};
      text-shadow: 0 0 5px ${herb.color};
      transform-style: preserve-3d;
      animation: herbRotate 3s ease-in-out infinite;
    `;
    item.appendChild(herbIcon);
    
    const herbName = document.createElement('div');
    herbName.textContent = herb.name;
    herbName.style.cssText = `
      font-size: 12px;
      color: #d4c9a8;
      margin-top: 4px;
    `;
    item.appendChild(herbName);
    
    const gradeStars = document.createElement('div');
    gradeStars.textContent = '★'.repeat(herb.grade);
    gradeStars.style.cssText = `
      font-size: 10px;
      color: #ffd700;
      position: absolute;
      top: 2px;
      right: 4px;
    `;
    item.appendChild(gradeStars);
    
    item.addEventListener('mouseenter', () => {
      item.style.transform = 'scale(1.1)';
      item.style.boxShadow = `0 0 15px ${herb.color}aa`;
    });
    
    item.addEventListener('mouseleave', () => {
      item.style.transform = 'scale(1)';
      item.style.boxShadow = 'none';
    });
    
    item.addEventListener('click', () => this.selectHerb(herb));
    
    return item;
  }

  private openSelector(element: ElementType): void {
    this.currentSlot = element;
    if (this.selectorPanel) {
      this.selectorPanel.style.transform = 'translate(-50%, -50%) scale(1)';
    }
  }

  private closeSelector(): void {
    this.currentSlot = null;
    if (this.selectorPanel) {
      this.selectorPanel.style.transform = 'translate(-50%, -50%) scale(0)';
    }
  }

  private selectHerb(herb: Herb): void {
    if (!this.currentSlot) return;
    
    this.selectedHerbs.set(this.currentSlot, herb);
    this.updateSlotVisual(this.currentSlot, herb);
    this.playSlotGlow(this.currentSlot);
    this.notifyChange();
    this.closeSelector();
  }

  private updateSlotVisual(element: ElementType, herb: Herb): void {
    const slot = this.slots.get(element);
    if (!slot) return;
    
    const herbDisplay = slot.querySelector('.herb-display');
    if (herbDisplay) {
      herbDisplay.remove();
    }
    
    const display = document.createElement('div');
    display.className = 'herb-display';
    display.style.cssText = `
      position: absolute;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: radial-gradient(circle at 30% 30%, ${herb.color}, ${herb.color}88);
      box-shadow: 0 0 10px ${herb.color};
      transform-style: preserve-3d;
      animation: herbDrop 0.5s ease-out, herbRotate 3s ease-in-out infinite 0.5s;
    `;
    
    const label = slot.querySelector('div');
    if (label) {
      label.style.display = 'none';
    }
    
    slot.appendChild(display);
  }

  private playSlotGlow(element: ElementType): void {
    const slot = this.slots.get(element);
    if (!slot) return;
    
    const color = ELEMENT_COLORS[element];
    
    slot.style.animation = 'none';
    slot.offsetHeight;
    
    const glowOverlay = document.createElement('div');
    glowOverlay.style.cssText = `
      position: absolute;
      top: -10px;
      left: -10px;
      right: -10px;
      bottom: -10px;
      border-radius: 50%;
      background: radial-gradient(circle, white 0%, ${color} 50%, transparent 70%);
      opacity: 0;
      animation: glowPulse 0.5s ease-out;
      pointer-events: none;
    `;
    
    slot.appendChild(glowOverlay);
    
    setTimeout(() => {
      glowOverlay.remove();
    }, 500);
  }

  private notifyChange(): void {
    const elements: Record<ElementType, number> = {
      metal: 0,
      wood: 0,
      water: 0,
      fire: 0,
      earth: 0
    };
    
    this.selectedHerbs.forEach((herb) => {
      if (herb) {
        elements.metal += herb.elements.metal;
        elements.wood += herb.elements.wood;
        elements.water += herb.elements.water;
        elements.fire += herb.elements.fire;
        elements.earth += herb.elements.earth;
      }
    });
    
    this.onHerbChangeCallback(elements);
  }

  public onHerbChange(callback: (elements: Record<ElementType, number>) => void): void {
    this.onHerbChangeCallback = callback;
  }

  public getSelectedHerbs(): Map<ElementType, Herb | null> {
    return this.selectedHerbs;
  }

  public clearAll(): void {
    ELEMENTS.forEach((element) => {
      this.selectedHerbs.set(element, null);
      const slot = this.slots.get(element);
      if (slot) {
        const display = slot.querySelector('.herb-display');
        if (display) display.remove();
        const label = slot.querySelector('div');
        if (label) label.style.display = 'block';
      }
    });
    this.notifyChange();
  }

  private addResponsiveStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes herbRotate {
        0%, 100% { transform: rotateY(0deg); }
        50% { transform: rotateY(180deg); }
      }
      
      @keyframes herbDrop {
        0% { transform: translateY(-50px) scale(0); opacity: 0; }
        60% { transform: translateY(10px) scale(1.1); }
        100% { transform: translateY(0) scale(1); opacity: 1; }
      }
      
      @keyframes glowPulse {
        0% { opacity: 0; transform: scale(0.5); }
        50% { opacity: 1; transform: scale(1.2); }
        100% { opacity: 0; transform: scale(1.5); }
      }
      
      @media (max-width: 768px) {
        .herb-slots-container {
          bottom: 80px !important;
          gap: 20px !important;
          flex-wrap: wrap;
          justify-content: center;
          max-width: 300px;
        }
        
        .herb-slot {
          width: 50px !important;
          height: 50px !important;
        }
        
        .herb-grid {
          grid-template-columns: repeat(3, 1fr) !important;
        }
        
        .herb-item {
          width: 60px !important;
          height: 60px !important;
        }
      }
      
      @media (max-width: 480px) {
        .herb-slots-container {
          gap: 15px !important;
        }
        
        .herb-slot {
          width: 45px !important;
          height: 45px !important;
        }
      }
    `;
    document.head.appendChild(style);
  }
}
