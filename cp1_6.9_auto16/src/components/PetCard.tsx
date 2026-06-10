import React from 'react';
import { Pet, SkillType } from '../types';
import { getPetBorderColor, getPetEmoji } from '../utils/gameLogic';

interface PetCardProps {
  pet: Pet;
  selected: boolean;
  onSelect: () => void;
  onStartTraining: (petId: string, skill: SkillType) => void;
}

export const PetCard: React.FC<PetCardProps> = ({ pet, selected, onSelect, onStartTraining }) => {
  const borderColor = getPetBorderColor(pet.type);
  const emoji = getPetEmoji(pet.type);

  const renderStars = (level: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} style={{ color: i < level ? '#FFD700' : '#ccc', fontSize: '12px' }}>
        ★
      </span>
    ));
  };

  const renderProgressBar = (value: number, max: number = 10, color: string = '#2E8B57') => {
    const pct = (value / max) * 100;
    return (
      <div style={{
        width: '100%',
        height: '8px',
        background: '#e0e0e0',
        borderRadius: '4px',
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${pct}%`,
          height: '100%',
          background: color,
          borderRadius: '4px',
          transition: 'width 0.3s ease',
        }} />
      </div>
    );
  };

  return (
    <div
      onClick={onSelect}
      style={{
        width: '200px',
        borderRadius: '12px',
        border: `3px solid ${borderColor}`,
        background: selected ? '#FFF8DC' : '#FFFFFF',
        padding: '12px',
        cursor: 'pointer',
        boxShadow: selected ? '0 4px 12px rgba(139,69,19,0.3)' : '0 2px 6px rgba(0,0,0,0.1)',
        transition: 'all 0.2s ease',
        position: 'relative',
        animation: pet.isExcited ? 'bounce 0.3s ease' : undefined,
      }}
    >
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-50px); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 5px #FFD700; }
          50% { box-shadow: 0 0 20px #FFD700, 0 0 30px #FFD700; }
        }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <span style={{
          fontSize: '36px',
          animation: pet.isExcited ? 'pulse-glow 0.3s ease' : undefined,
        }}>{emoji}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 'bold', color: '#8B4513', fontSize: '16px' }}>
            {pet.name}
          </div>
          <div style={{ fontSize: '11px', color: '#666' }}>
            {pet.type === 'cat' ? '猫咪' : pet.type === 'dog' ? '狗狗' : '兔子'}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '6px' }}>
        <div style={{ fontSize: '11px', color: '#666', marginBottom: '2px' }}>
          灵活度: {pet.agility}/10
        </div>
        {renderProgressBar(pet.agility)}
      </div>

      <div style={{ marginBottom: '8px' }}>
        <div style={{ fontSize: '11px', color: '#666', marginBottom: '2px' }}>
          专注度: {pet.focus}/10
        </div>
        {renderProgressBar(pet.focus)}
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '11px',
        marginBottom: pet.isTraining ? '8px' : '0',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div>☕</div>
          <div>{renderStars(pet.skills.espresso)}</div>
          <div style={{ color: '#888', fontSize: '10px' }}>浓缩</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div>🎨</div>
          <div>{renderStars(pet.skills.latteArt)}</div>
          <div style={{ color: '#888', fontSize: '10px' }}>拉花</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div>💧</div>
          <div>{renderStars(pet.skills.pourOver)}</div>
          <div style={{ color: '#888', fontSize: '10px' }}>手冲</div>
        </div>
      </div>

      {pet.isTraining && (
        <div style={{ marginTop: '8px' }}>
          <div style={{ fontSize: '12px', color: '#D2691E', fontWeight: 'bold', marginBottom: '4px' }}>
            训练中: {pet.trainingSkill === 'espresso' ? '浓缩训练' : pet.trainingSkill === 'latteArt' ? '拉花训练' : '手冲训练'}
          </div>
          {renderProgressBar(pet.trainingProgress, 100, '#D2691E')}
          <div style={{ fontSize: '11px', textAlign: 'right', color: '#666', marginTop: '2px' }}>
            {Math.floor(pet.trainingProgress)}%
          </div>
        </div>
      )}

      {selected && !pet.isTraining && (
        <div style={{
          display: 'flex',
          gap: '6px',
          marginTop: '10px',
          paddingTop: '10px',
          borderTop: '1px dashed #D2B48C',
        }}>
          <button
            onClick={(e) => { e.stopPropagation(); onStartTraining(pet.id, 'espresso'); }}
            style={{
              flex: 1,
              padding: '6px 8px',
              border: 'none',
              borderRadius: '6px',
              background: '#8B4513',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '12px',
              transition: 'all 0.2s',
            }}
            onMouseDown={(e) => { e.currentTarget.style.transform = 'translateY(2px)'; }}
            onMouseUp={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            浓缩训练
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onStartTraining(pet.id, 'latteArt'); }}
            style={{
              flex: 1,
              padding: '6px 8px',
              border: 'none',
              borderRadius: '6px',
              background: '#DAA520',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '12px',
              transition: 'all 0.2s',
            }}
            onMouseDown={(e) => { e.currentTarget.style.transform = 'translateY(2px)'; }}
            onMouseUp={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            拉花训练
          </button>
        </div>
      )}
    </div>
  );
};
