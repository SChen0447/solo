import { useState } from 'react';
import type { Recipe } from '../types';

interface Props {
  recipe: Recipe;
  onToggleFavorite: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function RecipeCard({ recipe, onToggleFavorite, onDelete }: Props) {
  const [showDetail, setShowDetail] = useState(false);

  const renderStars = (count: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={`star ${i < count ? 'filled' : ''}`}>
        ★
      </span>
    ));
  };

  const formatSteps = (text: string) => {
    return text.split('\n').map((line, idx) => (
      <p key={idx} className="step-line">
        {line || '\u00A0'}
      </p>
    ));
  };

  return (
    <>
      <div className="recipe-card ripple" onClick={() => setShowDetail(true)}>
        <button
          className={`favorite-btn ${recipe.favorite ? 'active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(recipe.id);
          }}
        >
          {recipe.favorite ? '♥' : '♡'}
        </button>

        <div className="difficulty-badge">{renderStars(recipe.difficulty)}</div>

        <div className="recipe-cover">
          <span className="recipe-emoji">🍽️</span>
        </div>

        <div className="recipe-info">
          <h3 className="recipe-name">{recipe.name}</h3>
        </div>

        <div className="recipe-time">
          <span className="time-icon">⏱</span> {recipe.prepTime} 分钟
        </div>
      </div>

      {showDetail && (
        <div className="modal-overlay" onClick={() => setShowDetail(false)}>
          <div
            className="modal-content detail-modal modal-enter"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="modal-close" onClick={() => setShowDetail(false)}>
              ×
            </button>

            <div className="detail-header">
              <h2>{recipe.name}</h2>
              <div className="detail-meta">
                <span className="detail-time">⏱ {recipe.prepTime} 分钟</span>
                <span className="detail-difficulty">难度: {renderStars(recipe.difficulty)}</span>
              </div>
            </div>

            <div className="detail-body">
              <div className="detail-section">
                <h4>食材清单</h4>
                <ul className="ingredient-list">
                  {recipe.ingredients.map((ing, idx) => (
                    <li key={idx}>
                      <span className="ing-name">{ing.name}</span>
                      <span className="ing-amount">{ing.amount}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="detail-section">
                <h4>烹饪步骤</h4>
                <div className="steps-content">{formatSteps(recipe.steps)}</div>
              </div>
            </div>

            <div className="detail-footer">
              <button
                className="btn btn-secondary ripple"
                onClick={() => {
                  onDelete(recipe.id);
                  setShowDetail(false);
                }}
              >
                删除食谱
              </button>
              <button className="btn btn-primary ripple" onClick={() => setShowDetail(false)}>
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
