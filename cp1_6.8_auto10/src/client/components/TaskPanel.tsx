import { useState, useEffect, useCallback } from 'react';
import dayjs from 'dayjs';
import { getPriorityColor, getTaskStatus } from '../utils/gantt';
import type { Task, OnlineUser } from '../../types';

interface TaskPanelProps {
  task: Task | null;
  tasks: Task[];
  isCreating: boolean;
  createTaskData: { startDate: string; endDate: string } | null;
  onClose: () => void;
  onUpdate: (id: string, data: Partial<Task>) => void;
  onDelete: (id: string) => void;
  onCreate: (data: Partial<Task>) => void;
  onlineUsers: OnlineUser[];
}

function TaskPanel({
  task,
  tasks,
  isCreating,
  createTaskData,
  onClose,
  onUpdate,
  onDelete,
  onCreate,
  onlineUsers,
}: TaskPanelProps) {
  const [formData, setFormData] = useState<Partial<Task>>({
    name: '',
    startDate: '',
    endDate: '',
    priority: 'medium',
    assignee: '',
    description: '',
    progress: 0,
    dependencies: [],
  });
  const [isEditing, setIsEditing] = useState(false);

  const isVisible = task || isCreating;

  useEffect(() => {
    if (isCreating && createTaskData) {
      setFormData({
        name: '',
        startDate: createTaskData.startDate,
        endDate: createTaskData.endDate,
        priority: 'medium',
        assignee: '',
        description: '',
        progress: 0,
        dependencies: [],
      });
      setIsEditing(true);
    } else if (task) {
      setFormData(task);
      setIsEditing(false);
    }
  }, [task, isCreating, createTaskData]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.startDate || !formData.endDate) {
      return;
    }

    if (isCreating) {
      onCreate(formData);
    } else if (task) {
      onUpdate(task.id, formData);
      setIsEditing(false);
    }
  }, [formData, isCreating, task, onCreate, onUpdate]);

  const handleDelete = useCallback(() => {
    if (task && window.confirm('确定要删除这个任务吗？')) {
      onDelete(task.id);
    }
  }, [task, onDelete]);

  const toggleDependency = useCallback((depId: string) => {
    setFormData(prev => {
      const deps = prev.dependencies || [];
      if (deps.includes(depId)) {
        return { ...prev, dependencies: deps.filter(d => d !== depId) };
      } else {
        return { ...prev, dependencies: [...deps, depId] };
      }
    });
  }, []);

  if (!isVisible) return null;

  const status = task ? getTaskStatus(task) : 'not-started';
  const statusText = {
    'not-started': '未开始',
    'in-progress': '进行中',
    'completed': '已完成',
  }[status];

  const availableDependencies = tasks.filter(
    t => t.id !== task?.id && !formData.dependencies?.includes(t.id)
  );

  return (
    <div className={`task-panel ${isVisible ? 'visible' : ''}`}>
      <div className="task-panel-header">
        <h3 className="task-panel-title">
          {isCreating ? '新建任务' : isEditing ? '编辑任务' : '任务详情'}
        </h3>
        <button className="panel-close-btn" onClick={onClose}>
          ×
        </button>
      </div>

      <div className="task-panel-content">
        <form onSubmit={handleSubmit} className="task-form">
          <div className="form-group">
            <label className="form-label">任务名称</label>
            <input
              type="text"
              className="form-input"
              value={formData.name || ''}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              disabled={!isEditing && !isCreating}
              placeholder="请输入任务名称"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">开始日期</label>
              <input
                type="date"
                className="form-input"
                value={formData.startDate || ''}
                onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                disabled={!isEditing && !isCreating}
              />
            </div>
            <div className="form-group">
              <label className="form-label">结束日期</label>
              <input
                type="date"
                className="form-input"
                value={formData.endDate || ''}
                onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                disabled={!isEditing && !isCreating}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">优先级</label>
              <select
                className="form-select"
                value={formData.priority || 'medium'}
                onChange={e => setFormData({ ...formData, priority: e.target.value as 'high' | 'medium' | 'low' })}
                disabled={!isEditing && !isCreating}
              >
                <option value="high">高</option>
                <option value="medium">中</option>
                <option value="low">低</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">负责人</label>
              <input
                type="text"
                className="form-input"
                value={formData.assignee || ''}
                onChange={e => setFormData({ ...formData, assignee: e.target.value })}
                disabled={!isEditing && !isCreating}
                placeholder="请输入负责人"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">进度: {formData.progress || 0}%</label>
            <input
              type="range"
              className="form-range"
              min="0"
              max="100"
              value={formData.progress || 0}
              onChange={e => setFormData({ ...formData, progress: parseInt(e.target.value) })}
              disabled={!isEditing && !isCreating}
            />
          </div>

          <div className="form-group">
            <label className="form-label">任务描述</label>
            <textarea
              className="form-textarea"
              value={formData.description || ''}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              disabled={!isEditing && !isCreating}
              placeholder="请输入任务描述"
              rows={4}
            />
          </div>

          <div className="form-group">
            <label className="form-label">依赖任务</label>
            <div className="dependency-list">
              {formData.dependencies?.map(depId => {
                const depTask = tasks.find(t => t.id === depId);
                if (!depTask) return null;
                return (
                  <div key={depId} className="dependency-item">
                    <span
                      className="priority-dot"
                      style={{ background: getPriorityColor(depTask.priority) }}
                    />
                    <span className="dependency-name">{depTask.name}</span>
                    {(isEditing || isCreating) && (
                      <button
                        type="button"
                        className="remove-dependency-btn"
                        onClick={() => toggleDependency(depId)}
                      >
                        ×
                      </button>
                    )}
                  </div>
                );
              })}
              {(isEditing || isCreating) && availableDependencies.length > 0 && (
                <div className="add-dependency">
                  <select
                    className="form-select small"
                    value=""
                    onChange={e => {
                      if (e.target.value) {
                        toggleDependency(e.target.value);
                      }
                    }}
                  >
                    <option value="">+ 添加依赖</option>
                    {availableDependencies.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {(!formData.dependencies || formData.dependencies.length === 0) && !isEditing && !isCreating && (
                <span className="empty-text">无依赖</span>
              )}
            </div>
          </div>

          {task && !isEditing && (
            <div className="task-meta">
              <div className="meta-item">
                <span className="meta-label">状态</span>
                <span className={`meta-value status-${status}`}>{statusText}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">创建时间</span>
                <span className="meta-value">
                  {dayjs(task.createdAt).format('YYYY-MM-DD HH:mm')}
                </span>
              </div>
              <div className="meta-item">
                <span className="meta-label">更新时间</span>
                <span className="meta-value">
                  {dayjs(task.updatedAt).format('YYYY-MM-DD HH:mm')}
                </span>
              </div>
            </div>
          )}

          <div className="form-actions">
            {(isEditing || isCreating) ? (
              <>
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                  取消
                </button>
                <button type="submit" className="btn btn-primary">
                  {isCreating ? '创建' : '保存'}
                </button>
              </>
            ) : (
              <>
                <button type="button" className="btn btn-danger" onClick={handleDelete}>
                  删除
                </button>
                <button type="button" className="btn btn-primary" onClick={() => setIsEditing(true)}>
                  编辑
                </button>
              </>
            )}
          </div>
        </form>

        <div className="online-users-section">
          <h4 className="section-title">在线协作 ({onlineUsers.length})</h4>
          <div className="online-users-list">
            {onlineUsers.map(user => (
              <div key={user.id} className="online-user-item">
                <div
                  className="user-avatar"
                  style={{ background: user.color }}
                >
                  {user.name.charAt(0)}
                </div>
                <span className="user-name">{user.name}</span>
                <span className="user-status-dot"></span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TaskPanel;
