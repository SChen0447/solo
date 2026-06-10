import EasingCard from './EasingCard';
import type { EasingPreset } from '@/utils/easingPresets';

interface EasingGridProps {
  presets: EasingPreset[];
  matchedIds: Set<string>;
  globalSignal: number;
  onEdit: (preset: EasingPreset) => void;
}

export default function EasingGrid({ presets, matchedIds, globalSignal, onEdit }: EasingGridProps) {
  if (presets.length === 0) {
    return (
      <div className="easing-grid">
        <div className="no-results">没有匹配的缓动函数，请尝试其他搜索条件</div>
      </div>
    );
  }

  return (
    <div className="easing-grid">
      {presets.map((preset) => (
        <EasingCard
          key={preset.id}
          preset={preset}
          globalSignal={globalSignal}
          isMatched={matchedIds.has(preset.id)}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
}
