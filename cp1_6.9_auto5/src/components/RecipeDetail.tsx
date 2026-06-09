import { useState, useEffect } from 'react';
import type { Recipe, BakeLog } from '../types';
import { api } from '../api';
import LogTimeline from './LogTimeline';
import NewLogForm from './NewLogForm';

interface Props {
  recipe: Recipe;
  onBack: () => void;
  onRecipeUpdated: () => void;
}

const difficultyColors: Record<string, string> = {
  简单: '#6BBF59',
  中等: '#F0C75E',
  困难: '#E07050',
};

export default function RecipeDetail({ recipe, onBack, onRecipeUpdated }: Props) {
  const [logs, setLogs] = useState<BakeLog[]>([]);
  const [showLogForm, setShowLogForm] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(true);

  useEffect(() => {
    loadLogs();
  }, [recipe.id]);

  async function loadLogs() {
    setLoadingLogs(true);
    try {
      const data = await api.getLogs(recipe.id);
      setLogs(data);
    } catch (e) {
      console.error('加载日志失败', e);
    } finally {
      setLoadingLogs(false);
    }
  }

  async function handleLogCreated() {
    setShowLogForm(false);
    await loadLogs();
  }

  return (
    <div className="app">
      <header className="header detail-header">
        <div className="header-content">
          <button className="btn btn-back" onClick={onBack}>
            ← 返回
          </button>
          <h1 className="title-detail">{recipe.name}</h1>
        </div>
      </header>

      <main className="detail-container">
        <div className="detail-left">
          <div className="detail-cover">
            {recipe.coverImage ? (
              <img src={recipe.coverImage} alt={recipe.name} />
            ) : (
              <div className="recipe-card-default">🎂</div>
            )}
          </div>

          <div className="detail-info-card">
            <div className="detail-meta">
              <div className="meta-item">
                <span className="meta-label">🔥 温度</span>
                <span className="meta-value">{recipe.temperature}°C</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">⏱ 时间</span>
                <span className="meta-value">{recipe.time}分钟</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">📊 难度</span>
                <span
                  className="difficulty-badge"
                  style={{ backgroundColor: difficultyColors[recipe.difficulty] }}
                >
                  {recipe.difficulty}
                </span>
              </div>
            </div>

            {recipe.ingredients.length > 0 && (
              <div className="detail-section">
                <h3>🍴 食材清单</h3>
                <ul className="ingredient-list">
                  {recipe.ingredients.map((ing, i) => (
                    <li key={i}>
                      <span className="ing-name">{ing.name}</span>
                      <span className="ing-amount">
                        {ing.amount} {ing.unit}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {recipe.steps.length > 0 && (
              <div className="detail-section">
                <h3>📝 制作步骤</h3>
                <ol className="steps-list">
                  {recipe.steps.map((step, i) => (
                    <li key={i}>
                      <span className="step-num">{i + 1}</span>
                      <p>{step}</p>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </div>

        <div className="detail-right">
          <div className="timeline-header">
            <h2>📖 烘焙日志</h2>
            <button className="btn btn-primary" onClick={() => setShowLogForm(true)}>
              + 记录烘焙
            </button>
          </div>

          {loadingLogs ? (
            <div className="loading">加载中...</div>
          ) : (
            <LogTimeline logs={logs} recipeId={recipe.id} />
          )}
        </div>
      </main>

      {showLogForm && (
        <NewLogForm
          recipeId={recipe.id}
          onClose={() => setShowLogForm(false)}
          onSubmit={handleLogCreated}
        />
      )}
    </div>
  );
}
