import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { activityApi } from '../utils/api';
import Toast from '../components/Toast';
import type { ActivityType } from '../types';

interface AdminPageProps {
  onActivityCreated: (id: string) => void;
}

interface FormData {
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  type: ActivityType;
  capacity: string;
}

interface FormErrors {
  title?: string;
  date?: string;
  time?: string;
  location?: string;
  description?: string;
  type?: string;
  capacity?: string;
}

const today = new Date().toISOString().split('T')[0];

const AdminPage: React.FC<AdminPageProps> = ({ onActivityCreated }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({
    title: '',
    date: '',
    time: '',
    location: '',
    description: '',
    type: '文学',
    capacity: '30'
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success'
  });

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.title.trim()) newErrors.title = '请输入活动标题';
    if (!formData.date) newErrors.date = '请选择活动日期';
    else if (formData.date < today) newErrors.date = '活动日期不能早于今天';
    if (!formData.time.trim()) newErrors.time = '请输入活动时间';
    if (!formData.location.trim()) newErrors.location = '请输入活动地点';
    if (!formData.description.trim()) newErrors.description = '请输入活动描述';
    const cap = Number(formData.capacity);
    if (!formData.capacity || isNaN(cap) || cap < 10 || cap > 100) {
      newErrors.capacity = '人数上限必须是10-100之间的数字';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: undefined });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setSubmitting(true);
      const result = await activityApi.create({
        ...formData,
        capacity: Number(formData.capacity)
      });
      setToast({ visible: true, message: '活动创建成功！', type: 'success' });
      setTimeout(() => {
        onActivityCreated(result.id);
        navigate('/');
      }, 800);
    } catch (err) {
      setToast({ visible: true, message: err instanceof Error ? err.message : '创建失败', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <form className="admin-form" onSubmit={handleSubmit}>
        <h2>📚 创建读书会活动</h2>

        <div className="form-group">
          <label className="form-label">活动标题 *</label>
          <input
            type="text"
            className="form-input"
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="请输入活动标题"
          />
          {errors.title && <div className="form-error">{errors.title}</div>}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">活动日期 *</label>
            <input
              type="date"
              className="form-input"
              value={formData.date}
              min={today}
              onChange={(e) => handleChange('date', e.target.value)}
            />
            {errors.date && <div className="form-error">{errors.date}</div>}
          </div>
          <div className="form-group">
            <label className="form-label">活动时间 *</label>
            <input
              type="text"
              className="form-input"
              value={formData.time}
              onChange={(e) => handleChange('time', e.target.value)}
              placeholder="例：14:00-16:00"
            />
            {errors.time && <div className="form-error">{errors.time}</div>}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">活动地点 *</label>
          <input
            type="text"
            className="form-input"
            value={formData.location}
            onChange={(e) => handleChange('location', e.target.value)}
            placeholder="请输入活动地点"
          />
          {errors.location && <div className="form-error">{errors.location}</div>}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">活动类型 *</label>
            <select
              className="form-select"
              value={formData.type}
              onChange={(e) => handleChange('type', e.target.value as ActivityType)}
            >
              <option value="文学">文学</option>
              <option value="科学">科学</option>
              <option value="艺术">艺术</option>
              <option value="生活">生活</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">人数上限 (10-100) *</label>
            <input
              type="number"
              className="form-input"
              value={formData.capacity}
              min="10"
              max="100"
              onChange={(e) => handleChange('capacity', e.target.value)}
            />
            {errors.capacity && <div className="form-error">{errors.capacity}</div>}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">活动描述 *</label>
          <textarea
            className="form-textarea"
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="请描述活动内容、流程等信息"
          />
          {errors.description && <div className="form-error">{errors.description}</div>}
        </div>

        <div className="form-actions" style={{ justifyContent: 'space-between' }}>
          <button type="button" className="btn btn-back" onClick={() => navigate('/')}>
            取消
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? '创建中...' : '创建活动'}
          </button>
        </div>
      </form>

      <Toast
        isVisible={toast.visible}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, visible: false })}
      />
    </div>
  );
};

export default AdminPage;
