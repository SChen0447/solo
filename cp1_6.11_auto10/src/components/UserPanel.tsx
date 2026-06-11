import React, { useEffect, useRef, useState } from 'react';
import type { Trade } from '../types';

interface UserPanelProps {
  userId: string;
  userName: string;
  balance: number;
  trades: Trade[];
}

const UserPanel: React.FC<UserPanelProps> = ({ userId, userName, balance, trades }) => {
  const [displayBalance, setDisplayBalance] = useState(balance);
  const prevBalanceRef = useRef(balance);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const prev = prevBalanceRef.current;
    if (prev === balance) return;

    const startTime = performance.now();
    const duration = 500;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(prev + (balance - prev) * eased);
      setDisplayBalance(current);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        prevBalanceRef.current = balance;
      }
    };

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [balance]);

  const formatTime = (timeStr: string) => {
    const d = new Date(timeStr);
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="user-panel">
      <div className="panel-header">
        <div className="avatar">{userName.charAt(0).toUpperCase()}</div>
        <div className="user-info">
          <h2>{userName}</h2>
          <span className="user-id">ID: {userId.slice(0, 8)}</span>
        </div>
      </div>

      <div className="balance-section">
        <span className="balance-label">积分余额</span>
        <div className="balance-value" key={balance}>
          <span className="balance-number">{displayBalance}</span>
          <span className="balance-unit"> PTS</span>
        </div>
      </div>

      <div className="trades-section">
        <h3>交易记录</h3>
        <div className="trades-list">
          {trades.length === 0 ? (
            <div className="no-trades">暂无交易记录</div>
          ) : (
            trades.map((trade) => (
              <div key={trade.id} className="trade-item trade-item-enter">
                <div className="trade-item-top">
                  <span className={`trade-type ${trade.type}`}>
                    {trade.type === 'buy' ? '买入' : '卖出'}
                  </span>
                  <span className="trade-time">{formatTime(trade.time)}</span>
                </div>
                <div className="trade-item-bottom">
                  <span className="trade-detail">
                    {trade.quantity} 份 × {trade.price} PTS
                  </span>
                  <span className={`trade-total ${trade.type}`}>
                    {trade.type === 'buy' ? '-' : '+'}{trade.total} PTS
                  </span>
                </div>
                <div className="trade-counterparty">
                  对手方: {trade.counterparty}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default UserPanel;
