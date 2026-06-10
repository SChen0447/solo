import React from 'react';
import type { Recipe } from './App';
import { MOOD_TAGS } from './App';

interface RecipeCardProps {
  recipe: Recipe;
  onToggleFavorite: (id: string) => void;
  onShare: (id: string) => void;
  onDelete: (id: string) => void;
  onClick: () => void;
}

const RecipeCard: React.FC<RecipeCardProps> = ({
  recipe,
  onToggleFavorite,
  onShare,
  onDelete,
  onClick,
}) => {
  const moodInfo = MOOD_TAGS.find((m) => m.value === recipe.moodTag);
  const mainColor = recipe.ingredients[0]?.color || '#8866aa';
  const secondColor = recipe.ingredients[1]?.color || '#4466aa';

  return (
    <div
      onClick={onClick}
      style={{
        width: '150px',
        height: '200px',
        borderRadius: '12px',
        background: `linear-gradient(135deg, ${mainColor}, ${secondColor})`,
        position: 'relative',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        overflow: 'hidden',
        transform: 'translateY(0) scale(1)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-8px) scale(1.05)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 20px rgba(0,0,0,0.4)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0) scale(1)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.5) 100%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: '8px',
          left: '8px',
          fontSize: '18px',
          pointerEvents: 'auto',
          cursor: 'pointer',
          filter: recipe.isFavorite ? 'drop-shadow(0 0 4px #ffcc00)' : 'none',
          transition: 'filter 0.2s ease-out',
          zIndex: 2,
        }}
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite(recipe.id);
        }}
      >
        {recipe.isFavorite ? '⭐' : '☆'}
      </div>

      <div
        style={{
          position: 'absolute',
          top: '6px',
          right: '6px',
          display: 'flex',
          gap: '2px',
          pointerEvents: 'auto',
          zIndex: 2,
        }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onShare(recipe.id);
          }}
          style={{
            background: 'rgba(0,0,0,0.35)',
            border: 'none',
            color: '#fff',
            width: '26px',
            height: '26px',
            borderRadius: '50%',
            cursor: 'pointer',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.2s ease-out',
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.55)')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.35)')}
        >
          🔗
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm('确定删除这个配方吗？')) onDelete(recipe.id);
          }}
          style={{
            background: 'rgba(0,0,0,0.35)',
            border: 'none',
            color: '#fff',
            width: '26px',
            height: '26px',
            borderRadius: '50%',
            cursor: 'pointer',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.2s ease-out',
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.55)')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.35)')}
        >
          🗑️
        </button>
      </div>

      <div
        style={{
          position: 'absolute',
          top: '40px',
          left: '0',
          right: '0',
          display: 'flex',
          justifyContent: 'center',
          gap: '4px',
          flexWrap: 'wrap',
          padding: '0 10px',
          zIndex: 1,
        }}
      >
        {recipe.ingredients.slice(0, 4).map((ing) => (
          <div
            key={ing.name}
            style={{
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              background: ing.color,
              boxShadow: `0 0 6px ${ing.color}`,
              border: '1px solid rgba(255,255,255,0.4)',
            }}
            title={ing.name}
          />
        ))}
        {recipe.ingredients.length > 4 && (
          <span style={{ fontSize: '11px', color: '#fff', opacity: 0.85, lineHeight: '14px' }}>
            +{recipe.ingredients.length - 4}
          </span>
        )}
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: '0',
          left: '0',
          right: '0',
          padding: '12px',
          zIndex: 1,
        }}
      >
        <div
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#fff',
            marginBottom: '6px',
            textShadow: '0 1px 3px rgba(0,0,0,0.5)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {recipe.name}
        </div>
        {moodInfo && (
          <span
            style={{
              display: 'inline-block',
              padding: '2px 8px',
              borderRadius: '10px',
              fontSize: '11px',
              background: `${moodInfo.color}88`,
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.25)',
            }}
          >
            {moodInfo.label}
          </span>
        )}
      </div>
    </div>
  );
};

export default RecipeCard;
