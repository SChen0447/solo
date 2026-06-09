import React, { useState, useMemo } from 'react';
import { Tour, Venue, VenueStatus } from '../types';
import TourMap from './TourMap';
import VenueEditModal from './VenueEditModal';

interface ScheduleViewProps {
  tour: Tour;
}

const statusConfig: Record<VenueStatus, { label: string; color: string; bgColor: string }> = {
  confirmed: { label: '已确认', color: '#FFFFFF', bgColor: '#4CAF50' },
  pending: { label: '待确认', color: '#FFFFFF', bgColor: '#FF9800' },
  cancelled: { label: '已取消', color: '#FFFFFF', bgColor: '#F44336' }
};

const VenueCard: React.FC<{ venue: Venue; index: number; onClick: () => void }> = ({ venue, index, onClick }) => {
  const config = statusConfig[venue.status];

  return (
    <div className="venue-card" onClick={onClick}>
      <div className="venue-card-header">
        <span className="venue-index">#{index + 1}</span>
        <span
          className="venue-status-tag"
          style={{ backgroundColor: config.bgColor, color: config.color }}
        >
          {config.label}
        </span>
      </div>
      <div className="venue-card-body">
        <div className="venue-date">{venue.date}</div>
        <div className="venue-name">{venue.name}</div>
        <div className="venue-city">📍 {venue.city}</div>
        <div className="venue-address">{venue.address}</div>
      </div>
      <div className="venue-card-footer">
        <span style={{ color: config.bgColor }}>●</span>
        <span className="venue-card-hint">点击编辑</span>
      </div>
    </div>
  );
};

const ScheduleView: React.FC<ScheduleViewProps> = ({ tour }) => {
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null);

  const sortedVenues = useMemo(() => {
    return [...tour.venues].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [tour.venues]);

  const timelineStart = useMemo(() => new Date(tour.startDate), [tour.startDate]);
  const timelineEnd = useMemo(() => {
    const end = new Date(tour.startDate);
    end.setDate(end.getDate() + tour.totalDays);
    return end;
  }, [tour.startDate, tour.totalDays]);

  return (
    <div className="schedule-view">
      <div className="schedule-map-section">
        <div className="section-header">
          <h3>🗺️ 巡演路线</h3>
          <div className="tour-stats">
            <span className="stat-item">
              <span className="stat-label">乐队人数</span>
              <span className="stat-value">{tour.bandSize}人</span>
            </span>
            <span className="stat-item">
              <span className="stat-label">总天数</span>
              <span className="stat-value">{tour.totalDays}天</span>
            </span>
            <span className="stat-item">
              <span className="stat-label">演出场次</span>
              <span className="stat-value">{tour.venues.length}场</span>
            </span>
          </div>
        </div>
        <div className="large-map-container">
          <TourMap venues={tour.venues} width={800} height={350} />
        </div>
      </div>

      <div className="schedule-timeline-section">
        <div className="section-header">
          <h3>📅 时间线</h3>
          <div className="timeline-range">
            {timelineStart.toLocaleDateString('zh-CN')} — {timelineEnd.toLocaleDateString('zh-CN')}
          </div>
        </div>
        <div className="timeline-bar">
          {sortedVenues.map((venue, i) => {
            const venueDate = new Date(venue.date);
            const totalMs = timelineEnd.getTime() - timelineStart.getTime();
            const venueMs = venueDate.getTime() - timelineStart.getTime();
            const position = Math.max(0, Math.min(100, (venueMs / totalMs) * 100));
            const config = statusConfig[venue.status];
            return (
              <div
                key={venue.id}
                className="timeline-marker"
                style={{ left: `${position}%`, backgroundColor: config.bgColor }}
                title={`${venue.city} - ${venue.date}`}
              >
                <span className="timeline-marker-number">{i + 1}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="schedule-venues-section">
        <div className="section-header">
          <h3>🎫 演出场地</h3>
        </div>
        <div className="venues-grid">
          {sortedVenues.map((venue, index) => (
            <VenueCard
              key={venue.id}
              venue={venue}
              index={index}
              onClick={() => setEditingVenue(venue)}
            />
          ))}
        </div>
      </div>

      {editingVenue && (
        <VenueEditModal
          tourId={tour.id}
          venue={editingVenue}
          onClose={() => setEditingVenue(null)}
        />
      )}
    </div>
  );
};

export default ScheduleView;
