export type Category = '咖啡' | '甜点' | '轻食' | '特调';

export interface MenuItem {
  id: string;
  name: string;
  category: Category;
  price: number;
  description: string;
  waitTime: number;
}

export interface OrderHistory {
  hour: string;
  orders: number;
}

export interface WaitTime {
  itemId: string;
  minutes: number;
  updatedAt: number;
}

export interface MenuItemWithHistory extends MenuItem {
  orderHistory: OrderHistory[];
}
