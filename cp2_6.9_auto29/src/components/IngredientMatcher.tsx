import { useState, useMemo } from 'react';
import type { Recipe, MatchResult } from '../types';

interface Props {
  recipes: Recipe[];
}

export default function IngredientMatcher({ recipes }: Props) {
  const [input, setInput] = useState('');
  const [results, setResults] = useState<MatchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const matchRecipes = (ingredientsList: string[]): MatchResult[] => {
    const userIngredients = ingredientsList.map((i) => i.trim().toLowerCase());

    return recipes
      .map((recipe) => {
        const recipeIngredients = recipe.ingredients.map((ing) =>
          ing.name.trim().toLowerCase()
        );
        const matched = recipeIngredients.filter((name) =>
          userIngredients.some((u) => name.includes(u) || u.includes(name))
        );
        const missing = recipeIngredients.filter(
          (name) => !userIngredients.some((u) => name.includes(u) || u.includes(name))
        );
        const matchRate =
          recipeIngredients.length === 0
            ? 0
            : Math.round((matched.length / recipeIngredients.length) * 100);
        return {
          recipe,
          matchRate,
          matchedCount: matched.length,
          totalCount: recipeIngredients.length,
          missingIngredients: missing
        };
      })
      .sort((a, b) => b.matchRate - a.matchRate);
  };

  const handleMatch = async () => {
    const ingredientsList = input
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (ingredientsList.length === 0) {
      setResults([]);
      setHasSearched(true);
      return;
    }

    setLoading(true);
    setHasSearched(true);

    try {
      const res = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients: ingredientsList })
      });
      if (res.ok) {
        const data = await res.json();
        setResults(data);
      } else {
        setResults(matchRecipes(ingredientsList));
      }
    } catch {
      setResults(matchRecipes(ingredientsList));
    } finally {
      setLoading(false);
    }
  };

  const getProgressColor = (rate: number) => {
    if (rate >= 80) return 'progress-high';
    if (rate >= 50) return 'progress-medium';
    return 'progress-low';
  };

  return (
    <div className="matcher-panel">
      <h3 className="panel-title">🧊 冰箱食材智能匹配</h3>

      <div className="matcher-input-group">
        <input
          type="text"
          className="matcher-input"
          placeholder="输入食材，用逗号分隔（如：番茄,鸡蛋,土豆）"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleMatch()}
        />
        <button className="btn btn-primary ripple" onClick={handleMatch} disabled={loading}>
          {loading ? '匹配中...' : '开始匹配'}
        </button>
      </div>

      {hasSearched && (
        <div className="match-results">
          {results.length === 0 ? (
            <p className="no-results">暂无匹配结果，请输入更多食材</p>
          ) : (
            results.map((result) => (
              <div key={result.recipe.id} className="match-item">
                <div className="match-header">
                  <span className="match-name">{result.recipe.name}</span>
                  <span className="match-rate">{result.matchRate}%</span>
                </div>
                <div className="progress-bar">
                  <div
                    className={`progress-fill ${getProgressColor(result.matchRate)}`}
                    style={{ width: `${result.matchRate}%` }}
                  />
                </div>
                <div className="match-count">
                  已匹配 {result.matchedCount}/{result.totalCount} 种食材
                </div>
                {result.missingIngredients.length > 0 && (
                  <div className="missing-ingredients">
                    <span className="missing-label">缺少：</span>
                    <span className="missing-list">
                      {result.missingIngredients.join('、')}
                    </span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
