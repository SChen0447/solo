import React from 'react';
import { Recipe, DIFFICULTY_LABELS } from '../types';

interface RecipeCardProps {
  recipe: Recipe;
  onClick: () => void;
  onFavorite: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  draggable?: boolean;
}

const RecipeCard: React.FC<RecipeCardProps> = ({
  recipe,
  onClick,
  onFavorite,
  onEdit,
  onDelete,
  onDragStart,
  onDragEnd,
  draggable = false,
}) => {
  const difficultyClass = {
    easy: 'difficulty-easy',
    medium: 'difficulty-medium',
    hard: 'difficulty-hard',
  }[recipe.difficulty];

  return (
    <div
      className="recipe-card glass"
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div
        className="recipe-card-thumbnail"
        style={{ background: recipe.thumbnailColor }}
      />
      <div className="recipe-card-body">
        <h3 className="recipe-card-name">{recipe.name}</h3>
        <div className="recipe-card-meta">
          <span className={`difficulty-tag ${difficultyClass}`}>
            {DIFFICULTY_LABELS[recipe.difficulty]}
          </span>
          <span className="cook-time">
            <span>⏳</span>
            {recipe.cookTime}分钟
          </span>
        </div>
      </div>
      <div className="recipe-card-actions" onClick={(e) => e.stopPropagation()}>
        <button
          className={`card-action-btn favorite ${recipe.isFavorite ? 'is-favorite' : ''}`}
          onClick={onFavorite}
          title={recipe.isFavorite ? '取消收藏' : '收藏'}
        >
          {recipe.isFavorite ? '★' : '☆'}
        </button>
        <button
          className="card-action-btn"
          onClick={onEdit}
          title="编辑"
        >
          ✎
        </button>
        <button
          className="card-action-btn"
          onClick={onDelete}
          title="删除"
        >
          🗑
        </button>
      </div>
    </div>
  );
};

export default RecipeCard;
