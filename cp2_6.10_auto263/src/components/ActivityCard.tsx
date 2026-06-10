import React, { memo } from 'react';
import { motion } from 'framer-motion';
import type { Activity } from '../types';
import { TYPE_COLORS } from '../types';
import { formatDate } from '../utils/helpers';

interface ActivityCardProps {
  activity: Activity;
  onClick: () => void;
  isNew?: boolean;
  index?: number;
}

const ActivityCard: React.FC<ActivityCardProps> = memo(function ActivityCard({
  activity,
  onClick,
  isNew = false,
  index = 0
}) {
  const coverColor = TYPE_COLORS[activity.type] || '#d4a373';
  const isFull = activity.signups.length >= activity.capacity;

  return (
    <motion.div
      className={`activity-card ${isNew ? 'new-highlight' : ''}`}
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
    >
      <div className="card-cover" style={{ background: `linear-gradient(135deg, ${coverColor}, ${coverColor}dd)` }}>
        <span className="card-cover-type">{activity.type}</span>
        {isFull && <span className="card-full-badge">已满</span>}
      </div>
      <div className="card-content">
        <h3 className="card-title">{activity.title}</h3>
        <div className="card-info">
          <div className="card-info-item">
            <span className="card-info-icon">📅</span>
            <span>{formatDate(activity.date)}</span>
          </div>
          <div className="card-info-item">
            <span className="card-info-icon">⏰</span>
            <span>{activity.time}</span>
          </div>
          <div className="card-info-item">
            <span className="card-info-icon">📍</span>
            <span>{activity.location}</span>
          </div>
        </div>
        <div className="card-footer">
          <div className="card-capacity">
            已报名 <strong>{activity.signups.length}</strong> / {activity.capacity} 人
          </div>
        </div>
      </div>
    </motion.div>
  );
});

export default ActivityCard;
