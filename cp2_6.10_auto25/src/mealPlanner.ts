import type { Recipe, Ingredient, IngredientCategory } from './recipeManager.js';
import { RecipeManager } from './recipeManager.js';

export type MealType = 'breakfast' | 'lunch' | 'dinner';

export interface MealPlan {
  date: string;
  mealType: MealType;
  recipeId: string;
}

export interface ShoppingItem {
  id: string;
  name: string;
  category: IngredientCategory;
  amount: string;
  checked: boolean;
}

export interface ExtraShoppingItem {
  id: string;
  name: string;
  amount: string;
  checked: boolean;
}

const PLAN_STORAGE_KEY = 'recipe_planner_meal_plans';
const SHOPPING_STORAGE_KEY = 'recipe_planner_shopping_items';

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐'
};

const WEEK_DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

export function getWeekDates(): string[] {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diffToMonday);

  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    dates.push(formatDate(date));
  }
  return dates;
}

export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getWeekDayLabel(dateStr: string): string {
  const dates = getWeekDates();
  const index = dates.indexOf(dateStr);
  return index >= 0 ? WEEK_DAYS[index] : '';
}

export class MealPlanner {
  private mealPlans: MealPlan[] = [];
  private extraShoppingItems: ExtraShoppingItem[] = [];
  private recipeManager: RecipeManager;

  constructor(recipeManager: RecipeManager) {
    this.recipeManager = recipeManager;
    this.loadPlansFromStorage();
    this.loadShoppingItemsFromStorage();
  }

  private loadPlansFromStorage(): void {
    try {
      const data = localStorage.getItem(PLAN_STORAGE_KEY);
      if (data) {
        this.mealPlans = JSON.parse(data) as MealPlan[];
      }
    } catch (e) {
      console.error('加载餐单数据失败:', e);
      this.mealPlans = [];
    }
  }

  private savePlansToStorage(): void {
    try {
      localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(this.mealPlans));
    } catch (e) {
      console.error('保存餐单数据失败:', e);
    }
  }

  private loadShoppingItemsFromStorage(): void {
    try {
      const data = localStorage.getItem(SHOPPING_STORAGE_KEY);
      if (data) {
        this.extraShoppingItems = JSON.parse(data) as ExtraShoppingItem[];
      }
    } catch (e) {
      console.error('加载购物清单数据失败:', e);
      this.extraShoppingItems = [];
    }
  }

  private saveShoppingItemsToStorage(): void {
    try {
      localStorage.setItem(SHOPPING_STORAGE_KEY, JSON.stringify(this.extraShoppingItems));
    } catch (e) {
      console.error('保存购物清单数据失败:', e);
    }
  }

  addMealPlan(date: string, mealType: MealType, recipeId: string): boolean {
    const existingSameDay = this.mealPlans.find(
      p => p.date === date && p.recipeId === recipeId
    );
    if (existingSameDay) {
      return false;
    }

    this.removeMealPlan(date, mealType);

    this.mealPlans.push({ date, mealType, recipeId });
    this.savePlansToStorage();
    return true;
  }

  removeMealPlan(date: string, mealType: MealType): boolean {
    const index = this.mealPlans.findIndex(
      p => p.date === date && p.mealType === mealType
    );
    if (index === -1) return false;
    this.mealPlans.splice(index, 1);
    this.savePlansToStorage();
    return true;
  }

  getMealPlan(date: string, mealType: MealType): MealPlan | null {
    return this.mealPlans.find(p => p.date === date && p.mealType === mealType) || null;
  }

  getAllMealPlans(): MealPlan[] {
    return [...this.mealPlans];
  }

  getWeekMealPlans(): Record<string, Record<MealType, Recipe | null>> {
    const dates = getWeekDates();
    const result: Record<string, Record<MealType, Recipe | null>> = {};

    for (const date of dates) {
      result[date] = {
        breakfast: null,
        lunch: null,
        dinner: null
      };

      for (const mealType of ['breakfast', 'lunch', 'dinner'] as MealType[]) {
        const plan = this.getMealPlan(date, mealType);
        if (plan) {
          result[date][mealType] = this.recipeManager.getRecipeById(plan.recipeId);
        }
      }
    }

    return result;
  }

  clearWeekPlans(): void {
    const weekDates = getWeekDates();
    this.mealPlans = this.mealPlans.filter(p => !weekDates.includes(p.date));
    this.savePlansToStorage();
  }

  generateShoppingList(): ShoppingItem[] {
    const weekDates = getWeekDates();
    const weekPlans = this.mealPlans.filter(p => weekDates.includes(p.date));

    const ingredientMap = new Map<string, {
      category: IngredientCategory;
      amounts: string[];
    }>();

    for (const plan of weekPlans) {
      const recipe = this.recipeManager.getRecipeById(plan.recipeId);
      if (!recipe) continue;

      for (const ing of recipe.ingredients) {
        const key = ing.name.toLowerCase();
        if (ingredientMap.has(key)) {
          ingredientMap.get(key)!.amounts.push(ing.amount);
        } else {
          ingredientMap.set(key, {
            category: ing.category,
            amounts: [ing.amount]
          });
        }
      }
    }

    const items: ShoppingItem[] = [];
    ingredientMap.forEach((value, key) => {
      items.push({
        id: 'shop_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        name: key.charAt(0).toUpperCase() + key.slice(1),
        category: value.category,
        amount: this.mergeAmounts(value.amounts),
        checked: false
      });
    });

    const sortedItems = items.sort((a, b) => a.category.localeCompare(b.category));

    return sortedItems;
  }

  private mergeAmounts(amounts: string[]): string {
    if (amounts.length === 1) return amounts[0];

    const quantityMap = new Map<string, number>();
    for (const amount of amounts) {
      const match = amount.match(/^([\d./]+)\s*(.*)$/);
      if (match) {
        const qty = parseFloat(match[1]);
        const unit = match[2] || '';
        const key = unit;
        quantityMap.set(key, (quantityMap.get(key) || 0) + qty);
      }
    }

    const parts: string[] = [];
    quantityMap.forEach((qty, unit) => {
      parts.push(`${qty}${unit ? ' ' + unit : ''}`);
    });

    return parts.length > 0 ? parts.join(' + ') : amounts.join(' + ');
  }

  addExtraShoppingItem(name: string, amount: string): ExtraShoppingItem {
    const item: ExtraShoppingItem = {
      id: 'extra_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      name,
      amount,
      checked: false
    };
    this.extraShoppingItems.push(item);
    this.saveShoppingItemsToStorage();
    return item;
  }

  removeExtraShoppingItem(id: string): boolean {
    const index = this.extraShoppingItems.findIndex(i => i.id === id);
    if (index === -1) return false;
    this.extraShoppingItems.splice(index, 1);
    this.saveShoppingItemsToStorage();
    return true;
  }

  toggleExtraShoppingItem(id: string): boolean {
    const item = this.extraShoppingItems.find(i => i.id === id);
    if (!item) return false;
    item.checked = !item.checked;
    this.saveShoppingItemsToStorage();
    return item.checked;
  }

  getExtraShoppingItems(): ExtraShoppingItem[] {
    return [...this.extraShoppingItems];
  }

  clearExtraShoppingItems(): void {
    this.extraShoppingItems = [];
    this.saveShoppingItemsToStorage();
  }
}
