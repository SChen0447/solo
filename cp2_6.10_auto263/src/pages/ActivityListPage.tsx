import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { activityApi } from '../utils/api';
import ActivityCard from '../components/ActivityCard';
import Toast from '../components/Toast';
import type { Activity } from '../types';
import { getMonthStr, isActivityEnded } from '../utils/helpers';

interface ActivityListPageProps {
  newActivityId?: string | null;
  onClearNewActivity?: () => void;
}

const ActivityListPage: React.FC<ActivityListPageProps> = ({ newActivityId, onClearNewActivity }) => {
  const navigate = useNavigate();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthFilter, setMonthFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success'
  });

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const data = await activityApi.getList();
      setActivities(data);
    } catch (err) {
      setToast({ visible: true, message: err instanceof Error ? err.message : '加载失败', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  useEffect(() => {
    if (newActivityId) {
      setToast({ visible: true, message: '活动创建成功！', type: 'success' });
      const timer = setTimeout(() => {
        onClearNewActivity?.();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [newActivityId, onClearNewActivity]);

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    activities.forEach((a) => months.add(getMonthStr(a.date)));
    return Array.from(months).sort().reverse();
  }, [activities]);

  const filteredActivities = useMemo(() => {
    return activities.filter((activity) => {
      if (monthFilter !== 'all' && getMonthStr(activity.date) !== monthFilter) {
        return false;
      }
      if (statusFilter === 'upcoming' && isActivityEnded(activity.date)) {
        return false;
      }
      if (statusFilter === 'ended' && !isActivityEnded(activity.date)) {
        return false;
      }
      return true;
    });
  }, [activities, monthFilter, statusFilter]);

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  return (
    <div>
      <div className="filter-bar">
        <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}>
          <option value="all">全部月份</option>
          {availableMonths.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">全部状态</option>
          <option value="upcoming">即将开始</option>
          <option value="ended">已结束</option>
        </select>
      </div>

      {filteredActivities.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📖</div>
          <p>暂无活动</p>
        </div>
      ) : (
        <div className="activity-grid">
          {filteredActivities.map((activity, index) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              isNew={activity.id === newActivityId}
              index={index}
              onClick={() => navigate(`/activity/${activity.id}`)}
            />
          ))}
        </div>
      )}

      <Toast
        isVisible={toast.visible}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, visible: false })}
      />
    </div>
  );
};

export default ActivityListPage;
