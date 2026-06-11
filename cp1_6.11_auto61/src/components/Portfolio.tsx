import React, { useEffect, useRef, useState } from 'react';
import type { PortfolioItem } from '../types';
import { TrendingUp, TrendingDown, Wallet, PieChart } from 'lucide-react';

interface PortfolioProps {
  portfolio: PortfolioItem[];
  balance: number;
  totalAssets: number;
  returnRate: number;
  onStockClick?: (stockId: string) => void;
}

const AnimatedNumber: React.FC<{
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  duration?: number;
}> = ({ value, decimals = 2, prefix = '', suffix = '', className = '', duration = 200 }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const previousValue = useRef(value);
  const animRef = useRef<number>();
  const bounceRef = useRef(false);

  useEffect(() => {
    if (previousValue.current === value) return;
    const startValue = previousValue.current;
    const diff = value - startValue;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(startValue + diff * eased);
      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        previousValue.current = value;
      }
    };

    bounceRef.current = true;
    setTimeout(() => { bounceRef.current = false; }, 300);
    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [value, duration]);

  const formatNumber = (v: number) => {
    if (v >= 1000000) return (v / 1000000).toFixed(2) + 'M';
    if (v >= 1000) return (v / 1000).toFixed(1) + 'K';
    return v.toFixed(decimals);
  };

  return (
    <span
      className={`${className} ${bounceRef.current ? 'bounce' : ''}`}
      style={{ display: 'inline-block' }}
    >
      {prefix}{formatNumber(displayValue)}{suffix}
    </span>
  );
};

