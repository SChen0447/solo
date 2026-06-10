import { useState, useEffect, useRef } from 'react';
import type { Step } from './useWebSocket';

interface Props {
  steps: Step[];
  send: (msg: object) => void;
  lastUpdate: { type: string; id?: string; updatedBy?: string } | null;
}

export default function StepsPanel({ steps, send, lastUpdate }: Props) {
  const [newContent, setNewContent] = useState('');
  const [highlightIds, setHighlightIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if ((lastUpdate?.type === 'step_update' || lastUpdate?.type === 'step_add') && lastUpdate.id) {
      setHighlightIds(prev => new Set(prev).add(lastUpdate.id!));
      setTimeout(() => {
        setHighlightIds(prev => {
          const next = new Set(prev);
          next.delete(lastUpdate.id!);
          return next;
        });
      }, 1200);
    }
  }, [lastUpdate]);

  const handleAdd = () => {
    if (!newContent.trim()) return;
    send({ type: 'step_add', step: { content: newContent.trim() } });
    setNewContent('');
  };

  const handleDelete = (id: string) => {
    send({ type: 'step_delete', id });
  };

  const handleStartEdit = (step: Step) => {
    setEditingId(step.id);
    setEditContent(step.content);
  };

  const handleSaveEdit = (id: string) => {
    if (editContent.trim()) {
      send({ type: 'step_update', id, changes: { content: editContent.trim() } });
    }
    setEditingId(null);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== toIndex) {
      send({ type: 'step_reorder', fromIndex: draggedIndex, toIndex });
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.headerTitle}>📝 烹饪步骤</h2>
        <span style={styles.countBadge}>{steps.length} 步</span>
      </div>

      <div style={styles.addSection}>
        <textarea
          ref={textareaRef}
          placeholder="添加新的烹饪步骤..."
          value={newContent}
          onChange={e => setNewContent(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAdd();
          }}
          style={styles.textarea}
          rows={2}
        />
        <button onClick={handleAdd} style={styles.addBtn}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          添加步骤
        </button>
      </div>

      <div style={styles.stepsList}>
        {steps.map((step, index) => {
          const isHighlighted = highlightIds.has(step.id);
          const isEditing = editingId === step.id;
          const isBeingDragged = draggedIndex === index;
          const isDragOver = dragOverIndex === index && draggedIndex !== index;

          return (
            <div
              key={step.id}
              draggable={!isEditing}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              style={{
                ...styles.stepCard,
                opacity: isBeingDragged ? 0.5 : 1,
                borderColor: isDragOver ? '#90caf9' : '#e0e0e0',
                transform: isDragOver ? 'translateY(4px)' : 'translateY(0)',
                animation: isHighlighted ? 'highlightFlashStep 1.2s ease' : undefined,
              }}
            >
              <div style={styles.stepNumber}>{step.order}</div>
              <div style={styles.stepContent}>
                {isEditing ? (
                  <textarea
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    onBlur={() => handleSaveEdit(step.id)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSaveEdit(step.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    autoFocus
                    style={styles.editTextarea}
                    rows={3}
                  />
                ) : (
                  <p style={styles.stepText} onDoubleClick={() => handleStartEdit(step)}>
                    {step.content}
                  </p>
                )}
              </div>
              <div style={styles.stepActions}>
                <button
                  onClick={() => handleStartEdit(step)}
                  style={styles.actionBtn}
                  title="编辑"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(step.id)}
                  style={{ ...styles.actionBtn, color: '#e53935' }}
                  title="删除"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                    <path d="M10 11v6"></path>
                    <path d="M14 11v6"></path>
                  </svg>
                </button>
                <div style={styles.dragHandle} title="拖动排序">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="9" cy="5" r="1"></circle>
                    <circle cx="9" cy="12" r="1"></circle>
                    <circle cx="9" cy="19" r="1"></circle>
                    <circle cx="15" cy="5" r="1"></circle>
                    <circle cx="15" cy="12" r="1"></circle>
                    <circle cx="15" cy="19" r="1"></circle>
                  </svg>
                </div>
              </div>
            </div>
          );
        })}

        {steps.length === 0 && (
          <div style={styles.empty}>
            <div style={styles.emptyIcon}>🍽️</div>
            <p>还没有步骤，从添加第一步开始吧</p>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#fef9f0',
  },
  header: {
    padding: '16px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid #e0e0e0',
    backgroundColor: '#fff',
  },
  headerTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 600,
    color: '#333',
  },
  countBadge: {
    padding: '2px 10px',
    backgroundColor: '#c8e6c9',
    color: '#2e7d32',
    borderRadius: 10,
    fontSize: 12,
    fontWeight: 500,
  },
  addSection: {
    padding: '16px 24px',
    display: 'flex',
    gap: 12,
    alignItems: 'flex-end',
    backgroundColor: '#fff',
    borderBottom: '1px solid #eee',
  },
  textarea: {
    flex: 1,
    padding: '10px 12px',
    border: '1px solid #e0e0e0',
    borderRadius: 8,
    fontSize: 14,
    fontFamily: 'inherit',
    resize: 'none',
    outline: 'none',
    transition: 'all 0.2s ease',
    lineHeight: 1.5,
  },
  addBtn: {
    padding: '10px 16px',
    backgroundColor: '#4caf50',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap',
  },
  stepsList: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  stepCard: {
    display: 'flex',
    gap: 16,
    padding: '20px',
    backgroundColor: '#ffffff',
    border: '1px solid #e0e0e0',
    borderRadius: 12,
    transition: 'all 0.2s ease',
    cursor: 'default',
    position: 'relative',
  },
  stepNumber: {
    width: 44,
    height: 44,
    flexShrink: 0,
    backgroundColor: '#c8e6c9',
    color: '#2e7d32',
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 22,
    fontWeight: 700,
  },
  stepContent: {
    flex: 1,
    minWidth: 0,
  },
  stepText: {
    margin: 0,
    fontSize: 15,
    lineHeight: 1.7,
    color: '#333',
    cursor: 'text',
  },
  editTextarea: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #90caf9',
    borderRadius: 6,
    fontSize: 15,
    lineHeight: 1.6,
    fontFamily: 'inherit',
    resize: 'vertical',
    outline: 'none',
    backgroundColor: '#fff',
  },
  stepActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    alignItems: 'center',
    flexShrink: 0,
  },
  actionBtn: {
    width: 30,
    height: 30,
    backgroundColor: 'transparent',
    border: 'none',
    color: '#888',
    borderRadius: 6,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },
  dragHandle: {
    width: 30,
    height: 30,
    color: '#bbb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'grab',
    borderRadius: 6,
    transition: 'all 0.2s ease',
  },
  empty: {
    padding: '60px 20px',
    textAlign: 'center',
    color: '#aaa',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
};

const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes highlightFlashStep {
    0%, 100% { background-color: #ffffff; }
    25% { background-color: #e3f2fd; }
    50% { background-color: #ffffff; }
    75% { background-color: #e3f2fd; }
  }
  textarea[style*="editTextarea"]:focus {
    border-color: #64b5f6 !important;
    box-shadow: 0 0 0 3px rgba(144, 202, 249, 0.2) !important;
  }
  textarea[style*="textarea"]:focus {
    border-color: #90caf9 !important;
    box-shadow: 0 0 0 3px rgba(144, 202, 249, 0.2) !important;
  }
  div[style*="stepCard"]:hover {
    transform: translateY(-4px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.125) !important;
  }
  button[style*="addBtn"]:hover {
    background-color: #43a047 !important;
    transform: translateY(-1px);
  }
  button[style*="actionBtn"]:hover {
    background-color: #f5f5f5 !important;
    color: #333 !important;
  }
  button[style*="actionBtn"][style*="color"]:hover {
    background-color: #ffebee !important;
    color: #e53935 !important;
  }
  div[style*="dragHandle"]:hover {
    background-color: #f5f5f5 !important;
    color: #666 !important;
  }
`;
document.head.appendChild(styleSheet);
