import { v4 as uuidv4 } from 'uuid';

export interface Drink {
  id: string;
  name: string;
  price: number;
  description: string;
  imageUrl: string;
  isNew: boolean;
  categoryId: string;
  createdAt: number;
}

export interface Category {
  id: string;
  name: string;
  order: number;
}

export interface MenuData {
  categories: Category[];
  drinks: Drink[];
}

const MENU_STORAGE_KEY = 'cafe_menu_data';
const FAVORITES_STORAGE_KEY = 'cafe_favorites';

const defaultCategories: Category[] = [
  { id: uuidv4(), name: '经典咖啡', order: 0 },
  { id: uuidv4(), name: '特调饮品', order: 1 },
  { id: uuidv4(), name: '茶饮', order: 2 },
  { id: uuidv4(), name: '甜点', order: 3 },
];

const defaultDrinks: Drink[] = [
  {
    id: uuidv4(),
    name: '美式咖啡',
    price: 28,
    description: '经典美式，醇厚浓郁',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=americano%20coffee%20in%20a%20white%20ceramic%20cup%20on%20wooden%20table%2C%20warm%20lighting%2C%20professional%20food%20photography&image_size=square',
    isNew: false,
    categoryId: defaultCategories[0].id,
    createdAt: Date.now() - 86400000,
  },
  {
    id: uuidv4(),
    name: '拿铁',
    price: 32,
    description: '丝滑牛奶与浓缩的完美融合',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=latte%20coffee%20with%20latte%20art%20in%20a%20glass%20cup%2C%20warm%20cafe%20atmosphere%2C%20professional%20photography&image_size=square',
    isNew: false,
    categoryId: defaultCategories[0].id,
    createdAt: Date.now() - 86400000,
  },
  {
    id: uuidv4(),
    name: '卡布奇诺',
    price: 32,
    description: '绵密奶泡，香浓可口',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=cappuccino%20with%20thick%20foam%20and%20cocoa%20powder%20on%20top%2C%20cafe%20setting%2C%20professional%20photography&image_size=square',
    isNew: false,
    categoryId: defaultCategories[0].id,
    createdAt: Date.now() - 86400000,
  },
  {
    id: uuidv4(),
    name: '焦糖玛奇朵',
    price: 36,
    description: '焦糖淋面，甜蜜交织',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=caramel%20macchiato%20with%20caramel%20drizzle%20in%20a%20tall%20glass%2C%20warm%20lighting%2C%20professional%20photography&image_size=square',
    isNew: true,
    categoryId: defaultCategories[1].id,
    createdAt: Date.now(),
  },
  {
    id: uuidv4(),
    name: '摩卡星冰乐',
    price: 38,
    description: '冰爽巧克力咖啡体验',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=mocha%20frappuccino%20blended%20ice%20coffee%20with%20whipped%20cream%2C%20professional%20photography&image_size=square',
    isNew: true,
    categoryId: defaultCategories[1].id,
    createdAt: Date.now(),
  },
  {
    id: uuidv4(),
    name: '伯爵红茶',
    price: 26,
    description: '英式经典，佛手柑芳香',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=earl%20grey%20tea%20in%20elegant%20teacup%20with%20steam%2C%20warm%20atmosphere%2C%20professional%20photography&image_size=square',
    isNew: false,
    categoryId: defaultCategories[2].id,
    createdAt: Date.now() - 86400000,
  },
  {
    id: uuidv4(),
    name: '抹茶拿铁',
    price: 34,
    description: '日式抹茶与牛奶的碰撞',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=matcha%20latte%20in%20a%20glass%20with%20green%20layer%2C%20professional%20food%20photography&image_size=square',
    isNew: false,
    categoryId: defaultCategories[2].id,
    createdAt: Date.now() - 86400000,
  },
  {
    id: uuidv4(),
    name: '提拉米苏',
    price: 42,
    description: '意式经典，层层醇香',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=tiramisu%20dessert%20on%20a%20plate%2C%20cocoa%20powder%20topping%2C%20cafe%20setting%2C%20professional%20photography&image_size=square',
    isNew: false,
    categoryId: defaultCategories[3].id,
    createdAt: Date.now() - 86400000,
  },
];

export function loadMenuData(): MenuData {
  try {
    const raw = localStorage.getItem(MENU_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as MenuData;
    }
  } catch {
    // ignore parse errors
  }
  const data: MenuData = { categories: defaultCategories, drinks: defaultDrinks };
  saveMenuData(data);
  return data;
}

export function saveMenuData(data: MenuData): void {
  localStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(data));
}

export function addCategory(data: MenuData, name: string): MenuData {
  const maxOrder = data.categories.reduce((max, c) => Math.max(max, c.order), -1);
  const newCategory: Category = { id: uuidv4(), name, order: maxOrder + 1 };
  const updated = { ...data, categories: [...data.categories, newCategory] };
  saveMenuData(updated);
  return updated;
}

export function deleteCategory(data: MenuData, categoryId: string): MenuData {
  const updated = {
    categories: data.categories.filter((c) => c.id !== categoryId),
    drinks: data.drinks.filter((d) => d.categoryId !== categoryId),
  };
  saveMenuData(updated);
  return updated;
}

export function addDrink(data: MenuData, categoryId: string): MenuData {
  const newDrink: Drink = {
    id: uuidv4(),
    name: '',
    price: 0,
    description: '',
    imageUrl: '',
    isNew: true,
    categoryId,
    createdAt: Date.now(),
  };
  const updated = { ...data, drinks: [...data.drinks, newDrink] };
  saveMenuData(updated);
  return updated;
}

export function updateDrink(data: MenuData, drinkId: string, changes: Partial<Drink>): MenuData {
  const updated = {
    ...data,
    drinks: data.drinks.map((d) => (d.id === drinkId ? { ...d, ...changes } : d)),
  };
  saveMenuData(updated);
  return updated;
}

export function deleteDrink(data: MenuData, drinkId: string): MenuData {
  const updated = { ...data, drinks: data.drinks.filter((d) => d.id !== drinkId) };
  saveMenuData(updated);
  return updated;
}

export function loadFavorites(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as string[];
    }
  } catch {
    // ignore
  }
  return [];
}

export function saveFavorites(favorites: string[]): void {
  localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
}

export function toggleFavorite(drinkId: string): string[] {
  const favorites = loadFavorites();
  const index = favorites.indexOf(drinkId);
  if (index >= 0) {
    favorites.splice(index, 1);
  } else {
    favorites.push(drinkId);
  }
  saveFavorites(favorites);
  return favorites;
}

export function isFavorite(drinkId: string): boolean {
  return loadFavorites().includes(drinkId);
}
