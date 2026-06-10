import React from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import type { Candle } from '../types';

interface CandleCardProps {
  candle: Candle;
  onEdit: (candle: Candle) => void;
  onDelete: (id: string) => void;
}

export const CandleCard: React.FC<CandleCardProps> = ({ candle, onEdit, onDelete }) => {
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`确定要删除「${candle.name}」吗？`)) {
      onDelete(candle.id);
    }
  };

  return (
    <div className="candle-card" onClick={() => onEdit(candle)}>
      <div className="candle-photo">
        {candle.photoUrl ? (
          <img src={candle.photoUrl} alt={candle.name} />
        ) : (
          <span className="candle-photo-placeholder">🕯️</span>
        )}
      </div>
      <div className="candle-body">
        <h3 className="candle-name">{candle.name}</h3>
        <div className="candle-info">
          <span
            className="candle-color"
            style={{ backgroundColor: candle.color }}
            title={candle.color}
          />
          <span className="candle-fragrance">{candle.fragrance}</span>
          <span className="candle-stock">库存: {candle.stock}</span>
          <span className="candle-packaging">{candle.packaging}</span>
        </div>
        {candle.tags.length > 0 && (
          <div className="candle-tags">
            {candle.tags.map((tag, idx) => (
              <span key={idx} className="candle-tag">
                {tag}
              </span>
            ))}
          </div>
        )}
        <div className="candle-actions" onClick={(e) => e.stopPropagation()}>
          <button className="btn btn-secondary btn-sm" onClick={() => onEdit(candle)}>
            <Edit2 size={14} />
            编辑
          </button>
          <button className="btn btn-danger btn-sm" onClick={handleDelete}>
            <Trash2 size={14} />
            删除
          </button>
        </div>
      </div>
    </div>
  );
};

export default CandleCard;
