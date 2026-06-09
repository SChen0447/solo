import type { Recipe } from '../types';
import LazyImage from './LazyImage';

interface RecipeDetailProps {
  recipe: Recipe;
  onEdit: (recipe: Recipe) => void;
  onDelete: (id: string) => void;
}

export default function RecipeDetail({ recipe, onEdit, onDelete }: RecipeDetailProps) {
  return (
    <div className="recipe-detail">
      <div className="detail-header">
        <div className="detail-actions">
          <button className="action-btn edit-btn" onClick={() => onEdit(recipe)}>
            ✏️ 编辑
          </button>
          <button className="action-btn delete-btn" onClick={() => onDelete(recipe.id)}>
            🗑️ 删除
          </button>
        </div>
      </div>

      <div className="detail-cover">
        <LazyImage src={recipe.coverImage} alt={recipe.title} className="detail-cover-img" />
        {!recipe.coverImage && <div className="detail-cover-placeholder">🍲</div>}
      </div>

      <div className="detail-content">
        <h2 className="detail-title">{recipe.title}</h2>

        <div className="detail-tags">
          {recipe.tags.map((tag) => (
            <span key={tag} className="tag-chip large">
              {tag}
            </span>
          ))}
        </div>

        <p className="detail-description">{recipe.description}</p>

        <div className="detail-section">
          <h3 className="detail-section-title">🥬 食材清单</h3>
          <ul className="ingredient-list">
            {recipe.ingredients.map((ing) => (
              <li key={ing.id} className="ingredient-item">
                <span className="ingredient-name">{ing.name}</span>
                <span className="ingredient-quantity">{ing.quantity}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="detail-section">
          <h3 className="detail-section-title">📝 制作步骤</h3>
          <ol className="step-list">
            {recipe.steps.map((step, index) => (
              <li key={index} className="step-item">
                <span className="step-number">{index + 1}</span>
                <span className="step-text">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="detail-meta">
          <span>创建于 {new Date(recipe.createdAt).toLocaleDateString('zh-CN')}</span>
          {recipe.updatedAt !== recipe.createdAt && (
            <span> · 更新于 {new Date(recipe.updatedAt).toLocaleDateString('zh-CN')}</span>
          )}
        </div>
      </div>
    </div>
  );
}
