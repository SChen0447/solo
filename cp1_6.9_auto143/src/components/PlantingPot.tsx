import React from 'react';
import type { Flower, CareAction, FlowerSpecies } from '../types';
import { drawPixelFlower } from '../utils/canvasFlower';
import { useEffect, useRef } from 'react';

interface PlantingPotProps {
  flower?: Flower;
  potIndex: number;
  onPlant: (species: FlowerSpecies, potIndex: number) => void;
  onCare: (flowerId: string, action: CareAction) => void;
  onMakeSpecimen?: (flowerId: string) => void;
  showSeedSelector: boolean;
  setShowSeedSelector: (v: boolean) => void;
}

const SEED_OPTIONS: { species: FlowerSpecies; emoji: string; name: string; meaning: string; color: string }[] = [
  { species: 'rose', emoji: '🌹', name: '红玫瑰', meaning: '热情与爱', color: '#FF3366' },
  { species: 'iris', emoji: '💐', name: '蓝鸢尾', meaning: '优雅与希望', color: '#5B8DEF' },
  { species: 'sunflower', emoji: '🌻', name: '黄向日葵', meaning: '阳光与忠诚', color: '#FFC93C' },
];

const PlantingPot: React.FC<PlantingPotProps> = ({
  flower,
  potIndex,
  onPlant,
  onCare,
  onMakeSpecimen,
  showSeedSelector,
  setShowSeedSelector,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (flower && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        const size = canvasRef.current.width;
        drawPixelFlower(ctx, flower.species, flower.color, size, flower.progress);
      }
    }
  }, [flower]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getMonth() + 1}月${d.getDate()}日 ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  if (flower && flower.unlocked) {
    return (
      <div className="pot-slot">
        <div className="card-paper flower-card">
          <div className="flower-canvas-wrap">
            <canvas ref={canvasRef} width={120} height={120} />
          </div>
          <div className="flower-name" style={{ color: flower.color }}>
            {flower.name}
          </div>
          <div className="flower-meaning">「{flower.meaning}」</div>
          {flower.unlockedAt && <div className="flower-date">解锁于 {formatDate(flower.unlockedAt)}</div>}
          {onMakeSpecimen && (
            <button
              className="btn btn-secondary"
              style={{ marginTop: 12, width: '100%', justifyContent: 'center' }}
              onClick={() => onMakeSpecimen(flower._id)}
            >
              📖 制作标本
            </button>
          )}
        </div>
      </div>
    );
  }

  if (flower && !flower.unlocked) {
    return (
      <div className="pot-slot">
        <div className="card-paper progress-wrap">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
            <canvas ref={canvasRef} width={80} height={80} />
          </div>
          <div className="progress-label">
            <span style={{ fontWeight: 600, color: flower.color }}>{flower.name}</span>
            <span>{flower.progress}%</span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${flower.progress}%`, background: flower.color }}
            />
          </div>
          <div className="progress-label">
            <span>健康度</span>
            <span>{flower.health}/100</span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${flower.health}%`,
                background: flower.health > 50 ? '#7DCEA0' : flower.health > 20 ? '#FFC93C' : '#FF3366',
              }}
            />
          </div>
          <div className="care-btns">
            <button className="care-btn" onClick={() => onCare(flower._id, 'water')}>
              <span className="care-icon">💧</span>
              <span>浇水</span>
              <span style={{ fontSize: 10, color: '#999' }}>+10%</span>
            </button>
            <button className="care-btn" onClick={() => onCare(flower._id, 'fertilize')}>
              <span className="care-icon">🧪</span>
              <span>施肥</span>
              <span style={{ fontSize: 10, color: '#999' }}>+15%/-5</span>
            </button>
            <button className="care-btn" onClick={() => onCare(flower._id, 'light')}>
              <span className="care-icon">☀️</span>
              <span>光照</span>
              <span style={{ fontSize: 10, color: '#999' }}>+5%/+5</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="pot-slot" onClick={() => setShowSeedSelector(true)}>
        <div className="pot pot-empty">
          <div className="pot-body" />
          <div className="pot-rim" />
          <div className="pot-soil" />
        </div>
      </div>
      {showSeedSelector && (
        <div className="seed-selector" onClick={() => setShowSeedSelector(false)}>
          <div className="seed-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowSeedSelector(false)}>
              ✕
            </button>
            <h2 style={{ fontFamily: 'Georgia, serif', marginBottom: 8, textAlign: 'center' }}>
              🌱 选择一颗种子
            </h2>
            <p style={{ textAlign: 'center', color: '#666', fontSize: 14 }}>
              悉心照料，解锁专属花语密码
            </p>
            <div className="seed-options">
              {SEED_OPTIONS.map((opt) => (
                <div
                  key={opt.species}
                  className="seed-option"
                  onClick={() => {
                    onPlant(opt.species, potIndex);
                    setShowSeedSelector(false);
                  }}
                >
                  <div className="seed-emoji">{opt.emoji}</div>
                  <div className="seed-name" style={{ color: opt.color }}>
                    {opt.name}
                  </div>
                  <div className="seed-meaning">{opt.meaning}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PlantingPot;
