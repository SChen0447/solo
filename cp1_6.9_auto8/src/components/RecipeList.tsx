import { useMemo, useRef } from 'react';
import type { Recipe, SearchFilters } from '../types';
import { TAGS } from '../types';
import LazyImage from './LazyImage';

interface RecipeListProps {
  recipes: Recipe[];
  recommendations: Recipe[];
  filters: SearchFilters;
  setFilters: (f: SearchFilters) => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelect: (recipe: Recipe) => void;
  selectedRecipe: Recipe | null;
}

export default function RecipeList({
  recipes,
  recommendations,
  filters,
  setFilters,
  selectedIds,
  onToggleSelect,
  onSelect,
  selectedRecipe,
}: RecipeListProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ ...filters, query: e.target.value });
  };

  const handleClearSearch = () => {
    setFilters({ ...filters, query: '' });
    if (searchInputRef.current) searchInputRef.current.focus();
  };

  const handleTagToggle = (tag: string) => {
    const newTags = filters.tags.includes(tag)
      ? filters.tags.filter((t) => t !== tag)
      : [...filters.tags, tag];
    setFilters({ ...filters, tags: newTags });
  };

  const showRecommendations = useMemo(
    () => filters.query === '' && filters.tags.length === 0 && recommendations.length > 0,
    [filters, recommendations]
  );

  return (
    <div className="recipe-list-container">
      <div className="search-section">
        <div className="search-input-wrapper">
          <input
            ref={searchInputRef}
            type="text"
            className="search-input"
            placeholder="搜索食谱、食材..."
            value={filters.query}
            onChange={handleSearchChange}
          />
          {filters.query && (
            <button
              className="search-clear-btn"
              onClick={handleClearSearch}
              aria-label="清除搜索"
            >
              ✕
            </button>
          )}
        </div>

        <div className="tag-filters">
          {TAGS.map((tag) => (
            <button
              key={tag}
              className={`tag-filter ${filters.tags.includes(tag) ? 'active' : ''}`}
              onClick={() => handleTagToggle(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {showRecommendations && (
        <div className="recommendations-section">
          <h3 className="section-title">✨ 为你推荐</h3>
          <div className="recommendations-grid">
            {recommendations.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                isSelected={selectedIds.has(recipe.id)}
                isActive={selectedRecipe?.id === recipe.id}
                onToggleSelect={onToggleSelect}
                onSelect={onSelect}
              />
            ))}
          </div>
        </div>
      )}

      <div className="recipe-list-section">
        <h3 className="section-title">
          {showRecommendations ? '📋 所有食谱' : '📋 搜索结果'} ({recipes.length})
        </h3>
        <div className="recipe-list">
          {recipes.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🔍</div>
              <p>没有找到匹配的食谱</p>
              <p className="empty-hint">试试其他关键词或标签</p>
            </div>
          ) : (
            recipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                isSelected={selectedIds.has(recipe.id)}
                isActive={selectedRecipe?.id === recipe.id}
                onToggleSelect={onToggleSelect}
                onSelect={onSelect}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

interface RecipeCardProps {
  recipe: Recipe;
  isSelected: boolean;
  isActive: boolean;
  onToggleSelect: (id: string) => void;
  onSelect: (recipe: Recipe) => void;
}

function RecipeCard({ recipe, isSelected, isActive, onToggleSelect, onSelect }: RecipeCardProps) {
  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleSelect(recipe.id);
  };

  return (
    <div
      className={`recipe-card ${isActive ? 'active' : ''}`}
      onClick={() => onSelect(recipe)}
    >
      <label className="recipe-checkbox" onClick={handleCheckboxClick}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(recipe.id)}
          onClick={(e) => e.stopPropagation()}
        />
        <span className="checkmark"></span>
      </label>

      <div className="recipe-card-image">
        <LazyImage src={recipe.coverImage} alt={recipe.title} className="card-cover" />
      </div>

      <div className="recipe-card-content">
        <h4 className="recipe-card-title">{recipe.title}</h4>
        <p className="recipe-card-desc">{recipe.description}</p>
        <div className="recipe-card-tags">
          {recipe.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="tag-chip">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
