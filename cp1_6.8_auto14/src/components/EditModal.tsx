import { useState, useEffect } from 'react';
import { getTodayDateString } from '../utils';
import type { Application, ApplicationStatus } from '../types';

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Application, 'id' | 'createdAt' | 'updatedAt'>) => void;
  editingApp: Application | null;
}

export default function EditModal({ isOpen, onClose, onSave, editingApp }: EditModalProps) {
  const [company, setCompany] = useState('');
  const [position, setPosition] = useState('');
  const [applyDate, setApplyDate] = useState(getTodayDateString());
  const [status, setStatus] = useState<ApplicationStatus>('applied');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (editingApp) {
      setCompany(editingApp.company);
      setPosition(editingApp.position);
      setApplyDate(editingApp.applyDate);
      setStatus(editingApp.status);
      setNotes(editingApp.notes);
    } else {
      setCompany('');
      setPosition('');
      setApplyDate(getTodayDateString());
      setStatus('applied');
      setNotes('');
    }
  }, [editingApp, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim() || !position.trim()) return;
    onSave({ company, position, applyDate, status, notes });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{editingApp ? '编辑投递记录' : '添加投递记录'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>公司名称 *</label>
            <input
              type="text"
              value={company}
              onChange={e => setCompany(e.target.value)}
              placeholder="请输入公司名称"
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>职位名称 *</label>
            <input
              type="text"
              value={position}
              onChange={e => setPosition(e.target.value)}
              placeholder="请输入职位名称"
              required
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>投递日期 *</label>
              <input
                type="date"
                value={applyDate}
                onChange={e => setApplyDate(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>状态 *</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as ApplicationStatus)}
              >
                <option value="applied">已投递</option>
                <option value="interviewing">面试中</option>
                <option value="rejected">已拒绝</option>
                <option value="offer">已offer</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>备注</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="记录面试反馈或跟进备注..."
              rows={3}
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn btn-primary">
              {editingApp ? '保存修改' : '添加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
