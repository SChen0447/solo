import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';

interface NewProjectModalProps {
  onClose: () => void;
}

const NewProjectModal: React.FC<NewProjectModalProps> = ({ onClose }) => {
  const { createProject } = useAppContext();
  const [name, setName] = useState('');
  const [client, setClient] = useState('');
  const [deadline, setDeadline] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('请输入项目名称');
      return;
    }
    if (name.length > 30) {
      setError('项目名称最多30字');
      return;
    }
    if (!client.trim()) {
      setError('请输入客户姓名');
      return;
    }
    if (client.length > 20) {
      setError('客户姓名最多20字');
      return;
    }
    if (!deadline) {
      setError('请选择截止日期');
      return;
    }

    const project = await createProject(name.trim(), client.trim(), deadline);
    if (project) {
      onClose();
    } else {
      setError('创建项目失败，请重试');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content animate-fade-in-scale"
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
            新建项目
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              padding: 4,
              borderRadius: 4
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
              项目名称 <span style={{ color: '#E53935' }}>*</span>
              <span style={{ marginLeft: 8, fontSize: 11 }}>({name.length}/30)</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 30))}
              placeholder="例如：春季品牌视觉设计"
              className="input-field"
              autoFocus
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
              客户姓名 <span style={{ color: '#E53935' }}>*</span>
              <span style={{ marginLeft: 8, fontSize: 11 }}>({client.length}/20)</span>
            </label>
            <input
              type="text"
              value={client}
              onChange={(e) => setClient(e.target.value.slice(0, 20))}
              placeholder="例如：明月画廊"
              className="input-field"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
              截止日期 <span style={{ color: '#E53935' }}>*</span>
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="input-field"
              style={{ colorScheme: 'dark' }}
            />
          </div>

          {error && (
            <div style={{
              padding: '10px 14px',
              backgroundColor: 'rgba(229, 57, 53, 0.1)',
              border: '1px solid rgba(229, 57, 53, 0.3)',
              borderRadius: 8,
              fontSize: 13,
              color: '#EF5350'
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" onClick={onClose} className="btn-secondary">
              取消
            </button>
            <button type="submit" className="btn-primary">
              创建项目
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewProjectModal;
