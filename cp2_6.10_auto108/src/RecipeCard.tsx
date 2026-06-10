import { memo } from 'react';
import { Recipe } from './types';

interface RecipeCardProps {
  recipe: Recipe;
  onViewDetail: (recipe: Recipe) => void;
  onAddToShopping: (recipe: Recipe) => void;
  onDelete: (id: string) => void;
}

function RecipeCardComponent({ recipe, onViewDetail, onAddToShopping, onDelete }: RecipeCardProps) {
  return (
    <div className="recipe-card">
      <div className="recipe-card-image">
        {recipe.imagePlaceholder}
      </div>
      <div className="recipe-card-body">
        <div className="recipe-card-title" title={recipe.name}>
          {recipe.name}
        </div>
        <div className="recipe-card-desc">
          {recipe.description || '暂无简介'}
        </div>
        <div className="recipe-card-actions">
          <button
            className="btn-secondary"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetail(recipe);
            }}
          >
            查看详情
          </button>
          <button
            className="btn-success"
            onClick={(e) => {
              e.stopPropagation();
              onAddToShopping(recipe);
            }}
          >
            + 采购清单
          </button>
        </div>
        <div style={{ marginTop: 8, textAlign: 'right' }}>
          <button
            className="item-delete"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`确定要删除食谱「${recipe.name}」吗？`)) {
                onDelete(recipe.id);
              }
            }}
            title="删除食谱"
            style={{ fontSize: 14, padding: '4px 8px' }}
          >
            🗑️ 删除
          </button>
        </div>
      </div>
    </div>
  );
}

export default memo(RecipeCardComponent);
