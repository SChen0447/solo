import React from 'react';
import { Recipe } from '../types';

interface Props {
  recipe: Recipe;
  onClick?: () => void;
  showActions?: boolean;
  onLike?: () => void;
  onClone?: () => void;
  liked?: boolean;
  likeCount?: number;
  compact?: boolean;
  particlePreview?: boolean;
}

export default function Card({
  recipe, onClick, showActions, onLike, onClone, liked, likeCount, compact, particlePreview = true
}: Props) {
  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        background: `linear-gradient(135deg, ${recipe.color}33, rgba(20,10,40,0.85))`,
        border: `1px solid ${recipe.color}55`,
        borderRadius: 16,
        padding: compact ? 14 : 20,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.3s var(--ease-out)',
        overflow: 'hidden',
        backdropFilter: 'blur(8px)'
      }}
      className="recipe-card"
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.transform = 'scale(1.08)';
        (e.currentTarget as HTMLElement).style.boxShadow = `0 0 30px ${recipe.color}66`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
      }}
    >
      {particlePreview && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `radial-gradient(circle at 30% 40%, ${recipe.color}44, transparent 60%)`,
          opacity: 0.8
        }} />
      )}

      <div style={{
        position: 'relative', zIndex: 1,
        width: '100%', aspectRatio: '4/3',
        background: `linear-gradient(135deg, #3311aa, ${recipe.color})`,
        borderRadius: 12,
        marginBottom: compact ? 10 : 14,
        overflow: 'hidden',
        boxShadow: `inset 0 0 30px ${recipe.color}88`
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(circle at 50% 50%, ${recipe.color}aa, transparent 70%)`,
          animation: 'pulseGlow 3s ease-in-out infinite alternate'
        }} />
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: 3 + (i % 3),
            height: 3 + (i % 3),
            borderRadius: '50%',
            background: recipe.color,
            boxShadow: `0 0 8px ${recipe.color}`,
            top: `${10 + (i * 7.3) % 80}%`,
            left: `${5 + (i * 11) % 90}%`,
            animation: `floatParticle ${2 + (i % 3)}s ease-in-out ${i * 0.2}s infinite alternate`
          }} />
        ))}
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        <h3 style={{
          fontSize: compact ? 15 : 17,
          color: recipe.color,
          marginBottom: 6,
          letterSpacing: '0.05em'
        }}>{recipe.name}</h3>

        <div style={{
          fontSize: 11,
          color: 'var(--text-secondary)',
          marginBottom: compact ? 8 : 12
        }}>
          炼金师：{recipe.ownerName}
          <span style={{ margin: '0 6px' }}>·</span>
          {new Date(recipe.createdAt).toLocaleDateString('zh-CN')}
        </div>

        <div style={{
          display: 'flex', gap: 6, marginBottom: compact ? 8 : 12, flexWrap: 'wrap'
        }}>
          <span style={tagStyle('#ffcc66')}>星 {recipe.elements.stardust}</span>
          <span style={tagStyle('#66aaff')}>光 {recipe.elements.lightdust}</span>
          <span style={tagStyle('#6633cc')}>暗 {recipe.elements.darkmatter}</span>
        </div>

        {!compact && (
          <div style={{
            fontSize: 11, color: 'var(--text-muted)',
            display: 'flex', gap: 10, flexWrap: 'wrap'
          }}>
            <span>🌡️ {recipe.conditions.temperature}°C</span>
            <span>💨 {recipe.conditions.pressure.toFixed(1)}atm</span>
            <span>🌀 {recipe.conditions.stirRate}rpm</span>
          </div>
        )}

        {showActions && (
          <div style={{
            display: 'flex', gap: 8, marginTop: compact ? 10 : 14,
            paddingTop: compact ? 10 : 14,
            borderTop: '1px solid rgba(255,255,255,0.08)'
          }}>
            <button
              className="btn"
              onClick={(e) => { e.stopPropagation(); onLike?.(); }}
              style={{
                flex: 1, padding: '6px 12px', fontSize: 12,
                borderColor: liked ? 'rgba(255,102,153,0.5)' : undefined,
                color: liked ? '#ff6699' : undefined
              }}
            >
              {liked ? '💖' : '🤍'} {likeCount ?? recipe.likes.length}
            </button>
            <button
              className="btn btn-primary"
              onClick={(e) => { e.stopPropagation(); onClone?.(); }}
              style={{ flex: 1, padding: '6px 12px', fontSize: 12 }}
            >
              ✨ 克隆
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulseGlow {
          from { opacity: 0.5; transform: scale(1); }
          to { opacity: 0.9; transform: scale(1.05); }
        }
        @keyframes floatParticle {
          from { transform: translateY(0) scale(1); opacity: 0.6; }
          to { transform: translateY(-8px) scale(1.2); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function tagStyle(color: string): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '3px 10px',
    background: color + '22',
    border: `1px solid ${color}55`,
    borderRadius: 12,
    fontSize: 11,
    color
  };
}
