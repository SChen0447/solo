export type TransactionType = 'income' | 'expense';

export type Category = '餐饮' | '交通' | '购物' | '其他';

export interface Transaction {
  id?: number;
  type: TransactionType;
  amount: number;
  category: Category;
  note: string;
  timestamp: number;
}

export interface Budget {
  date: string;
  amount: number;
}

export const CATEGORIES: Category[] = ['餐饮', '交通', '购物', '其他'];

export const CATEGORY_COLORS: Record<Category, string> = {
  '餐饮': '#3498db',
  '交通': '#e67e22',
  '购物': '#2ecc71',
  '其他': '#9b59b6',
};

export const DEFAULT_DAILY_BUDGET = 200;
