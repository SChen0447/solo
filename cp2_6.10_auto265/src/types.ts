export interface Flower {
  id: string;
  name: string;
  color: string;
  season: string;
  price: number;
  stock: number;
  emoji: string;
  description: string;
}

export interface CartItem {
  flowerId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  date: string;
  items: CartItem[];
  total: number;
  status: string;
}

export interface SchemeElement {
  id?: string;
  flowerId: string;
  name: string;
  emoji: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  label: string;
}

export interface Scheme {
  id: string;
  name: string;
  date: string;
  elements: SchemeElement[];
}

export type Page = 'dashboard' | 'flowers' | 'orders' | 'inspiration';

export interface AppState {
  flowers: Flower[];
  cart: CartItem[];
  orders: Order[];
  schemes: Scheme[];
  currentPage: Page;
  cartOpen: boolean;
}

export type AppAction =
  | { type: 'SET_FLOWERS'; payload: Flower[] }
  | { type: 'SET_ORDERS'; payload: Order[] }
  | { type: 'SET_SCHEMES'; payload: Scheme[] }
  | { type: 'ADD_TO_CART'; payload: Flower }
  | { type: 'REMOVE_FROM_CART'; payload: string }
  | { type: 'UPDATE_CART_QTY'; payload: { flowerId: string; quantity: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'ADD_ORDER'; payload: Order }
  | { type: 'ADD_SCHEME'; payload: Scheme }
  | { type: 'SET_PAGE'; payload: Page }
  | { type: 'TOGGLE_CART' };
