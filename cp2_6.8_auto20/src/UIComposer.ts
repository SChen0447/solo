import type { SkillData, ComboEffect } from './SkillManager';
import { SkillManager } from './SkillManager';

export type SkillSelectCallback = (skillId: string) => void;
export type ComboChangeCallback = (combo: ComboEffect | null) => void;
export type ResetCallback = () => void;
export type SpeedChangeCallback = (speed: number) => void;

export class UIComposer {
  private skillManager: SkillManager;
  private skillIconsContainer: HTMLElement;
  private comboSlotsContainer: HTMLElement;
  private infoSkillName: HTMLElement;
  private infoComboDesc: HTMLElement;
  private speedValue: HTMLElement;
  private particleCount: HTMLElement;
  private resetBtn: HTMLElement;
  private speedSlider: HTMLInputElement;
  private dragGhost: HTMLElement;
  private rippleContainer: HTMLElement;
  
  private onSkillSelect: SkillSelectCallback | null = null;
  private onComboChange: ComboChangeCallback | null = null;
  private onReset: ResetCallback | null = null;
  private onSpeedChange: SpeedChangeCallback | null = null;
  
  private isDragging: boolean = false;
  private draggedSkillId: string | null = null;
  private draggedElement: HTMLElement | null = null;
  private slotSkills: (string | null)[] = [null, null, null];
  private currentSpeed: number = 1.0;

  constructor(skillManager: SkillManager) {
    this.skillManager = skillManager;
    
    this.skillIconsContainer = document.getElementById('skill-icons')!;
    this.comboSlotsContainer = document.getElementById('combo-slots')!;
    this.infoSkillName = document.getElementById('skill-name')!;
    this.infoComboDesc = document.getElementById('combo-desc')!;
    this.speedValue = document.getElementById('speed-value')!;
    this.particleCount = document.getElementById('particle-count')!;
    this.resetBtn = document.getElementById('reset-btn')!;
    this.speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
    this.dragGhost = document.getElementById('drag-ghost')!;
    this.rippleContainer = document.getElementById('ripple-container')!;

    this.initialize();
  }

  private initialize(): void {
    this.renderSkillIcons();
    this.bindEvents();
  }

  private renderSkillIcons(): void {
    const skills = this.skillManager.getAllSkills();
    
    skills.forEach(skill => {
      const icon = this.createSkillIcon(skill);
      this.skillIconsContainer.appendChild(icon);
    });
  }

