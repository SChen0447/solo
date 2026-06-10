import React, { useState, useCallback } from 'react';
import TransactionForm from './TransactionForm';
import TransactionList from './TransactionList';
import ChartPanel from './ChartPanel';
import { Transaction } from '../types';
import {
  initDataStore,
  addTransaction,
  deleteTransaction,
  resetToMockData
} from '../dataStore';

const Dashboard: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>(() => initDataStore());

  const handleAdd = useCallback(
    (data: {
      amount: number;
      category: string;
      date: string;
      note: string;
      type: 'income' | 'expense';
    }) => {
      setTransactions(prev => addTransaction(prev, data));
    },
    []
  );

  const handleDelete = useCallback((id: string) => {
    setTransactions(prev => deleteTransaction(prev, id));
  }, []);

  const handleReset = useCallback(() => {
    if (confirm('确定要重置为演示数据吗？当前数据将被清除。')) {
      setTransactions(resetToMockData());
    }
  }, []);

  return (
    <div>
      <nav className="navbar">
        <h1>我的财务仪表板</h1>
        <button onClick={handleReset}>🔄 刷新数据</button>
      </nav>

      <div className="main-container">
        <div className="left-column">
          <div className="form-section">
            <h2>添加交易记录</h2>
            <TransactionForm onSubmit={handleAdd} />
          </div>
          <ChartPanel transactions={transactions} />
        </div>
        <div className="right-column">
          <div className="list-section">
            <h2>交易记录</h2>
            <TransactionList
              transactions={transactions}
              onDelete={handleDelete}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
