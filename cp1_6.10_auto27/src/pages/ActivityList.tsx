import { useState, useMemo } from 'react';
import type { Activity, CheckInRecord, Toast } from '@/types';
import { generateId, generateActivityCode, formatDate, createToast } from '@/utils';
import { ToastContainer } from '@/components/Toast';

interface ActivityListProps {
  activities: Activity[];
  onAddActivity: (activity: Activity) => void;
  onSelectActivity: (activity: Activity) => void;
}

type SortType = 'date' | 'hot';

export default function ActivityList({ activities, onAddActivity, onSelectActivity }: ActivityListProps) {
  const [showModal, setShowModal] = useState(false);
  const [sortType, setSortType] = useState<SortType>('date');
  const [toast, setToast] = useState<Toast | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    location: '',
    description: ''
  });

  const checkInCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    try {
      const records = JSON.parse(localStorage.getItem('checkInRecords') || '[]') as CheckInRecord[];
      records.forEach((r) => {
        counts[r.activityId] = (counts[r.activityId] || 0) + 1;
      });
    } catch (e) {
      console.error(e);
    }
    return counts;
  }, [activities.length]);

  const sortedActivities = useMemo(() => {
    const sorted = [...activities];
    if (sortType === 'date') {
      sorted.sort((a, b) => b.createdAt - a.createdAt);
    } else {
      sorted.sort((a, b) => (checkInCounts[b.id] || 0) - (checkInCounts[a.id] || 0));
    }
    return sorted;
  }, [activities, sortType, checkInCounts]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.date || !formData.location) {
      setToast(createToast('请填写完整信息', 'error'));
      return;
    }

    const newActivity: Activity = {
      id: generateId(),
      name: formData.name,
      date: formData.date,
      location: formData.location,
      description: formData.description,
      code: generateActivityCode(),
      createdAt: Date.now()
    };

    onAddActivity(newActivity);
    setShowModal(false);
    setFormData({ name: '', date: '', location: '', description: '' });
    setToast(createToast('活动创建成功！'));
  };

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">🎯 活动中心</h1>
        <div className="flex gap-sm">
          <select
            className="select"
            style={{ width: 'auto' }}
            value={sortType}
            onChange={(e) => setSortType(e.target.value as SortType)}
          >
            <option value="date">按时间排序</option>
            <option value="hot">按热度排序</option>
          </select>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            ➕ 创建活动
          </button>
        </div>
      </div>

      {sortedActivities.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📅</div>
          <div className="empty-state-text">还没有活动，点击右上角创建第一个活动吧！</div>
        </div>
      ) : (
        <div className="grid grid-1 grid-2 grid-3" style={{ gap: '20px' }}>
          {sortedActivities.map((activity, index) => (
            <div
              key={activity.id}
              className="card"
              style={{
                background: `linear-gradient(135deg, rgba(58, 134, 255, ${0.15 + index * 0.05}), rgba(157, 78, 221, ${0.15 + index * 0.05}))`,
                cursor: 'pointer',
                animationDelay: `${index * 0.05}s`
              }}
              onClick={() => onSelectActivity(activity)}
            >
              <div className="flex-between" style={{ marginBottom: '12px' }}>
                <div style={{
                  padding: '4px 12px',
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: '600',
                  fontFamily: 'monospace',
                  letterSpacing: '1px'
                }}>
                  #{activity.code}
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: 'var(--text-secondary)',
                  fontSize: '13px'
                }}>
                  👥 {checkInCounts[activity.id] || 0}
                </div>
              </div>

              <h3 style={{ fontSize: '18px', marginBottom: '8px', fontWeight: '700' }}>
                {activity.name}
              </h3>

              <div style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>
                📍 {activity.location}
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '12px' }}>
                📅 {formatDate(activity.date)}
              </div>

              {activity.description && (
                <p style={{
                  color: 'var(--text-muted)',
                  fontSize: '13px',
                  lineHeight: '1.6',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {activity.description}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">📅 创建新活动</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">活动名称 *</label>
                <input
                  className="input"
                  placeholder="请输入活动名称"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">活动日期 *</label>
                <input
                  type="date"
                  className="input"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">活动地点 *</label>
                <input
                  className="input"
                  placeholder="请输入活动地点"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">活动描述</label>
                <textarea
                  className="textarea"
                  placeholder="简短描述一下活动内容..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                ✨ 创建活动
              </button>
            </form>
          </div>
        </div>
      )}

      <ToastContainer toast={toast} />
    </div>
  );
}
