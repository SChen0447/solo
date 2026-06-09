export interface User {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: number;
}

export interface RecipeElements {
  stardust: number;
  lightdust: number;
  darkmatter: number;
}

export interface RecipeConditions {
  temperature: number;
  pressure: number;
  stirRate: number;
}

export interface Recipe {
  id: string;
  ownerId: string;
  ownerName: string;
  name: string;
  createdAt: number;
  isPublic: boolean;
  elements: RecipeElements;
  conditions: RecipeConditions;
  color: string;
  particleDensity: number;
  likes: string[];
}

export const users = new Map<string, User>();
export const recipes = new Map<string, Recipe>();
export const usernameIndex = new Map<string, string>();

export function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

function seedDemoData() {
  const demoRecipes: Omit<Recipe, 'id' | 'createdAt'>[] = [
    {
      ownerId: 'system',
      ownerName: '炼金大师',
      name: '晨曦星屑',
      isPublic: true,
      elements: { stardust: 3, lightdust: 2, darkmatter: 1 },
      conditions: { temperature: 45, pressure: 1.5, stirRate: 30 },
      color: '#ffcc66',
      particleDensity: 60,
      likes: []
    },
    {
      ownerId: 'system',
      ownerName: '炼金大师',
      name: '深空幽蓝',
      isPublic: true,
      elements: { stardust: 1, lightdust: 4, darkmatter: 2 },
      conditions: { temperature: -20, pressure: 2.0, stirRate: 50 },
      color: '#66aaff',
      particleDensity: 80,
      likes: []
    },
    {
      ownerId: 'system',
      ownerName: '炼金大师',
      name: '紫晶幻影',
      isPublic: true,
      elements: { stardust: 2, lightdust: 1, darkmatter: 4 },
      conditions: { temperature: 80, pressure: 3.0, stirRate: 70 },
      color: '#6633cc',
      particleDensity: 90,
      likes: []
    },
    {
      ownerId: 'system',
      ownerName: '炼金大师',
      name: '极光幻彩',
      isPublic: true,
      elements: { stardust: 3, lightdust: 3, darkmatter: 3 },
      conditions: { temperature: 25, pressure: 1.0, stirRate: 60 },
      color: '#ff66aa',
      particleDensity: 75,
      likes: []
    }
  ];
  demoRecipes.forEach(r => {
    const id = genId();
    recipes.set(id, { ...r, id, createdAt: Date.now() - Math.random() * 86400000 });
  });
}

seedDemoData();
