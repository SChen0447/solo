import React from 'react';
import { TasteData } from './RadarChart';

export interface Recipe {
  id: string;
  name: string;
  province: string;
  description: string;
  imageUrl: string;
  taste: TasteData;
  ingredients: string;
  createdAt: string;
  authorId: string;
  authorName: string;
}

interface RecipeCardProps {
  recipe: Recipe;
  index?: number;
  onClick?: () => void;
  small?: boolean;
}

const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, index = 0, onClick, small = false }) => {
  const compositeIndex = (() => {
    const values = Object.values(recipe.taste) as number[];
    const sum = values.reduce((a, b) => a + b, 0);
    return (sum / 6).toFixed(1);
  })();

  const drawMiniRadar = (taste: TasteData, size: number) => {
    const canvas = document.createElement('canvas');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.scale(dpr, dpr);

    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size * 0.38;

    const keys: (keyof TasteData)[] = ['spicy', 'sour', 'sweet', 'salty', 'umami', 'fatty'];

    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    gradient.addColorStop(0, 'rgba(255, 200, 150, 0.6)');
    gradient.addColorStop(0.5, 'rgba(255, 140, 80, 0.7)');
    gradient.addColorStop(1, 'rgba(200, 50, 30, 0.8)');

    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
      const v = Math.max(0, Math.min(10, taste[keys[i]])) / 10;
      const x = centerX + Math.cos(angle) * radius * v;
      const y = centerY + Math.sin(angle) * radius * v;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = '#E88540';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    for (let i = 1; i <= 3; i++) {
      const r = (radius * i) / 3;
      ctx.beginPath();
      for (let j = 0; j < 6; j++) {
        const angle = (Math.PI * 2 * j) / 6 - Math.PI / 2;
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;
        if (j === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = 'rgba(232, 133, 64, 0.15)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    return canvas.toDataURL();
  };

  const [radarUrl, setRadarUrl] = React.useState('');

  React.useEffect(() => {
    const size = small ? 60 : 80;
    setRadarUrl(drawMiniRadar(recipe.taste, size));
  }, [recipe.taste, small]);

  const cardSize = small ? { width: '100%' } : { width: '100%' };

  return (
    <div
      className="recipe-card"
      onClick={onClick}
      style={{
        ...cardSize,
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        animation: `fadeInUp 0.6s ease ${index * 0.1}s both`,
        opacity: 0
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-5px)';
        e.currentTarget.style.boxShadow = '0 8px 25px rgba(232, 133, 64, 0.2)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 12px rgba(0, 0, 0, 0.08)';
      }}
    >
      <div style={{ position: 'relative', height: small ? '100px' : '140px', background: '#FFF5EE', overflow: 'hidden' }}>
        {recipe.imageUrl ? (
          <img
            src={recipe.imageUrl.startsWith('http') ? recipe.imageUrl : `/api${recipe.imageUrl}`}
            alt={recipe.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #FFE4CC 0%, #FFCC99 100%)',
            fontSize: small ? '24px' : '36px'
          }}>
            🍲
          </div>
        )}
        <div style={{
          position: 'absolute',
          top: '8px',
          left: '8px',
          padding: '4px 10px',
          background: 'rgba(232, 133, 64, 0.9)',
          color: 'white',
          fontSize: '12px',
          borderRadius: '20px',
          fontWeight: 500
        }}>
          {recipe.province}
        </div>
        <div style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          padding: '4px 8px',
          background: 'rgba(255, 255, 255, 0.95)',
          color: '#E88540',
          fontSize: '11px',
          borderRadius: '20px',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: '3px'
        }}>
          <span>⭐</span>
          <span>{compositeIndex}</span>
        </div>
      </div>

      <div style={{ padding: small ? '10px 12px' : '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{
              fontSize: small ? '14px' : '16px',
              fontWeight: 600,
              color: '#333',
              marginBottom: '4px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {recipe.name}
            </h3>
            {!small && (
              <p style={{
                fontSize: '12px',
                color: '#999',
                marginBottom: '8px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical'
              }}>
                {recipe.description}
              </p>
            )}
          </div>
          {radarUrl && (
            <img
              src={radarUrl}
              alt="口味雷达图"
              style={{
                width: small ? '50px' : '70px',
                height: small ? '50px' : '70px',
                flexShrink: 0
              }}
            />
          )}
        </div>

        {!small && recipe.ingredients && (
          <div className="card-ingredients" style={{
            marginTop: '10px',
            paddingTop: '10px',
            borderTop: '1px solid #f0f0f0',
            fontSize: '12px',
            color: '#888',
            lineHeight: 1.5,
            display: 'none'
          }}>
            <span style={{ color: '#E88540', fontWeight: 500 }}>配料：</span>
            {recipe.ingredients}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .recipe-card:hover .card-ingredients {
          display: block;
        }
      `}</style>
    </div>
  );
};

export default RecipeCard;
