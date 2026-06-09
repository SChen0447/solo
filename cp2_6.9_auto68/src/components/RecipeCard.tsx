import { NUTRITION_COLORS } from '../types';
import type { Recipe } from '../types';

interface RecipeCardProps {
  recipe: Recipe;
  onClick: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
}

export default function RecipeCard({ recipe, onClick, onDelete, isDeleting }: RecipeCardProps) {
  const nutrition = recipe.nutritionPerServing;
  const totalCalories = Math.round(nutrition.calories * recipe.servings);

  return (
    <div
      className={`recipe-card ${isDeleting ? 'deleting' : ''}`}
      onClick={onClick}
    >
      <div className="card-header">
        <h3 className="recipe-name">{recipe.name}</h3>
        <button
          className="delete-btn"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="删除食谱"
        >
          ×
        </button>
      </div>

      <p className="recipe-description">{recipe.description || '暂无描述'}</p>

      <div className="recipe-meta">
        <span className="meta-item">
          <span className="meta-icon">⏱</span>
          {recipe.cookTime} 分钟
        </span>
        <span className="meta-item">
          <span className="meta-icon">🔥</span>
          {totalCalories} 千卡
        </span>
        <span className="meta-item">
          <span className="meta-icon">🍽</span>
          {recipe.servings} 份
        </span>
      </div>

      <div className="nutrition-bar">
        <div
          className="nutrition-segment"
          style={{
            backgroundColor: NUTRITION_COLORS.calories,
            flex: nutrition.calories / 10
          }}
          title={`热量 ${nutrition.calories}千卡`}
        />
        <div
          className="nutrition-segment"
          style={{
            backgroundColor: NUTRITION_COLORS.protein,
            flex: nutrition.protein
          }}
          title={`蛋白质 ${nutrition.protein}g`}
        />
        <div
          className="nutrition-segment"
          style={{
            backgroundColor: NUTRITION_COLORS.fat,
            flex: nutrition.fat
          }}
          title={`脂肪 ${nutrition.fat}g`}
        />
        <div
          className="nutrition-segment"
          style={{
            backgroundColor: NUTRITION_COLORS.carbs,
            flex: nutrition.carbs / 2
          }}
          title={`碳水 ${nutrition.carbs}g`}
        />
      </div>

      <div className="nutrition-legend">
        <span><i style={{ background: NUTRITION_COLORS.calories }} />热量</span>
        <span><i style={{ background: NUTRITION_COLORS.protein }} />蛋白</span>
        <span><i style={{ background: NUTRITION_COLORS.fat }} />脂肪</span>
        <span><i style={{ background: NUTRITION_COLORS.carbs }} />碳水</span>
      </div>
    </div>
  );
}
