import React, { useEffect, useState } from 'react';
import { useApp } from '../App';
import { fetchLeaderboard } from '../api';
import type { LeaderboardEntry } from '../types';
import '../styles/leaderboard.scss';

function LeaderboardPage(): JSX.Element {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [prevScores, setPrevScores] = useState<Map<string, number>>(new Map());
  const { user } = useApp();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const result = await fetchLeaderboard();
        if (mounted) {
          setEntries((prev) => {
            const scoreMap = new Map<string, number>();
            prev.forEach((e) => scoreMap.set(e.id, e.score));
            setPrevScores(scoreMap);
            return result.entries;
          });
          setCurrentUserId(result.currentUserId);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user?.score]);

  const rankIcon = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const getRankClass = (rank: number): string => {
    if (rank === 1) return 'rank--gold';
    if (rank === 2) return 'rank--silver';
    if (rank === 3) return 'rank--bronze';
    return '';
  };

  return (
    <div className="leaderboard-page">
      <header className="page-header fade-in-up">
        <div className="page-header__text">
          <p className="breadcrumb">
            首页 / <span>风云榜</span>
          </p>
          <h2 className="page-title">
            <span className="title-icon">🏆</span>
            积分风云榜
          </h2>
          <p className="page-subtitle">
            Top <strong>10</strong> 黑胶盲听高手 · 每猜对一次 +10 积分
          </p>
        </div>
        {user && (
          <div className="header-my-rank fade-in-up">
            <div className="my-rank-label">我的积分</div>
            <div className="my-rank-score">{user.score}</div>
          </div>
        )}
      </header>

      <div className="leaderboard-podium fade-in-up" style={{ animationDelay: '0.05s' }}>
        {entries.slice(0, 3).sort((a, b) => a.rank - b.rank).map((entry) => (
          <div key={entry.id} className={`podium-item podium-item--${entry.rank}`}>
            <div className="podium-item__rank">{rankIcon(entry.rank)}</div>
            <div
              className={`podium-item__avatar ${entry.id === currentUserId ? 'is-current-user' : ''}`}
            >
              {entry.avatar}
              {entry.id === currentUserId && <span className="current-badge">我</span>}
            </div>
            <div className="podium-item__name">{entry.nickname}</div>
            <div
              className={`podium-item__score score-bounce ${
                prevScores.has(entry.id) && prevScores.get(entry.id) !== entry.score ? 'has-delta' : ''
              }`}
              key={`${entry.id}-${entry.score}`}
            >
              {entry.score}
              <span className="score-unit">分</span>
            </div>
            <div className={`podium-item__base ${getRankClass(entry.rank)}`} />
          </div>
        ))}
      </div>

      <div className="leaderboard-list">
        {loading ? (
          Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="skeleton-row fade-in-up"
              style={{ animationDelay: `${0.05 * (i + 1)}s` }}
            />
          ))
        ) : (
          entries.slice(3).map((entry, i) => (
            <div
              key={entry.id}
              className={`leaderboard-row fade-in-up ${
                entry.id === currentUserId ? 'is-current-user' : ''
              }`}
              style={{ animationDelay: `${0.05 * (i + 4)}s` }}
            >
              <div className={`row-rank ${getRankClass(entry.rank)}`}>
                {rankIcon(entry.rank)}
              </div>

              <div className="row-avatar-wrap">
                <div
                  className={`row-avatar ${entry.id === currentUserId ? 'is-current-user' : ''}`}
                >
                  {entry.avatar}
                </div>
                <div className="row-name">
                  {entry.nickname}
                  {entry.id === currentUserId && (
                    <span className="current-tag">当前用户</span>
                  )}
                </div>
              </div>

              <div
                className={`row-score score-bounce ${
                  prevScores.has(entry.id) && prevScores.get(entry.id) !== entry.score
                    ? 'has-delta'
                    : ''
                }`}
                key={`s-${entry.id}-${entry.score}`}
              >
                <span className="score-num">{entry.score}</span>
                <span className="score-unit">分</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default LeaderboardPage;
