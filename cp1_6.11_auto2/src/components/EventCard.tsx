import React from 'react';
import { HistoricalEvent, eraColors, eraNames } from '../data/initialEvents';

interface EventCardProps {
  event: HistoricalEvent;
  onClose: () => void;
  onEdit?: (event: HistoricalEvent) => void;
  onDelete?: (id: string) => void;
}

const EventCard: React.FC<EventCardProps> = ({ event, onClose, onEdit, onDelete }) => {
  const formatDate = (date: number): string => {
    if (date < 0) {
      return `公元前 ${Math.abs(date)} 年`;
    }
    return `公元 ${date} 年`;
  };

  const eraColor = event.isCustom ? eraColors['custom'] : eraColors[event.era] || '#888';
  const eraName = event.isCustom ? '自定义' : eraNames[event.era] || event.era;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="event-card-overlay" onClick={handleOverlayClick}>
      <div className="event-card">
        <button className="event-card-close" onClick={onClose} aria-label="关闭">
          ×
        </button>

        <div className="event-card-image">
          <img src={event.imageUrl} alt={event.title} />
          <div
            className="event-card-era-badge"
            style={{ backgroundColor: eraColor }}
          >
            {eraName}
          </div>
        </div>

        <div className="event-card-content">
          <h2 className="event-card-title">{event.title}</h2>
          <div className="event-card-date">{formatDate(event.date)}</div>
          <p className="event-card-description">{event.description}</p>
        </div>

        {event.isCustom && (
          <div className="event-card-actions">
            <button
              className="btn btn-edit"
              onClick={() => onEdit?.(event)}
            >
              编辑
            </button>
            <button
              className="btn btn-delete"
              onClick={() => {
                if (window.confirm('确定要删除这个事件吗？')) {
                  onDelete?.(event.id);
                }
              }}
            >
              删除
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventCard;
