import React from 'react';
import { Activity, ActivityStatus } from '../types';

interface ActivityCardProps {
  activity: Activity;
}

const getActivityStatus = (date: string, deadline: string): ActivityStatus => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const activityDate = new Date(date);
  activityDate.setHours(0, 0, 0, 0);
  const deadlineDate = new Date(deadline);
  deadlineDate.setHours(0, 0, 0, 0);

  if (activityDate < today) return 'ended';
  if (activityDate.getTime() === today.getTime() || deadlineDate >= today) return 'ongoing';
  return 'upcoming';
};

const getStatusStyle = (status: ActivityStatus): React.CSSProperties => {
  switch (status) {
    case 'upcoming':
      return { background: 'rgba(219, 234, 254, 0.9)', transition: 'background-color 0.5s ease' };
    case 'ongoing':
      return { background: 'rgba(209, 250, 229, 0.9)', transition: 'background-color 0.5s ease' };
    case 'ended':
      return { background: 'rgba(229, 231, 235, 0.9)', transition: 'background-color 0.5s ease' };
  }
};

const getStatusLabel = (status: ActivityStatus): string => {
  switch (status) {
    case 'upcoming':
      return '未开始';
    case 'ongoing':
      return '进行中';
    case 'ended':
      return '已结束';
  }
};

const getStatusBadgeStyle = (status: ActivityStatus): React.CSSProperties => {
  switch (status) {
    case 'upcoming':
      return { background: '#3B82F6', color: 'white' };
    case 'ongoing':
      return { background: '#10B981', color: 'white' };
    case 'ended':
      return { background: '#6B7280', color: 'white' };
  }
};

const getTotalRegistered = (activity: Activity): number => {
  return activity.registrations.reduce((sum, r) => sum + r.count, 0);
};

const ActivityCard: React.FC<ActivityCardProps> = ({ activity }) => {
  const status = getActivityStatus(activity.date, activity.deadline);
  const statusStyle = getStatusStyle(status);
  const totalRegistered = getTotalRegistered(activity);
  const progress = Math.min((totalRegistered / activity.capacity) * 100, 100);

  return (
    <div
      style={{
        ...statusStyle,
        backdropFilter: 'blur(12px)',
        borderRadius: '12px',
        padding: '24px',
        cursor: 'pointer',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        transition: 'all 0.3s ease',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.12)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)';
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.transform = 'scale(0.97)';
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1f2937', flex: 1, marginRight: '12px' }}>
          {activity.name}
        </h3>
        <span
          style={{
            ...getStatusBadgeStyle(status),
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 500,
            whiteSpace: 'nowrap',
          }}
        >
          {getStatusLabel(status)}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px', color: '#4b5563', fontSize: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>📅</span>
          <span>{activity.date}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>⏰</span>
          <span>截止: {activity.deadline}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>👥</span>
          <span>{totalRegistered}/{activity.capacity}人已报名</span>
        </div>
      </div>

      <div style={{ width: '100%', background: 'rgba(255,255,255,0.6)', borderRadius: '8px', height: '8px', overflow: 'hidden', marginBottom: '12px' }}>
        <div
          style={{
            width: `${progress}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #4F46E5, #10B981)',
            borderRadius: '8px',
            transition: 'width 0.5s ease',
          }}
        />
      </div>

      <p style={{ fontSize: '14px', color: '#6b7280', lineHeight: 1.5, flex: 1 }}>
        {activity.description}
      </p>
    </div>
  );
};

export default ActivityCard;
