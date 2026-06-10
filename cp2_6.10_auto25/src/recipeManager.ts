export type IngredientCategory = '蔬菜' | '肉类' | '调味品' | '主食' | '海鲜' | '乳制品' | '其他';
export type CuisineType = '中式' | '意式' | '日式' | '韩式' | '西式' | '其他';
export type DifficultyLevel = 1 | 2 | 3 | 4 | 5;

export interface Ingredient {
  name: string;
  amount: string;
  category: IngredientCategory;
}

export interface RecipeStep {
  order: number;
  description: string;
  image?: string;
}

export interface Recipe {
  id: string;
  name: string;
  coverImage: string;
  cuisine: CuisineType;
  difficulty: DifficultyLevel;
  ingredients: Ingredient[];
  steps: RecipeStep[];
  isFavorite: boolean;
  createdAt: string;
}

export interface SearchFilter {
  keyword?: string;
  difficulty?: DifficultyLevel | null;
  cuisine?: CuisineType | null;
}

const STORAGE_KEY = 'recipe_planner_recipes';

export class RecipeManager {
  private recipes: Recipe[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        this.recipes = JSON.parse(data) as Recipe[];
      }
    } catch (e) {
      console.error('加载食谱数据失败:', e);
      this.recipes = [];
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.recipes));
    } catch (e) {
      console.error('保存食谱数据失败:', e);
    }
  }

  private generateId(): string {
    return 'recipe_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  addRecipe(data: Omit<Recipe, 'id' | 'createdAt' | 'isFavorite'>): Recipe {
    const recipe: Recipe = {
      ...data,
      id: this.generateId(),
      isFavorite: false,
      createdAt: new Date().toISOString()
    };
    this.recipes.unshift(recipe);
    this.saveToStorage();
    return recipe;
  }

  updateRecipe(id: string, data: Partial<Omit<Recipe, 'id' | 'createdAt'>>): Recipe | null {
    const index = this.recipes.findIndex(r => r.id === id);
    if (index === -1) return null;
    this.recipes[index] = { ...this.recipes[index], ...data };
    this.saveToStorage();
    return this.recipes[index];
  }

  deleteRecipe(id: string): boolean {
    const index = this.recipes.findIndex(r => r.id === id);
    if (index === -1) return false;
    this.recipes.splice(index, 1);
    this.saveToStorage();
    return true;
  }

  getRecipeById(id: string): Recipe | null {
    return this.recipes.find(r => r.id === id) || null;
  }

  getAllRecipes(): Recipe[] {
    return [...this.recipes];
  }

  toggleFavorite(id: string): boolean {
    const recipe = this.getRecipeById(id);
    if (!recipe) return false;
    recipe.isFavorite = !recipe.isFavorite;
    this.saveToStorage();
    return recipe.isFavorite;
  }

  searchRecipes(filter: SearchFilter): Recipe[] {
    let results = [...this.recipes];

    if (filter.keyword && filter.keyword.trim()) {
      const keyword = filter.keyword.trim().toLowerCase();
      results = results.filter(r => {
        const nameMatch = r.name.toLowerCase().includes(keyword);
        const ingredientMatch = r.ingredients.some(
          ing => ing.name.toLowerCase().includes(keyword)
        );
        return nameMatch || ingredientMatch;
      });
    }

    if (filter.difficulty) {
      results = results.filter(r => r.difficulty === filter.difficulty);
    }

    if (filter.cuisine) {
      results = results.filter(r => r.cuisine === filter.cuisine);
    }

    return results;
  }

  getPaginatedRecipes(page: number, pageSize: number, filter?: SearchFilter): {
    recipes: Recipe[];
    total: number;
    hasMore: boolean;
  } {
    const all = filter ? this.searchRecipes(filter) : this.getAllRecipes();
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return {
      recipes: all.slice(start, end),
      total: all.length,
      hasMore: end < all.length
    };
  }
}
