import { v4 as uuidv4 } from 'uuid';
import { Transaction, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from './types';

const STORAGE_KEY = 'finance_dashboard_transactions';

function generateRandomDate(): string {
  const now = new Date();
  const daysAgo = Math.floor(Math.random() * 90);
  const date = new Date(now);
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
}

function generateMockTransactions(): Transaction[] {
  const transactions: Transaction[] = [];
  const expenseNotes = ['午餐', '地铁通勤', '网购衣服', '电影票', '体检', '书籍', '日用品'];
  const incomeNotes = ['月薪', '季度奖', '股票收益', '周末兼职', '项目奖金'];

  for (let i = 0; i < 7; i++) {
    transactions.push({
      id: uuidv4(),
      amount: Math.round((Math.random() * 500 + 20) * 100) / 100,
      category: EXPENSE_CATEGORIES[i % EXPENSE_CATEGORIES.length],
      date: generateRandomDate(),
      note: expenseNotes[i],
      type: 'expense',
      currency: 'CNY'
    });
  }

  for (let i = 0; i < 3; i++) {
    transactions.push({
      id: uuidv4(),
      amount: Math.round((Math.random() * 8000 + 1000) * 100) / 100,
      category: INCOME_CATEGORIES[i % INCOME_CATEGORIES.length],
      date: generateRandomDate(),
      note: incomeNotes[i],
      type: 'income',
      currency: 'CNY'
    });
  }

  return transactions;
}

export function initDataStore(): Transaction[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      const mock = generateMockTransactions();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mock));
      return mock;
    }
  }
  const mock = generateMockTransactions();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(mock));
  return mock;
}

export function saveTransactions(transactions: Transaction[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

export function addTransaction(
  transactions: Transaction[],
  data: Omit<Transaction, 'id' | 'currency'>
): Transaction[] {
  const newTx: Transaction = {
    ...data,
    id: uuidv4(),
    currency: 'CNY'
  };
  const updated = [newTx, ...transactions];
  saveTransactions(updated);
  return updated;
}

export function deleteTransaction(transactions: Transaction[], id: string): Transaction[] {
  const updated = transactions.filter(t => t.id !== id);
  saveTransactions(updated);
  return updated;
}

export function resetToMockData(): Transaction[] {
  const mock = generateMockTransactions();
  saveTransactions(mock);
  return mock;
}

export interface MonthlySummary {
  month: number;
  income: number;
  expense: number;
}

export function getMonthlySummary(transactions: Transaction[], year: number): MonthlySummary[] {
  const months: MonthlySummary[] = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    income: 0,
    expense: 0
  }));

  for (const tx of transactions) {
    const txDate = new Date(tx.date);
    if (txDate.getFullYear() === year) {
      const idx = txDate.getMonth();
      if (tx.type === 'income') {
        months[idx].income += tx.amount;
      } else {
        months[idx].expense += tx.amount;
      }
    }
  }

  return months;
}

export interface CategorySummary {
  category: string;
  amount: number;
  percentage: number;
}

export function getCategorySummary(
  transactions: Transaction[],
  year: number,
  month?: number
): CategorySummary[] {
  const filtered = transactions.filter(tx => {
    if (tx.type !== 'expense') return false;
    const d = new Date(tx.date);
    if (d.getFullYear() !== year) return false;
    if (month !== undefined && d.getMonth() + 1 !== month) return false;
    return true;
  });

  const map = new Map<string, number>();
  let total = 0;
  for (const tx of filtered) {
    const prev = map.get(tx.category) || 0;
    map.set(tx.category, prev + tx.amount);
    total += tx.amount;
  }

  const result: CategorySummary[] = [];
  for (const [category, amount] of map.entries()) {
    result.push({
      category,
      amount,
      percentage: total > 0 ? Math.round((amount / total) * 10000) / 100 : 0
    });
  }
  return result.sort((a, b) => b.amount - a.amount);
}

export function getTotalExpense(
  transactions: Transaction[],
  year: number,
  month?: number
): number {
  return transactions
    .filter(tx => {
      if (tx.type !== 'expense') return false;
      const d = new Date(tx.date);
      if (d.getFullYear() !== year) return false;
      if (month !== undefined && d.getMonth() + 1 !== month) return false;
      return true;
    })
    .reduce((sum, tx) => sum + tx.amount, 0);
}
