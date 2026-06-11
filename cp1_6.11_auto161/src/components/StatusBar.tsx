import type { GardenSlot } from '../types';

interface StatusBarProps {
  slots: GardenSlot[];
}

export default function StatusBar({ slots }: StatusBarProps) {
  const plants = slots.filter((s) => s.plant !== null).map((s) => s.plant!);
  const totalPlants = plants.length;
  const healthyCount = plants.filter((p) => p.healthStatus === 'healthy').length;
  const totalGrowthPercent = totalPlants > 0
    ? plants.reduce((sum, p) => sum + (p.growth / p.maxGrowth) * 100, 0) / totalPlants
    : 0;

  return (
    <div className="status-bar">
      <div className="status-item">
        <span className="status-icon">🌱</span>
        <span className="status-label">总生长进度:</span>
        <span className="status-value">{totalGrowthPercent.toFixed(1)}%</span>
      </div>
      <div className="status-item">
        <span className="status-icon">🌿</span>
        <span className="status-label">健康植物:</span>
        <span className="status-value status-highlight">{healthyCount}</span>
        <span className="status-label">/ {totalPlants} 株</span>
      </div>
      <div className="status-item">
        <span className="status-icon">📊</span>
        <span className="status-label">已种植:</span>
        <span className="status-value">{totalPlants} / 9 槽位</span>
      </div>
    </div>
  );
}
