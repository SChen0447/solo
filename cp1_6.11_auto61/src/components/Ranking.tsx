import React, { useEffect, useState } from 'react';
import type { RankingItem } from '../types';
import { Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface RankingProps {
  rankings: RankingItem[];
}

const Ranking: React.FC<RankingProps> = ({ rankings }) => {
  const [prevRankings, setPrevRankings] = useState<RankingItem[]>([]);
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const prevMap = new Map(prevRankings.map(r => [r.userId, r.rank]));
    const changed = new Set<string>();

    rankings.forEach(r => {
      const prevRank = prevMap.get(r.userId);
      if (prevRank !== undefined && prevRank !== r.rank) {
        changed.add(r.userId);
      }
    });

    if (changed.size > 0) {
      setHighlightedIds(changed);
      const timer = setTimeout(() => setHighlightedIds(new Set()), 500);
      return () => clearTimeout(timer);
    }
  }, [rankings]);

  useEffect(() => {
    setPrevRankings(rankings);
  }, [rankings]);

  const getRankChange = (item: RankingItem) => {
    if (item.prevRank === undefined || item.prevRank === item.rank) return 'same';
    return item.rank < item.prevRank ? 'up' : 'down';
  };

  const renderMedal = (rank: number) => {
    if (rank === 1) {
      return (
        <div className="medal gold" title="第一名">
          <Trophy size={18} />
        </div>
      );
    }
    if (rank === 2) {
      return (
        <div className="medal silver" title="第二名">
          <Trophy size={16} />
        </div>
      );
    }
    if (rank === 3) {
      return (
        <div className="medal bronze" title="第三名">
          <Trophy size={15} />
        </div>
      );
    }
    return <div className="medal dot">{rank}</div>;
  };

  const renderRankChange = (change: 'up' | 'down' | 'same', rank: number, prevRank?: number) => {
    if (change === 'up' && prevRank) {
      return (
        <div className="rank-change up">
          <TrendingUp size={14} />
          <span>{prevRank - rank}</span>
        </div>
      );
    }
    if (change === 'down' && prevRank) {
      return (
        <div className="rank-change down">
          <TrendingDown size={14} />
          <span>{rank - prevRank}</span>
        </div>
      );
    }
    return (
      <div className="rank-change same">
        <Minus size={14} />
      </div>
    );
  };

  return (
    <div className="ranking-container">
      <div className="ranking-header">
        <h3 className="ranking-title">
          <Trophy size={20} className="title-icon" />
          大赛排行榜
        </h3>
        <span className="ranking-count">{rankings.length} 位选手</span>
      </div>

      <div className="ranking-list">
        {rankings.length === 0 ? (
          <div className="empty-state">暂无排行数据</div>
        ) : (
          rankings.map(item => {
            const change = getRankChange(item);
            const isHighlighted = highlightedIds.has(item.userId);
            return (
              <div
                key={item.userId}
                className={`ranking-row ${isHighlighted ? 'flash' : ''} rank-${item.rank}`}
              >
                <div className="rank-medal">{renderMedal(item.rank)}</div>
                <div className="rank-info">
                  <div className="rank-name">{item.nickname}</div>
                  <div className="rank-assets">
                    ${item.totalAssets.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="rank-return">
                  <span className={item.returnRate >= 0 ? 'positive' : 'negative'}>
                    {item.returnRate >= 0 ? '+' : ''}{item.returnRate.toFixed(2)}%
                  </span>
                </div>
                {renderRankChange(change, item.rank, item.prevRank)}
              </div>
            );
          })
        )}
      </div>

      <style>{`
        .ranking-container {
          background: linear-gradient(180deg, var(--bg-card) 0%, var(--bg-secondary) 100%);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: 20px;
          box-shadow: var(--shadow-card);
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        .ranking-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 18px;
          padding-bottom: 14px;
          border-bottom: 1px solid var(--border-color);
        }
        .ranking-title {
          font-size: 16px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-primary);
        }
        .title-icon {
          color: var(--accent-blue);
        }
        .ranking-count {
          font-size: 12px;
          color: var(--text-muted);
          padding: 4px 10px;
          background: var(--bg-secondary);
          border-radius: 12px;
        }
        .ranking-list {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .ranking-row {
          display: grid;
          grid-template-columns: 40px 1fr auto auto;
          align-items: center;
          gap: 12px;
          padding: 12px;
          border-radius: var(--radius-md);
          background: var(--bg-secondary);
          transition: all var(--transition-normal);
          border: 1px solid transparent;
        }
        .ranking-row:hover {
          background: var(--bg-card-hover);
          border-color: var(--border-color);
          transform: translateX(2px);
        }
        .ranking-row.flash {
          animation: flash-highlight 0.5s ease-out;
        }
        .ranking-row.rank-1 {
          background: linear-gradient(90deg, rgba(255, 215, 0, 0.08) 0%, var(--bg-secondary) 60%);
        }
        .ranking-row.rank-2 {
          background: linear-gradient(90deg, rgba(192, 192, 192, 0.08) 0%, var(--bg-secondary) 60%);
        }
        .ranking-row.rank-3 {
          background: linear-gradient(90deg, rgba(205, 127, 50, 0.08) 0%, var(--bg-secondary) 60%);
        }
        .medal {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 700;
        }
        .medal.gold {
          background: var(--gold-gradient);
          color: #5a4000;
          box-shadow: 0 2px 10px rgba(255, 215, 0, 0.4);
        }
        .medal.silver {
          background: var(--silver-gradient);
          color: #5a5a5a;
          box-shadow: 0 2px 10px rgba(192, 192, 192, 0.4);
        }
        .medal.bronze {
          background: var(--bronze-gradient);
          color: #4a2a10;
          box-shadow: 0 2px 10px rgba(205, 127, 50, 0.4);
        }
        .medal.dot {
          background: var(--bg-card);
          color: var(--text-muted);
          border: 1px solid var(--border-color);
        }
        .rank-info {
          min-width: 0;
        }
        .rank-name {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .rank-assets {
          font-size: 12px;
          color: var(--text-secondary);
          margin-top: 2px;
        }
        .rank-return {
          font-size: 13px;
          font-weight: 700;
        }
        .rank-return .positive { color: var(--accent-green); }
        .rank-return .negative { color: var(--accent-red); }
        .rank-change {
          display: flex;
          align-items: center;
          gap: 2px;
          font-size: 11px;
          font-weight: 600;
          padding: 4px 8px;
          border-radius: 10px;
        }
        .rank-change.up {
          color: var(--accent-green);
          background: var(--accent-green-glow);
        }
        .rank-change.down {
          color: var(--accent-red);
          background: var(--accent-red-glow);
        }
        .rank-change.same {
          color: var(--text-muted);
          background: var(--bg-card);
        }
        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: var(--text-muted);
          font-size: 14px;
        }
        @media (max-width: 768px) {
          .ranking-container {
            padding: 16px;
          }
          .ranking-row {
            grid-template-columns: 36px 1fr auto;
            gap: 10px;
          }
          .rank-change { display: none; }
        }
      `}</style>
    </div>
  );
};

export default Ranking;