  private createSkillIcon(skill: SkillData): HTMLElement {
    const icon = document.createElement('div');
    icon.className = 'skill-icon';
    icon.dataset.skillId = skill.id;
    icon.title = skill.name;
    
    icon.style.background = `radial-gradient(circle at 30% 30%, ${skill.colorStart}, ${skill.colorEnd})`;
    
    const label = document.createElement('span');
    label.className = 'skill-icon-label';
    label.textContent = skill.name.charAt(0);
    icon.appendChild(label);

    icon.addEventListener('mousedown', (e) => this.handleDragStart(e, skill.id, icon));
    icon.addEventListener('touchstart', (e) => this.handleTouchStart(e, skill.id, icon), { passive: false });
    
    icon.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleSkillClick(skill.id, icon);
    });

    return icon;
  }

  private handleDragStart(e: MouseEvent, skillId: string, element: HTMLElement): void {
    if (e.button !== 0) return;
    
    this.isDragging = true;
    this.draggedSkillId = skillId;
    this.draggedElement = element;
    
    element.classList.add('dragging');
    this.dragGhost.style.opacity = '0';
    
    document.addEventListener('mousemove', this.handleDragMove);
    document.addEventListener('mouseup', this.handleDragEnd);
  }

  private handleTouchStart(e: TouchEvent, skillId: string, element: HTMLElement): void {
    e.preventDefault();
    
    this.isDragging = true;
    this.draggedSkillId = skillId;
    this.draggedElement = element;
    
    element.classList.add('dragging');
    this.dragGhost.style.opacity = '0';
    
    document.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    document.addEventListener('touchend', this.handleTouchEnd);
  }

  private handleDragMove = (e: MouseEvent): void => {
    if (!this.isDragging || !this.draggedSkillId) return;
    
    this.updateDragGhost(e.clientX, e.clientY);
    this.checkSlotHover(e.clientX, e.clientY);
  };

  private handleTouchMove = (e: TouchEvent): void => {
    if (!this.isDragging || !this.draggedSkillId) return;
    e.preventDefault();
    
    const touch = e.touches[0];
    this.updateDragGhost(touch.clientX, touch.clientY);
    this.checkSlotHover(touch.clientX, touch.clientY);
  };

  private updateDragGhost(x: number, y: number): void {
    if (!this.draggedSkillId) return;
    
    const skill = this.skillManager.getSkill(this.draggedSkillId);
    if (!skill) return;

    this.dragGhost.style.display = 'block';
    this.dragGhost.style.opacity = '0.7';
    this.dragGhost.style.left = `${x - 25}px`;
    this.dragGhost.style.top = `${y - 25}px`;
    this.dragGhost.style.background = `radial-gradient(circle at 30% 30%, ${skill.colorStart}, ${skill.colorEnd})`;
  }

  private checkSlotHover(x: number, y: number): void {
    const slots = this.comboSlotsContainer.querySelectorAll('.combo-slot');
    slots.forEach(slot => {
      const rect = slot.getBoundingClientRect();
      const isHovered = x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
      
      if (isHovered) {
        slot.classList.add('slot-hover');
      } else {
        slot.classList.remove('slot-hover');
      }
    });
  }

  private handleDragEnd = (e: MouseEvent): void => {
    this.finalizeDrag(e.clientX, e.clientY);
  };

  private handleTouchEnd = (e: TouchEvent): void => {
    const touch = e.changedTouches[0];
    this.finalizeDrag(touch.clientX, touch.clientY);
  };

  private finalizeDrag(x: number, y: number): void {
    if (!this.isDragging || !this.draggedSkillId) {
      this.cleanupDrag();
      return;
    }

    const slots = this.comboSlotsContainer.querySelectorAll('.combo-slot');
    let droppedSlot: Element | null = null;
    let slotIndex = -1;

    slots.forEach((slot, index) => {
      const rect = slot.getBoundingClientRect();
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        droppedSlot = slot;
        slotIndex = index;
      }
      slot.classList.remove('slot-hover');
    });

    if (droppedSlot && slotIndex >= 0) {
      this.handleDropSuccess(slotIndex, x, y);
    } else {
      this.handleDropFail();
    }

    this.cleanupDrag();
  }

  private handleDropSuccess(slotIndex: number, x: number, y: number): void {
    if (!this.draggedSkillId) return;

    const existingSkill = this.slotSkills[slotIndex];
    if (existingSkill === this.draggedSkillId) {
      return;
    }

    if (this.slotSkills.includes(this.draggedSkillId)) {
      this.showDropFailAnimation();
      return;
    }

    this.slotSkills[slotIndex] = this.draggedSkillId;
    this.skillManager.addSkillToSlot(this.draggedSkillId, slotIndex);
    
    this.updateSlotVisual(slotIndex, this.draggedSkillId);
    this.spawnRipple(x, y);
    this.updateComboInfo();
    this.notifyComboChange();
  }

  private handleDropFail(): void {
    this.showDropFailAnimation();
  }

  private showDropFailAnimation(): void {
    if (this.draggedElement) {
      this.draggedElement.classList.add('drop-fail');
      setTimeout(() => {
        this.draggedElement?.classList.remove('drop-fail');
      }, 500);
    }
  }

  private cleanupDrag(): void {
    this.isDragging = false;
    this.draggedSkillId = null;
    
    if (this.draggedElement) {
      this.draggedElement.classList.remove('dragging');
      this.draggedElement = null;
    }

    this.dragGhost.style.display = 'none';
    this.dragGhost.style.opacity = '0';

    document.removeEventListener('mousemove', this.handleDragMove);
    document.removeEventListener('mouseup', this.handleDragEnd);
    document.removeEventListener('touchmove', this.handleTouchMove);
    document.removeEventListener('touchend', this.handleTouchEnd);

    const slots = this.comboSlotsContainer.querySelectorAll('.combo-slot');
    slots.forEach(slot => slot.classList.remove('slot-hover'));
  }

  private updateSlotVisual(slotIndex: number, skillId: string | null): void {
    const slots = this.comboSlotsContainer.querySelectorAll('.combo-slot');
    const slot = slots[slotIndex] as HTMLElement;
    
    if (!slot) return;

    slot.innerHTML = '';
    slot.classList.remove('filled');

    if (skillId) {
      const skill = this.skillManager.getSkill(skillId);
      if (skill) {
        slot.classList.add('filled');
        slot.style.background = `radial-gradient(circle at 30% 30%, ${skill.colorStart}40, ${skill.colorEnd}20)`;
        slot.style.borderColor = skill.colorStart;
        
        const icon = document.createElement('div');
        icon.className = 'slot-icon';
        icon.style.background = `radial-gradient(circle at 30% 30%, ${skill.colorStart}, ${skill.colorEnd})`;
        icon.textContent = skill.name.charAt(0);
        slot.appendChild(icon);

        const removeBtn = document.createElement('div');
        removeBtn.className = 'slot-remove';
        removeBtn.innerHTML = '×';
        removeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.removeFromSlot(slotIndex);
        });
        slot.appendChild(removeBtn);
      }
    } else {
      slot.style.background = '';
      slot.style.borderColor = '';
    }
  }

  private removeFromSlot(slotIndex: number): void {
    this.slotSkills[slotIndex] = null;
    this.skillManager.removeSkillFromSlot(slotIndex);
    this.updateSlotVisual(slotIndex, null);
    this.updateComboInfo();
    this.notifyComboChange();
  }

  private handleSkillClick(skillId: string, element: HTMLElement): void {
    element.classList.add('clicked');
    setTimeout(() => element.classList.remove('clicked'), 300);
    
    if (this.onSkillSelect) {
      this.onSkillSelect(skillId);
    }

    this.updateSkillInfo(skillId);
  }

  private updateSkillInfo(skillId: string): void {
    const skill = this.skillManager.getSkill(skillId);
    if (!skill) return;

    this.animateFadeIn(this.infoSkillName, skill.name);
  }

  private updateComboInfo(): void {
    const combo = this.skillManager.getCombo();
    
    if (combo) {
      this.animateFadeIn(this.infoSkillName, combo.name);
      this.animateFadeIn(this.infoComboDesc, combo.description);
    } else {
      this.animateFadeIn(this.infoSkillName, '未选择技能');
      this.animateFadeIn(this.infoComboDesc, '拖拽技能到组合槽查看效果');
    }
  }

  private animateFadeIn(element: HTMLElement, text: string): void {
    element.style.opacity = '0';
    element.style.transform = 'translateY(-10px)';
    
    setTimeout(() => {
      element.textContent = text;
      element.style.opacity = '1';
      element.style.transform = 'translateY(0)';
    }, 100);
  }

  private spawnRipple(x: number, y: number): void {
    const ripple = document.createElement('div');
    ripple.className = 'ripple';
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    
    this.rippleContainer.appendChild(ripple);
    
    setTimeout(() => {
      ripple.remove();
    }, 600);
  }

  private bindEvents(): void {
    this.resetBtn.addEventListener('click', () => this.handleReset());
    
    this.speedSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.handleSpeedChange(value);
    });
  }

  private handleReset(): void {
    this.slotSkills = [null, null, null];
    for (let i = 0; i < 3; i++) {
      this.updateSlotVisual(i, null);
    }
    this.skillManager.clearAllSlots();
    
    const sceneContainer = document.getElementById('scene-container');
    if (sceneContainer) {
      sceneContainer.classList.add('reset-animation');
      setTimeout(() => {
        sceneContainer.classList.remove('reset-animation');
      }, 500);
    }

    this.updateComboInfo();
    
    if (this.onReset) {
      this.onReset();
    }
  }

  private handleSpeedChange(speed: number): void {
    this.currentSpeed = speed;
    this.speedValue.textContent = `${speed.toFixed(1)}x`;
    
    if (this.onSpeedChange) {
      this.onSpeedChange(speed);
    }
  }

  public updateParticleCount(count: number): void {
    this.particleCount.textContent = count.toString();
  }

  public setOnSkillSelect(callback: SkillSelectCallback): void {
    this.onSkillSelect = callback;
  }

  public setOnComboChange(callback: ComboChangeCallback): void {
    this.onComboChange = callback;
  }

  public setOnReset(callback: ResetCallback): void {
    this.onReset = callback;
  }

  public setOnSpeedChange(callback: SpeedChangeCallback): void {
    this.onSpeedChange = callback;
  }

  private notifyComboChange(): void {
    if (this.onComboChange) {
      this.onComboChange(this.skillManager.getCombo());
    }
  }

  public getSlotSkills(): (string | null)[] {
    return [...this.slotSkills];
  }

  public getCurrentSpeed(): number {
    return this.currentSpeed;
  }
}
