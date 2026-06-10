import React, { useMemo } from 'react';
import { Transaction } from '../types';

type FilterType = 'all' | 'income' | 'expense';

interface TransactionListProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
}

const TransactionList: React.FC<TransactionListProps> = ({ transactions, onDelete }) => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filter, setFilter] = React.useState<FilterType>('all');

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      if (filter === 'income' && tx.type !== 'income') return false;
      if (filter === 'expense' && tx.type !== 'expense') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        return (
          tx.note.toLowerCase().includes(q) ||
          tx.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [transactions, searchQuery, filter]);

  const formatAmount = (amount: number, type: 'income' | 'expense') => {
  const sign = type === 'income' ? '+' : '-';
  return `${sign}￥${amount.toFixed(2)}`;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  return (
    <>
      <div className="search-filter-bar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="搜索备注或类别..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="filter-buttons">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            全部
          </button>
          <button
            className={`filter-btn ${filter === 'income' ? 'active' : ''}`}
            onClick={() => setFilter('income')}
          >
            收入
          </button>
          <button
            className={`filter-btn ${filter === 'expense' ? 'active' : ''}`}
            onClick={() => setFilter('expense')}
          >
            支出
          </button>
        </div>
      </div>

      <div className="transaction-list">
        {filteredTransactions.length === 0 ? (
          <div className="empty-state">暂无交易记录</div>
          ) : (
            filteredTransactions.map(tx => (
              <div key={tx.id} className={`transaction-card ${tx.type}`}>
                <div className="card-info">
                  <div className="note">{tx.note || '无备注'}</div>
                  <div className="meta">
                    <span>{tx.category}</span>
                    <span>{formatDate(tx.date)}</span>
                  </div>
                </div>
                <div className={`card-amount ${tx.type}`}>
                  {formatAmount(tx.amount, tx.type)}
                </div>
                <button
                  className="delete-btn"
                  onClick={() => onDelete(tx.id)}
                  title="删除"
                >
                  ×
                </button>
              </div>
            ))
          )}
      </div>
    </>
  );
};

export default TransactionList;
