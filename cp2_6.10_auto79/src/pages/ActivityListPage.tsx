import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useActivities } from '../context/ActivityContext';
import ActivityCard from '../components/ActivityCard';
import { ActivityStatus } from '../types';

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

const ActivityListPage: React.FC = () => {
  const { activities, addActivity } = useActivities();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ActivityStatus>('all');

  const [formData, setFormData] = useState({
    name: '',
    date: '',
    deadline: '',
    capacity: 50,
    description: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filteredActivities = useMemo(() => {
    return activities.filter((activity) => {
      const matchesSearch = activity.name
        .toLowerCase()
        .includes(debouncedSearch.toLowerCase());
      const status = getActivityStatus(activity.date, activity.deadline);
      const matchesStatus = statusFilter === 'all' || status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [activities, debouncedSearch, statusFilter]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = '请输入活动名称';
    } else if (formData.name.length > 30) {
      errors.name = '活动名称最多30字';
    }

    if (!formData.date) {
      errors.date = '请选择活动日期';
    }

    if (!formData.deadline) {
      errors.deadline = '请选择报名截止日期';
    } else if (formData.date && new Date(formData.deadline) > new Date(formData.date)) {
      errors.deadline = '截止日期不能晚于活动日期';
    }

    if (formData.capacity < 10 || formData.capacity > 200) {
      errors.capacity = '活动容量需在10-200人之间';
    }

    if (formData.description.length > 200) {
      errors.description = '活动描述最多200字';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      addActivity({
        name: formData.name,
        date: formData.date,
        deadline: formData.deadline,
        capacity: formData.capacity,
        description: formData.description,
      });
      setFormData({ name: '', date: '', deadline: '', capacity: 50, description: '' });
      setFormErrors({});
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.2s ease',
    background: 'rgba(255,255,255,0.8)',
  };

  const buttonStyle: React.CSSProperties = {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #4F46E5 0%, #10B981 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)',
  };

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
      <h1 style={{ color: 'white', fontSize: '32px', marginBottom: '32px', textAlign: 'center' }}>
        活动报名管理看板
      </h1>

      <div
        style={{
          background: 'rgba(255,255,255,0.7)',
          backdropFilter: 'blur(12px)',
          borderRadius: '12px',
          padding: '28px',
          marginBottom: '32px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        }}
      >
        <h2 style={{ fontSize: '20px', marginBottom: '20px', color: '#1f2937' }}>创建新活动</h2>
        <form onSubmit={handleSubmit}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '16px',
            }}
          >
            <div>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px', color: '#374151' }}>
                活动名称 (最多30字)
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                maxLength={30}
                placeholder="请输入活动名称"
                style={inputStyle}
                onMouseEnter={(e) => {
                  (e.target as HTMLInputElement).style.transform = 'translateY(-2px)';
                  (e.target as HTMLInputElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLInputElement).style.transform = 'translateY(0)';
                  (e.target as HTMLInputElement).style.boxShadow = 'none';
                }}
                onMouseDown={(e) => {
                  (e.target as HTMLInputElement).style.transform = 'scale(0.97)';
                }}
                onMouseUp={(e) => {
                  (e.target as HTMLInputElement).style.transform = 'translateY(-2px)';
                }}
              />
              {formErrors.name && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{formErrors.name}</p>}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px', color: '#374151' }}>
                活动日期
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                style={inputStyle}
                onMouseEnter={(e) => {
                  (e.target as HTMLInputElement).style.transform = 'translateY(-2px)';
                  (e.target as HTMLInputElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLInputElement).style.transform = 'translateY(0)';
                  (e.target as HTMLInputElement).style.boxShadow = 'none';
                }}
                onMouseDown={(e) => {
                  (e.target as HTMLInputElement).style.transform = 'scale(0.97)';
                }}
                onMouseUp={(e) => {
                  (e.target as HTMLInputElement).style.transform = 'translateY(-2px)';
                }}
              />
              {formErrors.date && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{formErrors.date}</p>}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px', color: '#374151' }}>
                报名截止日期
              </label>
              <input
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                style={inputStyle}
                onMouseEnter={(e) => {
                  (e.target as HTMLInputElement).style.transform = 'translateY(-2px)';
                  (e.target as HTMLInputElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLInputElement).style.transform = 'translateY(0)';
                  (e.target as HTMLInputElement).style.boxShadow = 'none';
                }}
                onMouseDown={(e) => {
                  (e.target as HTMLInputElement).style.transform = 'scale(0.97)';
                }}
                onMouseUp={(e) => {
                  (e.target as HTMLInputElement).style.transform = 'translateY(-2px)';
                }}
              />
              {formErrors.deadline && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{formErrors.deadline}</p>}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px', color: '#374151' }}>
                活动容量 (10-200人)
              </label>
              <input
                type="number"
                min={10}
                max={200}
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
                style={inputStyle}
                onMouseEnter={(e) => {
                  (e.target as HTMLInputElement).style.transform = 'translateY(-2px)';
                  (e.target as HTMLInputElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLInputElement).style.transform = 'translateY(0)';
                  (e.target as HTMLInputElement).style.boxShadow = 'none';
                }}
                onMouseDown={(e) => {
                  (e.target as HTMLInputElement).style.transform = 'scale(0.97)';
                }}
                onMouseUp={(e) => {
                  (e.target as HTMLInputElement).style.transform = 'translateY(-2px)';
                }}
              />
              {formErrors.capacity && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{formErrors.capacity}</p>}
            </div>
          </div>

          <div style={{ marginTop: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px', color: '#374151' }}>
              活动描述 (最多200字)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              maxLength={200}
              rows={3}
              placeholder="请输入活动描述"
              style={{ ...inputStyle, resize: 'vertical' }}
              onMouseEnter={(e) => {
                (e.target as HTMLTextAreaElement).style.transform = 'translateY(-2px)';
                (e.target as HTMLTextAreaElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLTextAreaElement).style.transform = 'translateY(0)';
                (e.target as HTMLTextAreaElement).style.boxShadow = 'none';
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              {formErrors.description && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{formErrors.description}</p>}
              <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: 'auto', marginTop: '4px' }}>
                {formData.description.length}/200
              </span>
            </div>
          </div>

          <div style={{ marginTop: '20px' }}>
            <button
              type="submit"
              style={buttonStyle}
              onMouseEnter={(e) => {
                (e.target as HTMLButtonElement).style.transform = 'translateY(-2px)';
                (e.target as HTMLButtonElement).style.boxShadow = '0 6px 20px rgba(79, 70, 229, 0.4)';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
                (e.target as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(79, 70, 229, 0.3)';
              }}
              onMouseDown={(e) => {
                (e.target as HTMLButtonElement).style.transform = 'scale(0.97)';
              }}
              onMouseUp={(e) => {
                (e.target as HTMLButtonElement).style.transform = 'translateY(-2px)';
              }}
            >
              创建活动
            </button>
          </div>
        </form>
      </div>

      <div
        style={{
          display: 'flex',
          gap: '16px',
          marginBottom: '24px',
          flexWrap: 'wrap',
        }}
      >
        <input
          type="text"
          placeholder="搜索活动名称..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            ...inputStyle,
            flex: '1',
            minWidth: '200px',
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLInputElement).style.transform = 'translateY(-2px)';
            (e.target as HTMLInputElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLInputElement).style.transform = 'translateY(0)';
            (e.target as HTMLInputElement).style.boxShadow = 'none';
          }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | ActivityStatus)}
          style={{
            ...inputStyle,
            width: '160px',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLSelectElement).style.transform = 'translateY(-2px)';
            (e.target as HTMLSelectElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLSelectElement).style.transform = 'translateY(0)';
            (e.target as HTMLSelectElement).style.boxShadow = 'none';
          }}
        >
          <option value="all">全部状态</option>
          <option value="upcoming">未开始</option>
          <option value="ongoing">进行中</option>
          <option value="ended">已结束</option>
        </select>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '20px',
          transition: 'all 0.3s ease',
        }}
      >
        {filteredActivities.map((activity, index) => (
          <div
            key={activity.id}
            style={{
              animation: 'fadeIn 0.4s ease forwards',
              animationDelay: `${Math.min(index * 0.05, 0.5)}s`,
              opacity: 0,
            }}
            onClick={() => navigate(`/activity/${activity.id}`)}
          >
            <ActivityCard activity={activity} />
          </div>
        ))}
      </div>

      {filteredActivities.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: 'white',
            fontSize: '16px',
          }}
        >
          暂无匹配的活动
        </div>
      )}
    </div>
  );
};

export default ActivityListPage;
