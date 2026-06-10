export interface Transaction {
  id: string;
  amount: number;
  category: string;
  date: string;
  note: string;
  type: 'income' | 'expense';
  currency: string;
}

export const EXPENSE_CATEGORIES = ['餐饮', '交通', '购物', '娱乐', '医疗', '教育', '其他'];
export const INCOME_CATEGORIES = ['工资', '奖金', '投资', '兼职', '其他'];

export const CATEGORY_COLORS: Record<string, string> = {
  '餐饮': '#e74c3c',
  '交通': '#f39c12',
  '购物': '#2ecc71',
  '娱乐': '#3498db',
  '医疗': '#9b59b6',
  '教育': '#1abc9c',
  '其他': '#95a5a6',
  '工资': '#27ae60',
  '奖金': '#16a085',
  '投资': '#2980b9',
  '兼职': '#8e44ad'
};

export const PIE_COLORS = ['#e74c3c', '#f39c12', '#2ecc71', '#3498db', '#9b59b6', '#1abc9c', '#95a5a6'];
