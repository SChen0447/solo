import type { Recipe } from '../types';

interface Props {
  recipe: Recipe;
  onClick: () => void;
}

const difficultyColors: Record<string, string> = {
  简单: '#6BBF59',
  中等: '#F0C75E',
  困难: '#E07050',
};

export default function RecipeCard({ recipe, onClick }: Props) {
  return (
    <div className="recipe-card" onClick={onClick}>
      <div className="recipe-card-cover">
        {recipe.coverImage ? (
          <img src={recipe.coverImage} alt={recipe.name} />
        ) : (
          <div className="recipe-card-default">🎂</div>
        )}
        <span
          className="difficulty-badge"
          style={{ backgroundColor: difficultyColors[recipe.difficulty] }}
        >
          {recipe.difficulty}
        </span>
      </div>
      <div className="recipe-card-body">
        <h3 className="recipe-card-title">{recipe.name}</h3>
        <div className="recipe-card-meta">
          <span>🔥 {recipe.temperature}°C</span>
          <span>⏱ {recipe.time}分钟</span>
        </div>
      </div>
    </div>
  );
}
