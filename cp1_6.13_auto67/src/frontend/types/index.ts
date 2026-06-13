export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: boolean;
  description: string;
  image: string;
  colors: string[];
  stitchColors: string[];
}

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  image: string;
  price: number;
  color: string;
  stitchColor: string;
  engraving: string;
  quantity: number;
}

export interface Order {
  id: string;
  productId: string;
  productName: string;
  customerName: string;
  customerEmail: string;
  color: string;
  stitchColor: string;
  engraving: string;
  quantity: number;
  price: number;
  status: 'pending' | 'making' | 'completed' | 'shipped';
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
}

export type OrderStatus = 'pending' | 'making' | 'completed' | 'shipped';

export const statusMap: Record<OrderStatus, string> = {
  pending: '待确认',
  making: '制作中',
  completed: '已完成',
  shipped: '已寄出'
};

export const categoryMap: Record<string, string> = {
  all: '全部',
  wallet: '钱包',
  backpack: '背包',
  belt: '腰带',
  bracelet: '手环',
  keychain: '钥匙扣'
};
