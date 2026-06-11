import type { GardenSlot } from '../types';
import { PLANT_CONFIGS, HEALTH_STATUS_COLORS } from '../constants/plants';

interface GardenGridProps {
  slots: GardenSlot[];
  selectedSlotId: number | null;
  onSlotClick: (slotId: number) => void;
}

export default function GardenGrid({ slots, selectedSlotId, onSlotClick }: GardenGridProps) {
  return (
    <div className="garden-grid">
      {slots.map((slot) => {
        const isSelected = slot.id === selectedSlotId;
        const hasPlant = slot.plant !== null;
        const plant = slot.plant;
        const config = hasPlant ? PLANT_CONFIGS[plant!.type] : null;
        const growthPercent = hasPlant ? Math.min(100, (plant!.growth / plant!.maxGrowth) * 100) : 0;
        const healthColor = hasPlant ? HEALTH_STATUS_COLORS[plant!.healthStatus] : 'transparent';

        return (
          <div
            key={slot.id}
            className={`garden-slot ${isSelected ? 'selected' : ''} ${hasPlant ? 'has-plant' : 'empty'}`}
            onClick={() => onSlotClick(slot.id)}
          >
            {hasPlant ? (
              <>
                <div className="plant-emoji">{config?.emoji}</div>
                <div className="plant-name">{plant!.name}</div>
                <div className="progress-bar-container">
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${growthPercent}%` }}
                  />
                  <span className="progress-text">{growthPercent.toFixed(0)}%</span>
                </div>
                <div
                  className="health-indicator"
                  style={{ backgroundColor: healthColor }}
                  title="健康状态"
                />
              </>
            ) : (
              <div className="empty-slot-hint">
                <span className="plus-sign">+</span>
                <span className="empty-text">点击种植</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
