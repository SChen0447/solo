import type { PlantType } from '../types';
import { PLANT_CONFIGS, PLANT_TYPES } from '../constants/plants';

interface PlantSelectorProps {
  onSelect: (type: PlantType) => void;
  onClose: () => void;
}

export default function PlantSelector({ onSelect, onClose }: PlantSelectorProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content plant-selector" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>选择植物</h2>
          <button className="close-button" onClick={onClose} title="关闭">
            ✕
          </button>
        </div>
        <div className="plant-options">
          {PLANT_TYPES.map((type) => {
            const config = PLANT_CONFIGS[type];
            return (
              <div
                key={type}
                className="plant-option-card"
                onClick={() => onSelect(type)}
              >
                <div className="option-emoji">{config.emoji}</div>
                <div className="option-name">{config.name}</div>
                <div className="option-info">
                  <span>生长周期: {config.maxGrowth}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
