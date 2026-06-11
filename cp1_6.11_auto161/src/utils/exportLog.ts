import { saveAs } from 'file-saver';
import type { GardenSlot } from '../types';
import { PLANT_CONFIGS, HEALTH_STATUS_LABELS } from '../constants/plants';

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatHealthHistory(history: Array<{ status: string; timestamp: number }>): string {
  return history
    .map((h) => `${formatTimestamp(h.timestamp)}: ${HEALTH_STATUS_LABELS[h.status] || h.status}`)
    .join('; ');
}

export function generateGrowthLogCSV(slots: GardenSlot[]): string {
  const headers = [
    '植物名称',
    '植物种类',
    '种植时间',
    '当前生长进度',
    '总生长周期',
    '完成百分比',
    '浇水次数',
    '当前健康状态',
    '健康状态变化记录',
    '当前光照值',
    '当前水量值',
    '当前肥料值',
  ];

  const rows = slots
    .filter((slot) => slot.plant !== null)
    .map((slot) => {
      const plant = slot.plant!;
      const config = PLANT_CONFIGS[plant.type];
      const growthPercent = ((plant.growth / plant.maxGrowth) * 100).toFixed(1);

      return [
        plant.name,
        config.name,
        formatTimestamp(plant.plantedAt),
        plant.growth.toFixed(2),
        plant.maxGrowth,
        `${growthPercent}%`,
        plant.waterCount,
        HEALTH_STATUS_LABELS[plant.healthStatus] || plant.healthStatus,
        formatHealthHistory(plant.healthHistory),
        plant.params.light,
        plant.params.water,
        plant.params.fertilizer,
      ].map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',');
    });

  return [headers.join(','), ...rows].join('\n');
}

export function exportGrowthLog(slots: GardenSlot[]): void {
  const csvContent = generateGrowthLogCSV(slots);
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8' });
  const filename = `植物生长日志_${new Date().toISOString().slice(0, 10)}.csv`;
  saveAs(blob, filename);
}
