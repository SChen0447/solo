import React from 'react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Plant, HealthStatus } from '../types';

interface PlantCardProps {
  plant: Plant;
  onClick: () => void;
}

const getHealthIcon = (status: HealthStatus) => {
  switch (status) {
    case 'healthy':
      return { color: '#4CAF50', emoji: '😊' };
    case 'neutral':
      return { color: '#FF9800', emoji: '😐' };
    case 'wilting':
      return { color: '#F44336', emoji: '😢' };
  }
};

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '还未养护';
  try {
    return format(new Date(dateStr), 'yyyy-MM-dd', { locale: zhCN });
  } catch {
    return '还未养护';
  }
};

const PlantCard: React.FC<PlantCardProps> = ({ plant, onClick }) => {
  const health = getHealthIcon(plant.healthStatus);

  return (
    <div
      onClick={onClick}
      className="plant-card"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick();
      }}
    >
      <div className="card-content">
        <div className="card-header">
          <h3 className="plant-name" title={plant.name}>
            {plant.name.length > 10 ? plant.name.slice(0, 10) + '…' : plant.name}
          </h3>
          <span
            className="health-icon"
            style={{ color: health.color }}
            title={
              plant.healthStatus === 'healthy'
                ? '状态良好'
                : plant.healthStatus === 'neutral'
                ? '需要关注'
                : '需要养护'
            }
          >
            {health.emoji}
          </span>
        </div>

        <div className="plant-type">{plant.type}</div>

        <div className="card-footer">
          <span className="last-care-label">上次养护：</span>
          <span className="last-care-date">{formatDate(plant.lastCareDate)}</span>
        </div>
      </div>

      <style>{`
        .plant-card {
          width: 100%;
          height: 220px;
          background-color: #FAF0E6;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          padding: 20px;
          cursor: pointer;
          transition: transform 0.3s ease-out, box-shadow 0.3s ease-out;
          display: flex;
          flex-direction: column;
          user-select: none;
        }

        .plant-card:hover,
        .plant-card:focus {
          transform: translateY(-3px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
          outline: none;
        }

        .card-content {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .plant-name {
          font-size: 1.25rem;
          font-weight: 600;
          color: #333;
          margin: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          flex: 1;
          margin-right: 8px;
        }

        .health-icon {
          font-size: 1.6rem;
          flex-shrink: 0;
        }

        .plant-type {
          display: inline-block;
          background-color: #E8F5E9;
          color: #558B2F;
          padding: 4px 12px;
          border-radius: 16px;
          font-size: 0.85rem;
          align-self: flex-start;
          margin-bottom: auto;
        }

        .card-footer {
          margin-top: 16px;
          padding-top: 12px;
          border-top: 1px solid rgba(0, 0, 0, 0.06);
          font-size: 0.85rem;
          color: #666;
        }

        .last-care-label {
          color: #888;
        }

        .last-care-date {
          color: #555;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
};

export default PlantCard;