const Portfolio: React.FC<PortfolioProps> = ({
  portfolio,
  balance,
  totalAssets,
  returnRate,
  onStockClick,
}) => {
  const portfolioValue = portfolio.reduce(
    (sum, p) => sum + p.currentPrice * p.quantity,
    0
  );

  return (
    <div className="portfolio-container">
      <div className="portfolio-header">
        <h3 className="portfolio-title">
          <PieChart size={20} className="title-icon" />
          我的持仓
        </h3>
        <div className="portfolio-summary">
          <div className="summary-item">
            <Wallet size={14} />
            <span className="summary-label">可用余额</span>
            <span className="summary-value">
              <AnimatedNumber value={balance} prefix="$" />
            </span>
          </div>
          <div className="summary-divider" />
          <div className="summary-item">
            <PieChart size={14} />
            <span className="summary-label">总资产</span>
            <span className="summary-value total">
              <AnimatedNumber value={totalAssets} prefix="$" />
            </span>
          </div>
          <div className="summary-divider" />
          <div className={`summary-item return ${returnRate >= 0 ? 'positive' : 'negative'}`}>
            {returnRate >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span className="summary-label">收益率</span>
            <span className="summary-value">
              <AnimatedNumber value={returnRate} prefix={returnRate >= 0 ? '+' : ''} suffix="%" decimals={2} />
            </span>
          </div>
        </div>
      </div>

      <div className="portfolio-grid">
        {portfolio.length === 0 ? (
          <div className="portfolio-empty">
            <PieChart size={48} className="empty-icon" />
            <p>暂无持仓</p>
            <span>去交易页面买入第一只股票吧！</span>
          </div>
        ) : (
          portfolio.map(item => {
            const pnl = (item.currentPrice - item.avgCost) * item.quantity;
            const pnlPercent = ((item.currentPrice - item.avgCost) / item.avgCost) * 100;
            const isPositive = pnl >= 0;
            const marketValue = item.currentPrice * item.quantity;

            return (
              <div
                key={item.stockId}
                className="portfolio-card"
                onClick={() => onStockClick?.(item.stockId)}
              >
                <div className="card-header">
                  <div className="stock-badge">{item.stockCode}</div>
                  <div className={`pnl-badge ${isPositive ? 'positive' : 'negative'}`}>
                    {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    <AnimatedNumber
                      value={pnlPercent}
                      prefix={isPositive ? '+' : ''}
                      suffix="%"
                      decimals={2}
                    />
                  </div>
                </div>
                <div className="card-body">
                  <div className="card-row">
                    <span className="label">持股数</span>
                    <span className="value">{item.quantity.toLocaleString()}</span>
                  </div>
                  <div className="card-row">
                    <span className="label">市值</span>
                    <span className="value">
                      <AnimatedNumber value={marketValue} prefix="$" />
                    </span>
                  </div>
                  <div className="card-row">
                    <span className="label">成本</span>
                    <span className="value muted">${item.avgCost.toFixed(2)}</span>
                  </div>
                </div>
                <div className={`card-footer ${isPositive ? 'positive' : 'negative'}`}>
                  {isPositive ? '+' : ''}
                  <AnimatedNumber value={pnl} prefix="$" decimals={2} />
                </div>
              </div>
            );
          })
        )}
      </div>

      <style>{`
        .portfolio-container {
          background: linear-gradient(180deg, var(--bg-card) 0%, var(--bg-secondary) 100%);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: 20px;
          box-shadow: var(--shadow-card);
        }
        .portfolio-header {
          margin-bottom: 20px;
        }
        .portfolio-title {
          font-size: 16px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-primary);
          margin-bottom: 16px;
        }
        .title-icon {
          color: var(--accent-green);
        }
        .portfolio-summary {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 14px 18px;
          background: var(--bg-secondary);
          border-radius: var(--radius-md);
          flex-wrap: wrap;
        }
        .summary-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
        }
        .summary-item svg { color: var(--text-secondary); }
        .summary-label { color: var(--text-secondary); }
        .summary-value {
          font-weight: 700;
          color: var(--text-primary);
          margin-left: 4px;
        }
        .summary-value.total { color: var(--accent-blue); font-size: 15px; }
        .summary-item.return.positive svg { color: var(--accent-green); }
        .summary-item.return.positive .summary-value { color: var(--accent-green); }
        .summary-item.return.negative svg { color: var(--accent-red); }
        .summary-item.return.negative .summary-value { color: var(--accent-red); }
        .summary-divider {
          width: 1px;
          height: 24px;
          background: var(--border-color);
        }
        .portfolio-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 14px;
        }
        .portfolio-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 14px;
          cursor: pointer;
          transition: all var(--transition-normal);
          position: relative;
          overflow: hidden;
        }
        .portfolio-card:hover {
          transform: translateY(-2px);
          border-color: var(--accent-blue);
          box-shadow: var(--shadow-hover);
        }
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .stock-badge {
          background: linear-gradient(135deg, var(--accent-blue) 0%, #0088cc 100%);
          color: white;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.5px;
        }
        .pnl-badge {
          display: flex;
          align-items: center;
          gap: 3px;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 700;
        }
        .pnl-badge.positive {
          background: var(--accent-green-glow);
          color: var(--accent-green);
        }
        .pnl-badge.negative {
          background: var(--accent-red-glow);
          color: var(--accent-red);
        }
        .card-body {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 10px;
        }
        .card-row {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
        }
        .card-row .label { color: var(--text-muted); }
        .card-row .value { color: var(--text-primary); font-weight: 600; }
        .card-row .value.muted { color: var(--text-secondary); font-weight: 500; }
        .card-footer {
          padding: 10px 12px;
          border-radius: var(--radius-sm);
          text-align: center;
          font-size: 13px;
          font-weight: 700;
        }
        .card-footer.positive {
          background: var(--accent-green-glow);
          color: var(--accent-green);
        }
        .card-footer.negative {
          background: var(--accent-red-glow);
          color: var(--accent-red);
        }
        .bounce {
          animation: number-bounce 0.3s ease-out;
        }
        .portfolio-empty {
          grid-column: 1 / -1;
          text-align: center;
          padding: 40px 20px;
          color: var(--text-muted);
        }
        .empty-icon {
          opacity: 0.3;
          margin-bottom: 12px;
        }
        .portfolio-empty p {
          font-size: 15px;
          color: var(--text-secondary);
          margin-bottom: 4px;
        }
        .portfolio-empty span {
          font-size: 12px;
          color: var(--text-muted);
        }
        @media (max-width: 768px) {
          .portfolio-container { padding: 16px; }
          .portfolio-summary {
            gap: 12px;
            padding: 12px;
          }
          .summary-divider { display: none; }
          .portfolio-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default Portfolio;
