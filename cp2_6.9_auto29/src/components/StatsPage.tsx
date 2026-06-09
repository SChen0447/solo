import { useMemo } from 'react';
import type { Recipe } from '../types';

interface Props {
  recipes: Recipe[];
}

export default function StatsPage({ recipes }: Props) {
  const stats = useMemo(() => {
    const total = recipes.length;
    const avgPrepTime =
      total === 0 ? 0 : Math.round(recipes.reduce((sum, r) => sum + r.prepTime, 0) / total);

    const favoriteRecipes = recipes.filter((r) => r.favorite);
    const topFavorite =
      favoriteRecipes.length > 0
        ? favoriteRecipes.reduce((best, r) => (r.difficulty > best.difficulty ? r : best))
        : null;

    const difficultyCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    recipes.forEach((r) => {
      difficultyCounts[r.difficulty] = (difficultyCounts[r.difficulty] || 0) + 1;
    });

    const maxCount = Math.max(...Object.values(difficultyCounts), 1);

    return { total, avgPrepTime, topFavorite, difficultyCounts, maxCount };
  }, [recipes]);

  return (
    <div className="stats-page">
      <h2 className="stats-title">📊 食谱数据统计</h2>

      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">食谱总数</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.avgPrepTime}</div>
          <div className="stat-label">平均准备时长（分钟）</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.topFavorite ? stats.topFavorite.name : '暂无'}</div>
          <div className="stat-label">最高收藏食谱</div>
        </div>
      </div>

      <div className="chart-section">
        <h3 className="chart-title">按难度等级分组</h3>
        <div className="bar-chart">
          {[1, 2, 3, 4, 5].map((level) => {
            const count = stats.difficultyCounts[level] || 0;
            const heightPercent = (count / stats.maxCount) * 100;
            return (
              <div key={level} className="bar-wrapper">
                <div className="bar-count">{count}</div>
                <div className="bar-container">
                  <div
                    className="bar"
                    style={{ height: `${heightPercent}%` }}
                  />
                </div>
                <div className="bar-label">
                  {'★'.repeat(level)}
                  <span className="bar-level-num">（{level}星）</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
