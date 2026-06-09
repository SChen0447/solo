import type { ElementType, FusionResultType, FusionRecipe } from './ElementSystem';
import { ElementSystem } from './ElementSystem';

export interface RecipeRecord {
  id: string;
  elements: ElementType[];
  result: FusionResultType;
  resultName: string;
  timestamp: number;
}

export type RecipeReplayCallback = (elements: ElementType[]) => void;

export class RecipeList {
  private records: RecipeRecord[] = [];
  private maxRecords: number = 10;
  private container: HTMLElement;
  private onReplayCallback: RecipeReplayCallback | null = null;
  private elementSystem: ElementSystem;

  constructor(containerId: string, elementSystem: ElementSystem) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container with id "${containerId}" not found`);
    }
    this.container = container;
    this.elementSystem = elementSystem;
  }

  public onReplay(callback: RecipeReplayCallback): void {
    this.onReplayCallback = callback;
  }

  public addRecipe(recipe: FusionRecipe): void {
    const existingIndex = this.records.findIndex(r => {
      if (r.elements.length !== recipe.elements.length) return false;
      const sortedA = [...r.elements].sort();
      const sortedB = [...recipe.elements].sort();
      return sortedA.every((el, i) => el === sortedB[i]);
    });

    if (existingIndex !== -1) {
      this.records.splice(existingIndex, 1);
    }

    const record: RecipeRecord = {
      id: `recipe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      elements: [...recipe.elements],
      result: recipe.result,
      resultName: recipe.resultName,
      timestamp: Date.now()
    };

    this.records.unshift(record);

    while (this.records.length > this.maxRecords) {
      this.records.pop();
    }

    this.render();
  }

  public getRecords(): RecipeRecord[] {
    return [...this.records];
  }

  public clear(): void {
    this.records = [];
    this.render();
  }

  private createElementIcon(type: ElementType | FusionResultType, isResult: boolean = false): HTMLElement {
    const icon = document.createElement('div');
    icon.className = `element-icon ${type}`;

    let content = '';
    if (!isResult) {
      const info = ElementSystem.getElementInfo(type as ElementType);
      content = info.emoji;
    } else {
      const info = ElementSystem.getResultInfo(type as FusionResultType);
      content = info.emoji;
    }
    icon.textContent = content;
    return icon;
  }

  private render(): void {
    this.container.innerHTML = '';

    this.records.forEach((record, index) => {
      const card = document.createElement('div');
      card.className = 'recipe-card';
      card.style.animationDelay = `${index * 0.05}s`;
      card.dataset.recipeId = record.id;

      const canReplay = this.elementSystem.canReplayRecipe();
      if (!canReplay) {
        card.classList.add('disabled');
      }

      record.elements.forEach((element, elIndex) => {
        card.appendChild(this.createElementIcon(element, false));
        if (elIndex < record.elements.length - 1) {
          const plus = document.createElement('span');
          plus.className = 'arrow-icon';
          plus.textContent = '+';
          card.appendChild(plus);
        }
      });

      const arrow = document.createElement('span');
      arrow.className = 'arrow-icon';
      arrow.textContent = '→';
      card.appendChild(arrow);

      card.appendChild(this.createElementIcon(record.result, true));

      if (canReplay) {
        card.addEventListener('click', () => {
          if (!this.elementSystem.canReplayRecipe()) return;
          if (this.onReplayCallback) {
            this.onReplayCallback([...record.elements]);
          }
        });

        card.addEventListener('mouseenter', () => {
          card.style.transform = 'scale(1.05)';
        });
        card.addEventListener('mouseleave', () => {
          card.style.transform = 'scale(1)';
        });
        card.addEventListener('mousedown', () => {
          card.style.transform = 'scale(0.95)';
        });
        card.addEventListener('mouseup', () => {
          card.style.transform = 'scale(1.05)';
        });
      }

      this.container.appendChild(card);
    });
  }

  public updateDisabledState(): void {
    const cards = this.container.querySelectorAll('.recipe-card');
    cards.forEach(card => {
      if (this.elementSystem.canReplayRecipe()) {
        card.classList.remove('disabled');
      } else {
        card.classList.add('disabled');
      }
    });
  }
}
