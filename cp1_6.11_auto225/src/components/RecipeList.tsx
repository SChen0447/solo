import type { Recipe, Spice, FlavorValues } from '../types';

interface RecipeListProps {
  recipes: Recipe[];
  spices: Spice[];
  onLoad: (recipe: Recipe) => void;
}

const spiceIcons: Record<string, string> = {
  cinnamon: '🌿',
  clove: '🌸',
  nutmeg: '🥜',
  cardamom: '🫛',
  saffron: '✨'
};

const flavorLabels: Record<keyof FlavorValues, string> = {
  spicy: '辛辣',
  sweet: '甘甜',
  warm: '温暖',
  woody: '木质',
  floral: '花香',
  herbaceous: '药草'
};

const getTopFlavors = (flavorValues: FlavorValues): string[] => {
  const entries = Object.entries(flavorValues) as [keyof FlavorValues, number][];
  entries.sort((a, b) => b[1] - a[1]);
  return entries.slice(0, 2).map(([key]) => flavorLabels[key]);
};

function RecipeList({ recipes, spices, onLoad }: RecipeListProps) {
  if (recipes.length === 0) {
    return (
      <div className="empty-hint">
        暂无保存的配方
        <br />
        <span style={{ fontSize: '12px' }}>研磨后可保存你的配方</span>
      </div>
    );
  }

  return (
    <div className="recipe-list">
      {recipes.map(recipe => {
        const spice = spices.find(s => s.id === recipe.spiceId);
        const topFlavors = getTopFlavors(recipe.flavorValues);

        return (
          <div
            key={recipe.id}
            className="recipe-card"
            onClick={() => onLoad(recipe)}
          >
            <div className="recipe-card-header">
              <div 
                className="recipe-spice-icon"
                style={{ 
                  background: spice ? `${spice.color}30` : '#ccc',
                  borderColor: spice?.color || '#ccc'
                }}
              >
                {spiceIcons[recipe.spiceId] || '🌿'}
              </div>
              <div className="recipe-name" style={{ color: spice?.color || '#5c3a21' }}>
                {recipe.name}
              </div>
            </div>
            
            <div className="recipe-flavor-tags">
              {topFlavors.map((flavor, index) => (
                <span key={index} className="flavor-tag">
                  {flavor}
                </span>
              ))}
            </div>
            
            <div style={{ 
              marginTop: '10px', 
              fontSize: '11px', 
              color: '#8b7355',
              fontFamily: "'Noto Serif SC', serif",
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <span>{spice?.name || '未知香料'}</span>
              <span>{recipe.grindDuration}秒 · {recipe.grindSpeed}转</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default RecipeList;
