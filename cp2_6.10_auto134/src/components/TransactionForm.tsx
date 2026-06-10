import React, { useState } from 'react';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../types';

interface TransactionFormProps {
  onSubmit: (data: {
    amount: number;
    category: string;
    date: string;
    note: string;
    type: 'income' | 'expense';
  }) => void;
}

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

const TransactionForm: React.FC<TransactionFormProps> = ({ onSubmit }) => {
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [date, setDate] = useState<string>(getToday());
  const [note, setNote] = useState<string>('');
  const [type, setType] = useState<'income' | 'expense'>('expense');

  const categories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const handleTypeChange = (newType: 'income' | 'expense') => {
    setType(newType);
    const defaultCategory =
      newType === 'expense' ? EXPENSE_CATEGORIES[0] : INCOME_CATEGORIES[0];
    setCategory(defaultCategory);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return;
    }
    onSubmit({
      amount: Math.round(amountNum * 100) / 100,
      category,
      date,
      note: note.slice(0, 50),
      type
    });
    setAmount('');
    setNote('');
  };

  const isValid = parseFloat(amount) > 0;

  return (
    <form className="transaction-form" onSubmit={handleSubmit}>
      <div className="form-group full-width">
        <label>类型</label>
        <div className="type-toggle">
          <label>
            <input
              type="radio"
              checked={type === 'expense'}
              onChange={() => handleTypeChange('expense')}
            />
            支出
          </label>
          <label>
            <input
              type="radio"
              checked={type === 'income'}
              onChange={() => handleTypeChange('income')}
            />
            收入
          </label>
        </div>
      </div>

      <div className="form-group">
        <label>金额 (￥)</label>
        <input
          type="number"
          min="0.01"
        step="0.01"
        value={amount}
        onChange={e => setAmount(e.target.value)}
        placeholder="请输入金额"
        required
      />
    </div>

    <div className="form-group">
      <label>类别</label>
      <select value={category} onChange={e => setCategory(e.target.value)}>
        {categories.map(c => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </div>

    <div className="form-group">
      <label>日期</label>
      <input
        type="date"
        value={date}
        onChange={e => setDate(e.target.value)}
      />
    </div>

    <div className="form-group full-width">
      <label>备注 (最多50字)</label>
      <textarea
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="可选，记录详情..."
        maxLength={50}
      />
    </div>

    <button type="submit" className="submit-btn" disabled={!isValid}>
      添加
    </button>
  </form>
  );
};

export default TransactionForm;
