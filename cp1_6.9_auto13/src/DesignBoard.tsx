import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Annotation,
  AnnotationColor,
  Comment,
  DesignFile,
  Notification,
  ProjectData,
  VersionSnapshot,
  COLOR_MAP,
  COLOR_BG_MAP,
} from './types';
import VersionHistory from './VersionHistory';

const STORAGE_KEY = 'design_collab_data';
const MOCK_USERS = ['张三', '李四', '王五', '赵六'];

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatTimeShort(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function getInitial(name: string): string {
  return name.charAt(0).toUpperCase();
}

function loadFromStorage(): ProjectData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to load from storage', e);
  }
  return {
    designs: [],
    versions: [],
    notifications: [],
    currentUserName: MOCK_USERS[0],
  };
}

function saveToStorage(data: ProjectData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save to storage', e);
  }
}

interface DiffState {
  addedIds: Set<string>;
  removedIds: Set<string>;
}

const DesignBoard: React.FC = () => {
  const [projectData, setProjectData] = useState<ProjectData>(loadFromStorage);
  const [currentDesignIndex, setCurrentDesignIndex] = useState<number>(0);
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null);
  const [editingAnnotationId, setEditingAnnotationId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<string>('');
  const [dragState, setDragState] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [diffState, setDiffState] = useState<DiffState | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [replyTarget, setReplyTarget] = useState<{ annotationId: string; commentId: string | null; level: number } | null>(null);
  const [replyContent, setReplyContent] = useState('');

  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { designs, versions, currentUserName } = projectData;
  const currentDesign = designs[currentDesignIndex];

  useEffect(() => {
    saveToStorage(projectData);
  }, [projectData]);

  useEffect(() => {
    const unread = projectData.notifications.filter((n) => !n.read);
    setNotifications(unread.slice(-5));
  }, [projectData.notifications]);

  const addNotification = useCallback(
    (type: 'new_annotation' | 'new_reply', author: string, summary: string) => {
      const notif: Notification = {
        id: generateId(),
        type,
        author,
        summary: summary.length > 30 ? summary.substring(0, 30) + '...' : summary,
        timestamp: Date.now(),
        read: false,
      };
      setProjectData((prev) => ({
        ...prev,
        notifications: [notif, ...prev.notifications].slice(0, 50),
      }));
      setTimeout(() => {
        setProjectData((prev) => ({
          ...prev,
          notifications: prev.notifications.map((n) =>
            n.id === notif.id ? { ...n, read: true } : n
          ),
        }));
      }, 3000);
    },
    []
  );

  const saveVersionSnapshot = useCallback((design: DesignFile) => {
    const snapshot: VersionSnapshot = {
      id: generateId(),
      timestamp: Date.now(),
      annotations: JSON.parse(JSON.stringify(design.annotations)),
      designId: design.id,
      description: `${design.annotations.length} 条批注`,
    };
    setProjectData((prev) => ({
      ...prev,
      versions: [snapshot, ...prev.versions].slice(0, 20),
    }));
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('文件大小不能超过 10MB');
      return;
    }

    const formData = new FormData();
    formData.append('design', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        const newDesign: DesignFile = {
          id: generateId(),
          url: data.url,
          filename: data.filename,
          mimetype: data.mimetype,
          uploadedAt: Date.now(),
          annotations: [],
        };
        setProjectData((prev) => ({
          ...prev,
          designs: [...prev.designs, newDesign],
        }));
        setCurrentDesignIndex(designs.length);
      } else {
        alert(data.error || '上传失败');
      }
    } catch (err) {
      const reader = new FileReader();
      reader.onload = () => {
        const newDesign: DesignFile = {
          id: generateId(),
          url: reader.result as string,
          filename: file.name,
          mimetype: file.type,
          uploadedAt: Date.now(),
          annotations: [],
        };
        setProjectData((prev) => ({
          ...prev,
          designs: [...prev.designs, newDesign],
        }));
        setCurrentDesignIndex(designs.length);
      };
      reader.readAsDataURL(file);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveDesign = (designId: string) => {
    if (!confirm('确定删除此设计稿吗？相关批注和版本也会被移除。')) return;
    setProjectData((prev) => ({
      ...prev,
      designs: prev.designs.filter((d) => d.id !== designId),
      versions: prev.versions.filter((v) => v.designId !== designId),
    }));
    if (currentDesign && currentDesign.id === designId) {
      setCurrentDesignIndex(0);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!currentDesign || !canvasRef.current) return;
    if ((e.target as HTMLElement).closest('.annotation-marker') || (e.target as HTMLElement).closest('.annotation-bubble')) {
      return;
    }
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newAnnotation: Annotation = {
      id: generateId(),
      x,
      y,
      color: 'blue',
      author: currentUserName,
      content: '',
      timestamp: Date.now(),
      comments: [],
    };

    saveVersionSnapshot(currentDesign);

    setProjectData((prev) => ({
      ...prev,
      designs: prev.designs.map((d) =>
        d.id === currentDesign.id
          ? { ...d, annotations: [...d.annotations, newAnnotation] }
          : d
      ),
    }));
    setActiveAnnotationId(newAnnotation.id);
    setEditingAnnotationId(newAnnotation.id);
    setEditingContent('');

    setTimeout(() => {
      addNotification('new_annotation', currentUserName, '新增了一条批注');
    }, 500);
  };

  const handleMarkerMouseDown = (e: React.MouseEvent, annotation: Annotation) => {
    if (!canvasRef.current || editingAnnotationId) return;
    e.stopPropagation();
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const markerX = (annotation.x / 100) * rect.width + rect.left;
    const markerY = (annotation.y / 100) * rect.height + rect.top;
    setDragState({
      id: annotation.id,
      offsetX: e.clientX - markerX,
      offsetY: e.clientY - markerY,
    });
  };

  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left - dragState.offsetX) / rect.width) * 100;
      const y = ((e.clientY - rect.top - dragState.offsetY) / rect.height) * 100;
      const clampedX = Math.max(0, Math.min(100, x));
      const clampedY = Math.max(0, Math.min(100, y));

      setProjectData((prev) => ({
        ...prev,
        designs: prev.designs.map((d) =>
          d.id === currentDesign?.id
            ? {
                ...d,
                annotations: d.annotations.map((a) =>
                  a.id === dragState.id ? { ...a, x: clampedX, y: clampedY } : a
                ),
              }
            : d
        ),
      }));
    };

    const handleMouseUp = () => {
      if (currentDesign) {
        saveVersionSnapshot(currentDesign);
      }
      setDragState(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, currentDesign, saveVersionSnapshot]);

  const handleAnnotationEdit = (annotation: Annotation) => {
    setEditingAnnotationId(annotation.id);
    setEditingContent(annotation.content);
  };

  const handleSaveAnnotation = () => {
    if (!currentDesign || !editingAnnotationId) return;
    saveVersionSnapshot(currentDesign);
    setProjectData((prev) => ({
      ...prev,
      designs: prev.designs.map((d) =>
        d.id === currentDesign.id
          ? {
              ...d,
              annotations: d.annotations.map((a) =>
                a.id === editingAnnotationId ? { ...a, content: editingContent } : a
              ),
            }
          : d
      ),
    }));
    setEditingAnnotationId(null);
    setEditingContent('');
  };

  const handleColorChange = (annotationId: string, color: AnnotationColor) => {
    if (!currentDesign) return;
    saveVersionSnapshot(currentDesign);
    setProjectData((prev) => ({
      ...prev,
      designs: prev.designs.map((d) =>
        d.id === currentDesign.id
          ? {
              ...d,
              annotations: d.annotations.map((a) =>
                a.id === annotationId ? { ...a, color } : a
              ),
            }
          : d
      ),
    }));
  };

  const handleDeleteAnnotation = (annotationId: string) => {
    if (!currentDesign || !confirm('确定删除此批注吗？')) return;
    saveVersionSnapshot(currentDesign);
    setProjectData((prev) => ({
      ...prev,
      designs: prev.designs.map((d) =>
        d.id === currentDesign.id
          ? { ...d, annotations: d.annotations.filter((a) => a.id !== annotationId) }
          : d
      ),
    }));
    setActiveAnnotationId(null);
    setEditingAnnotationId(null);
  };

  const handleAddReply = (annotationId: string, parentCommentId: string | null, level: number) => {
    if (!currentDesign || !replyContent.trim()) return;
    const newComment: Comment = {
      id: generateId(),
      author: currentUserName,
      content: replyContent,
      timestamp: Date.now(),
      replies: [],
      level: Math.min(level, 2),
    };

    saveVersionSnapshot(currentDesign);

    const addReplyToComment = (comments: Comment[]): Comment[] => {
      return comments.map((c) => {
        if (c.id === parentCommentId) {
          return { ...c, replies: [...c.replies, newComment] };
        }
        return { ...c, replies: addReplyToComment(c.replies) };
      });
    };

    setProjectData((prev) => ({
      ...prev,
      designs: prev.designs.map((d) => {
        if (d.id !== currentDesign.id) return d;
        return {
          ...d,
          annotations: d.annotations.map((a) => {
            if (a.id !== annotationId) return a;
            if (!parentCommentId) {
              return { ...a, comments: [...a.comments, newComment] };
            }
            return { ...a, comments: addReplyToComment(a.comments) };
          }),
        };
      }),
    }));

    setTimeout(() => {
      addNotification('new_reply', currentUserName, replyContent);
    }, 500);

    setReplyContent('');
    setReplyTarget(null);
  };

  const handleRestoreVersion = (version: VersionSnapshot) => {
    if (!confirm('确定恢复到此版本吗？当前批注将被覆盖。')) return;
    setProjectData((prev) => ({
      ...prev,
      designs: prev.designs.map((d) =>
        d.id === version.designId
          ? { ...d, annotations: JSON.parse(JSON.stringify(version.annotations)) }
          : d
      ),
    }));
    setSelectedVersionId(version.id);
  };

  const handleToggleDiff = (checked: boolean) => {
    setShowDiff(checked);
    if (!checked || !currentDesign) {
      setDiffState(null);
      return;
    }
    const latestVersion = versions.find((v) => v.designId === currentDesign.id);
    if (!latestVersion) {
      setDiffState(null);
      return;
    }
    const currentIds = new Set(currentDesign.annotations.map((a) => a.id));
    const versionIds = new Set(latestVersion.annotations.map((a) => a.id));
    const addedIds = new Set([...currentIds].filter((id) => !versionIds.has(id)));
    const removedIds = new Set([...versionIds].filter((id) => !currentIds.has(id)));
    setDiffState({ addedIds, removedIds });
  };

  const handleExport = () => {
    const exportData = JSON.stringify(projectData, null, 2);
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `design-project-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderCommentTree = (comments: Comment[], annotationId: string): React.ReactNode => {
    return comments.map((comment) => (
      <div key={comment.id}>
        <div className={`comment-item level-${comment.level}`}>
          <div className="comment-header">
            <span className="comment-author">{comment.author}</span>
            <span className="comment-time">{formatTime(comment.timestamp)}</span>
          </div>
          <div className="comment-text">{comment.content}</div>
          {comment.level < 2 && (
            <button
              className="reply-btn"
              style={{ marginTop: 6, padding: '2px 8px', fontSize: 11 }}
              onClick={() =>
                setReplyTarget({
                  annotationId,
                  commentId: comment.id,
                  level: comment.level + 1,
                })
              }
            >
              回复
            </button>
          )}
          {replyTarget?.annotationId === annotationId && replyTarget?.commentId === comment.id && (
            <div className="reply-input">
              <textarea
                className="reply-textarea"
                placeholder={`回复 ${comment.author}...`}
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                autoFocus
              />
              <div className="reply-btns">
                <button className="reply-btn" onClick={() => { setReplyTarget(null); setReplyContent(''); }}>
                  取消
                </button>
                <button
                  className="reply-btn primary"
                  onClick={() => handleAddReply(annotationId, comment.id, comment.level + 1)}
                >
                  回复
                </button>
              </div>
            </div>
          )}
        </div>
        {comment.replies.length > 0 && renderCommentTree(comment.replies, annotationId)}
      </div>
    ));
  };

  const unreadCount = projectData.notifications.filter((n) => !n.read).length;

  return (
    <div className="app-container">
      <div className="top-bar">
        <button className="hamburger-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
          ☰
        </button>
        <h1>设计协作平台</h1>
        <div className="notification-badge">
          🔔
          {unreadCount > 0 && <span className="notification-count">{unreadCount}</span>}
        </div>
      </div>

      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h1>🎨 设计协作</h1>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept="image/png,image/jpeg,image/jpg,application/pdf"
            onChange={handleFileUpload}
          />
          <button className="upload-btn" onClick={() => fileInputRef.current?.click()}>
            + 上传设计稿
          </button>
          <button className="export-btn" onClick={handleExport}>
            导出项目数据
          </button>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-title">设计稿 ({designs.length})</div>
          <div className="thumbnail-list">
            {designs.length === 0 && (
              <div style={{ fontSize: 12, color: '#bfbfbf', textAlign: 'center', padding: 20 }}>
                暂无设计稿
              </div>
            )}
            {designs.map((design, idx) => (
              <div
                key={design.id}
                className={`thumbnail-item ${idx === currentDesignIndex ? 'active' : ''}`}
                onClick={() => {
                  setCurrentDesignIndex(idx);
                  setActiveAnnotationId(null);
                  setSidebarOpen(false);
                }}
              >
                {design.mimetype === 'application/pdf' ? (
                  <div className="thumbnail-placeholder">📄 PDF</div>
                ) : (
                  <img src={design.url} alt={design.filename} className="thumbnail-img" />
                )}
                <div className="thumbnail-name">{design.filename}</div>
                <button
                  className="thumbnail-remove"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveDesign(design.id);
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {currentDesign && (
            <VersionHistory
              versions={versions.filter((v) => v.designId === currentDesign.id)}
              currentAnnotations={currentDesign.annotations}
              selectedVersionId={selectedVersionId}
              onRestore={handleRestoreVersion}
              showDiff={showDiff}
              onToggleDiff={handleToggleDiff}
            />
          )}
        </div>
      </div>

      <div className="main-content">
        <div className="main-header">
          <div className="main-header-left">
            <span style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a' }}>
              {currentDesign ? currentDesign.filename : '未选择设计稿'}
            </span>
          </div>
          <div className="main-header-right">
            <div className="page-nav">
              <button
                className="page-btn"
                disabled={currentDesignIndex === 0}
                onClick={() => setCurrentDesignIndex((i) => Math.max(0, i - 1))}
              >
                ← 上一张
              </button>
              <span className="page-info">
                {designs.length > 0 ? `${currentDesignIndex + 1} / ${designs.length}` : '0 / 0'}
              </span>
              <button
                className="page-btn"
                disabled={currentDesignIndex >= designs.length - 1}
                onClick={() => setCurrentDesignIndex((i) => Math.min(designs.length - 1, i + 1))}
              >
                下一张 →
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div className="avatar" style={{ background: '#4f7cff' }}>
                {getInitial(currentUserName)}
              </div>
              <select
                value={currentUserName}
                onChange={(e) =>
                  setProjectData((prev) => ({ ...prev, currentUserName: e.target.value }))
                }
                style={{
                  padding: '4px 8px',
                  border: '1px solid #e8e8e8',
                  borderRadius: 6,
                  fontSize: 12,
                  background: '#fff',
                  cursor: 'pointer',
                }}
              >
                {MOCK_USERS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="canvas-wrapper">
          <div className="canvas-container" ref={canvasRef} onClick={handleCanvasClick}>
            {!currentDesign ? (
              <div className="canvas-empty">
                <div className="canvas-empty-icon">🖼️</div>
                <div className="canvas-empty-text">点击左侧"上传设计稿"开始协作</div>
              </div>
            ) : (
              <>
                <img src={currentDesign.url} alt={currentDesign.filename} className="design-image" />
                {currentDesign.annotations.map((annotation) => {
                  const isActive = activeAnnotationId === annotation.id;
                  const isEditing = editingAnnotationId === annotation.id;
                  const isDragging = dragState?.id === annotation.id;
                  const isDiffAdded = diffState?.addedIds.has(annotation.id);
                  const isDiffRemoved = diffState?.removedIds.has(annotation.id);
                  const diffClass = showDiff
                    ? isDiffAdded
                      ? ' diff-added'
                      : isDiffRemoved
                      ? ' diff-removed'
                      : ''
                    : '';

                  return (
                    <React.Fragment key={annotation.id}>
                      <div
                        className={`annotation-marker ${isDragging ? 'dragging' : ''}${diffClass}`}
                        style={{
                          left: `${annotation.x}%`,
                          top: `${annotation.y}%`,
                          borderColor: COLOR_MAP[annotation.color],
                          backgroundColor: COLOR_BG_MAP[annotation.color],
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveAnnotationId(isActive ? null : annotation.id);
                        }}
                        onMouseDown={(e) => handleMarkerMouseDown(e, annotation)}
                      />
                      {isActive && (
                        <div
                          className="annotation-bubble"
                          style={{ left: `${annotation.x}%`, top: `${annotation.y}%` }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="bubble-header">
                            <div className="bubble-author">
                              <div className="avatar" style={{ background: COLOR_MAP[annotation.color] }}>
                                {getInitial(annotation.author)}
                              </div>
                              <span className="author-name">{annotation.author}</span>
                            </div>
                            <div className="color-picker">
                              {(['yellow', 'blue', 'green', 'red'] as AnnotationColor[]).map((c) => (
                                <div
                                  key={c}
                                  className={`color-option ${annotation.color === c ? 'active' : ''}`}
                                  style={{
                                    backgroundColor: COLOR_MAP[c],
                                    opacity: 0.7,
                                  }}
                                  onClick={() => handleColorChange(annotation.id, c)}
                                />
                              ))}
                            </div>
                            <button className="bubble-close" onClick={() => setActiveAnnotationId(null)}>
                              ×
                            </button>
                          </div>

                          {isEditing ? (
                            <>
                              <textarea
                                className="bubble-textarea"
                                placeholder="输入批注内容..."
                                value={editingContent}
                                onChange={(e) => setEditingContent(e.target.value)}
                                autoFocus
                              />
                              <div className="bubble-actions" style={{ justifyContent: 'flex-end' }}>
                                <button
                                  className="bubble-action-btn"
                                  onClick={() => {
                                    setEditingAnnotationId(null);
                                    setEditingContent('');
                                  }}
                                >
                                  取消
                                </button>
                                <button className="bubble-action-btn primary" onClick={handleSaveAnnotation}>
                                  保存
                                </button>
                              </div>
                            </>
                          ) : (
                            <>
                              {annotation.content && (
                                <div className="bubble-content">{annotation.content}</div>
                              )}
                              {!annotation.content && (
                                <div className="bubble-content" style={{ color: '#bfbfbf', fontStyle: 'italic' }}>
                                  点击编辑添加批注内容
                                </div>
                              )}
                              <div className="bubble-footer">
                                <span className="bubble-time">{formatTime(annotation.timestamp)}</span>
                                <div className="bubble-actions">
                                  <button
                                    className="bubble-action-btn"
                                    onClick={() => handleAnnotationEdit(annotation)}
                                  >
                                    编辑
                                  </button>
                                  <button
                                    className="bubble-action-btn danger"
                                    onClick={() => handleDeleteAnnotation(annotation.id)}
                                  >
                                    删除
                                  </button>
                                </div>
                              </div>
                            </>
                          )}

                          {!isEditing && annotation.comments.length > 0 && (
                            <div className="comments-section">
                              {renderCommentTree(annotation.comments, annotation.id)}
                            </div>
                          )}

                          {!isEditing && (
                            <>
                              {replyTarget?.annotationId === annotation.id && replyTarget?.commentId === null ? (
                                <div className="reply-input" style={{ marginTop: 10 }}>
                                  <textarea
                                    className="reply-textarea"
                                    placeholder="输入评论..."
                                    value={replyContent}
                                    onChange={(e) => setReplyContent(e.target.value)}
                                    autoFocus
                                  />
                                  <div className="reply-btns">
                                    <button
                                      className="reply-btn"
                                      onClick={() => {
                                        setReplyTarget(null);
                                        setReplyContent('');
                                      }}
                                    >
                                      取消
                                    </button>
                                    <button
                                      className="reply-btn primary"
                                      onClick={() => handleAddReply(annotation.id, null, 0)}
                                    >
                                      发布
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  className="bubble-action-btn"
                                  style={{ marginTop: 10, width: '100%' }}
                                  onClick={() =>
                                    setReplyTarget({ annotationId: annotation.id, commentId: null, level: 0 })
                                  }
                                >
                                  💬 添加评论
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="notification-container">
        {notifications.map((n) => (
          <div key={n.id} className="notification-toast">
            <div className="notification-title">
              {n.type === 'new_annotation' ? '🆕 新批注' : '💬 新回复'} · {n.author}
            </div>
            <div className="notification-message">{n.summary}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DesignBoard;
