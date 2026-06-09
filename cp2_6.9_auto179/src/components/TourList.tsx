import React, { useState } from 'react';
import { useApp } from '../App';
import { Tour } from '../types';
import TourMap from './TourMap';
import CreateTourModal from './CreateTourModal';

const TourItem: React.FC<{ tour: Tour }> = ({ tour }) => {
  const { expandedTourId, setExpandedTourId, selectedTourId, setSelectedTourId, deleteTour } = useApp();
  const isExpanded = expandedTourId === tour.id;
  const isSelected = selectedTourId === tour.id;

  const handleToggle = () => {
    setExpandedTourId(isExpanded ? null : tour.id);
    setSelectedTourId(tour.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`确定删除巡演"${tour.name}"吗？`)) {
      deleteTour(tour.id);
    }
  };

  return (
    <div className={`tour-item ${isSelected ? 'selected' : ''}`}>
      <div className="tour-item-header" onClick={handleToggle}>
        <div className="tour-item-info">
          <div className="tour-item-name">{tour.name}</div>
          <div className="tour-item-meta">
            <span>📅 {tour.startDate}</span>
            <span>🎫 {tour.venues.length}场</span>
          </div>
        </div>
        <div className="tour-item-actions">
          <button className="tour-delete-btn" onClick={handleDelete} title="删除">🗑️</button>
          <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>▼</span>
        </div>
      </div>
      {isExpanded && (
        <div className="tour-item-expanded">
          <TourMap venues={tour.venues} width={280} height={180} />
          <div className="tour-route-info">
            <span>🚩 {tour.startCity}</span>
            <span className="route-arrow">→</span>
            <span>🏁 {tour.endCity}</span>
          </div>
        </div>
      )}
    </div>
  );
};

const TourList: React.FC = () => {
  const { tours } = useApp();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const displayTours = tours.slice(0, 10);

  return (
    <div className="tour-list">
      <button className="btn-primary create-tour-btn" onClick={() => setShowCreateModal(true)}>
        + 新建巡演
      </button>
      <div className="tour-list-container">
        {displayTours.length === 0 ? (
          <div className="tour-list-empty">
            <p>暂无巡演</p>
            <p className="tour-list-empty-hint">点击上方按钮创建</p>
          </div>
        ) : (
          displayTours.map(tour => <TourItem key={tour.id} tour={tour} />)
        )}
      </div>
      {showCreateModal && <CreateTourModal onClose={() => setShowCreateModal(false)} />}
    </div>
  );
};

export default TourList;
