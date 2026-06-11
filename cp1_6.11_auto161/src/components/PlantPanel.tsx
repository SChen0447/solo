import { useState } from 'react';
import type { Plant, PlantParams } from '../types';
import { PLANT_CONFIGS, HEALTH_STATUS_LABELS } from '../constants/plants';
import { calculateGrowth } from '../utils/plantEngine';

interface PlantPanelProps {
  plant: Plant;
  onParamChange: (plantId: string, param: keyof PlantParams, value: number) => void;
  onNameChange: (plantId: string, name: string) => void;
  onClose: () => void;
}

export default function PlantPanel({ plant, onParamChange, onNameChange, onClose }: PlantPanelProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(plant.name);
  const [activeSlider, setActiveSlider] = useState<keyof PlantParams | null>(null);

  const config = PLANT_CONFIGS[plant.type];
  const growthRate = calculateGrowth(plant.params);
  const growthPercent = Math.min(100, (plant.growth / plant.maxGrowth) * 100);

  const handleNameDoubleClick = () => {
    setIsEditingName(true);
    setEditName(plant.name);
  };

  const handleNameBlur = () => {
    if (editName.trim()) {
      onNameChange(plant.id, editName.trim());
    }
    setIsEditingName(false);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameBlur();
    } else if (e.key === 'Escape') {
      setIsEditingName(false);
      setEditName(plant.name);
    }
  };

  const handleSliderChange = (param: keyof PlantParams, value: number) => {
    onParamChange(plant.id, param, value);
  };

  const sliderConfigs = [
    { key: 'light' as const, label: '光照', icon: '☀️', color: '#ffc107' },
    { key: 'water' as const, label: '水量', icon: '💧', color: '#2196f3' },
    { key: 'fertilizer' as const, label: '肥料', icon: '🌱', color: '#8bc34a' },
  ];

  return (
    <div className="plant-panel">
      <div className="panel-header">
        <div className="panel-title-section">
          <span className="plant-emoji-large">{config.emoji}</span>
          {isEditingName ? (
            <input
              type="text"
              className="name-input"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleNameBlur}
              onKeyDown={handleNameKeyDown}
              autoFocus
            />
          ) : (
            <h2 className="plant-title" onDoubleClick={handleNameDoubleClick} title="双击编辑名称">
              {plant.name}
            </h2>
          )}
        </div>
        <button className="close-button" onClick={onClose} title="关闭">
          ✕
        </button>
      </div>

      <div className="panel-content">
        <div className="growth-info">
          <div className="info-row">
            <span className="info-label">生长进度</span>
            <span className="info-value">{growthPercent.toFixed(1)}%</span>
          </div>
          <div className="info-row">
            <span className="info-label">生长速度</span>
            <span className="info-value">{growthRate.toFixed(4)} /帧</span>
          </div>
          <div className="info-row">
            <span className="info-label">健康状态</span>
            <span className={`info-value health-${plant.healthStatus}`}>
              {HEALTH_STATUS_LABELS[plant.healthStatus]}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">浇水次数</span>
            <span className="info-value">{plant.waterCount} 次</span>
          </div>
        </div>

        <div className="sliders-section">
          <h3 className="section-title">栽培参数</h3>

          {sliderConfigs.map(({ key, label, icon, color }) => {
            const value = plant.params[key];
            const [min, max] = config[`preferred${key.charAt(0).toUpperCase() + key.slice(1)}` as keyof typeof config] as [number, number];
            const isInRange = value >= min && value <= max;
            const isActive = activeSlider === key;

            return (
              <div key={key} className="slider-group">
                <div className="slider-header">
                  <span className="slider-icon">{icon}</span>
                  <span className="slider-label">{label}</span>
                  <span className={`slider-value ${isInRange ? 'in-range' : 'out-range'}`}>
                    {value}
                  </span>
                </div>
                <div className="slider-track-wrapper">
                  <div className="slider-preferred-range" style={{ left: `${min}%`, width: `${max - min}%` }} />
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={value}
                    onChange={(e) => handleSliderChange(key, Number(e.target.value))}
                    onMouseDown={() => setActiveSlider(key)}
                    onMouseUp={() => setActiveSlider(null)}
                    onTouchStart={() => setActiveSlider(key)}
                    onTouchEnd={() => setActiveSlider(null)}
                    className={`custom-slider ${isActive ? 'active' : ''}`}
                    style={{ ['--slider-color' as string]: color }}
                  />
                </div>
                <div className="slider-hint">
                  偏好范围: {min} - {max}
                </div>
              </div>
            );
          })}
        </div>

        <div className="preferences-section">
          <h3 className="section-title">植物习性</h3>
          <div className="preference-grid">
            <div className="preference-item">
              <span className="pref-label">☀️ 光照偏好</span>
              <span className="pref-value">{config.preferredLight[0]} - {config.preferredLight[1]}</span>
            </div>
            <div className="preference-item">
              <span className="pref-label">💧 水量偏好</span>
              <span className="pref-value">{config.preferredWater[0]} - {config.preferredWater[1]}</span>
            </div>
            <div className="preference-item">
              <span className="pref-label">🌱 肥料偏好</span>
              <span className="pref-value">{config.preferredFertilizer[0]} - {config.preferredFertilizer[1]}</span>
            </div>
            <div className="preference-item">
              <span className="pref-label">📊 生长周期</span>
              <span className="pref-value">{config.maxGrowth} 单位</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
