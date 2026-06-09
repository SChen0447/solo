import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import type { TaskPriority } from '../types';

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  urgent: '#E53935',
  high: '#FB8C00',
  medium: '#43A047',
  low: '#1E88E5'
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  urgent: '紧急',
  high: '高',
  medium: '中',
  low: '低'
};

const AVATAR_COLORS = ['#F06292', '#BA68C8', '#7986CB', '#4FC3F7', '#4DB6AC', '#81C784', '#FFD54F'];

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('zh-CN', {
    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

const TaskDetailPanel: React.FC = () => {
  const { selectedTask, setSelectedTask, updateTask, users, addComment } = useAppContext();
  const [description, setDescription] = useState('');
  const [assignee, setAssignee] = useState<string>('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [commentInput, setCommentInput] = useState('');
  const commentsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedTask) {
      setDescription(selectedTask.description || '');
      setAssignee(selectedTask.assignee || '');
      setDeadline(selectedTask.deadline || '');
      setPriority(selectedTask.priority || 'medium');
    }
  }, [selectedTask]);

  useEffect(() => {
    if (selectedTask && commentsEndRef.current) {
      commentsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedTask?.comments?.length, selectedTask]);

  if (!selectedTask) return null;

  const handleSave = () => {
    updateTask(selectedTask.id, {
      description,
      assignee: assignee || null,
      deadline: deadline || null,
      priority
    });
  };

  const handleAddComment = () => {
    if (!commentInput.trim()) return;
    const sender = users[0]?.name || '用户';
    addComment(selectedTask.id, sender, commentInput.trim());
    setCommentInput('');
  };

  const currentUser = users.find(u => u.id === assignee);

  return (
    <>
      <div
        onClick={() => setSelectedTask(null)}
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.4)',
          zIndex: 150
        }}
      />
      <div
        className="animate-slide-in-right"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 400,
          maxWidth: '100vw',
          backgroundColor: 'var(--bg-secondary)',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.4)',
          zIndex: 160,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        <div style={{
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-dark)'
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
            {selectedTask.title}
          </h3>
          <button
            onClick={() => setSelectedTask(null)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              padding: 4,
              borderRadius: 4,
              transition: 'background-color 0.15s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20
        }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
              任务描述
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleSave}
              rows={4}
              placeholder="添加任务描述..."
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--border-dark)',
                borderRadius: 8,
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: 13,
                resize: 'vertical',
                lineHeight: 1.5,
                transition: 'border-color 0.15s ease'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#64FFDA'}
              onBlurCapture={(e) => e.currentTarget.style.borderColor = 'var(--border-dark)'}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
              指派成员
            </label>
            <select
              value={assignee}
              onChange={(e) => { setAssignee(e.target.value); handleSave(); }}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--border-dark)',
                borderRadius: 8,
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: 13,
                cursor: 'pointer'
              }}
            >
              <option value="">未指派</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
            {currentUser && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                <span style={{
                  width: 28, height: 28, borderRadius: '50%',
                  backgroundColor: AVATAR_COLORS[currentUser.id.charCodeAt(currentUser.id.length - 1) % AVATAR_COLORS.length],
                  color: '#FFF', fontSize: 12, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {currentUser.initial}
                </span>
                <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{currentUser.name}</span>
              </div>
            )}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
              截止日期
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => { setDeadline(e.target.value); handleSave(); }}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--border-dark)',
                borderRadius: 8,
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: 13,
                colorScheme: 'dark'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
              优先级
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(['urgent', 'high', 'medium', 'low'] as TaskPriority[]).map(p => (
                <button
                  key={p}
                  onClick={() => { setPriority(p); handleSave(); }}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 500,
                    border: priority === p ? `2px solid ${PRIORITY_COLORS[p]}` : '1px solid var(--border-dark)',
                    backgroundColor: priority === p ? `${PRIORITY_COLORS[p]}20` : 'transparent',
                    color: priority === p ? PRIORITY_COLORS[p] : 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {PRIORITY_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 150 }}>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10 }}>
              评论 ({selectedTask.comments?.length || 0})
            </label>
            <div style={{
              flex: 1,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              paddingRight: 4,
              marginBottom: 12
            }}>
              {selectedTask.comments && selectedTask.comments.length > 0 ? (
                selectedTask.comments.map(comment => {
                  const avatarColor = AVATAR_COLORS[comment.sender.charCodeAt(0) % AVATAR_COLORS.length];
                  return (
                    <div key={comment.id} style={{ display: 'flex', gap: 10 }}>
                      <div style={{
                        width: 26, height: 26, borderRadius: '50%',
                        backgroundColor: avatarColor, color: '#FFF',
                        fontSize: 11, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {comment.sender.charAt(0)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                            {comment.sender}
                          </span>
                          <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
                            {formatTime(comment.timestamp)}
                          </span>
                        </div>
                        <p style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 3, lineHeight: 1.5 }}>
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{
                  textAlign: 'center', color: 'var(--text-secondary)', fontSize: 12, padding: '20px 0'
                }}>
                  暂无评论
                </div>
              )}
              <div ref={commentsEndRef} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddComment(); }}
                placeholder="添加评论..."
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid var(--border-dark)',
                  borderRadius: 8,
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: 13
                }}
              />
              <button
                onClick={handleAddComment}
                disabled={!commentInput.trim()}
                className="btn-primary"
                style={{ padding: '8px 16px', fontSize: 13, opacity: commentInput.trim() ? 1 : 0.5 }}
              >
                发送
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TaskDetailPanel;
