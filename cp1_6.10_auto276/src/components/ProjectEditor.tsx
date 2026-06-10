import { useState, useRef, useCallback, useEffect, memo } from 'react';
import type { Project, InspirationFragment, Task, FragmentConnection, Priority, TaskStatus } from '../types';
import { FRAGMENT_COLORS, GRID_SIZE } from '../constants';
import { mixColors, darkenColor } from '../utils/colors';
import {
  ArrowLeft, Plus, Lightbulb, ListTodo, X, Check, Trash2, Link,
  GripVertical, Palette, Image, FileText
} from 'lucide-react';

interface ProjectEditorProps {
  project: Project;
  fragments: InspirationFragment[];
  tasks: Task[];
  connections: FragmentConnection[];
  allFragments: InspirationFragment[];
  onBack: () => void;
  onAddFragment: () => void;
  onUpdateFragment: (fragmentId: string, updates: Partial<InspirationFragment>) => void;
  onDeleteFragment: (fragmentId: string) => void;
  onAddTask: () => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
  onAddConnection: (fragmentAId: string, fragmentBId: string) => void;
}

function ProjectEditor({
  project, fragments, tasks, connections, allFragments,
  onBack, onAddFragment, onUpdateFragment, onDeleteFragment,
  onAddTask, onUpdateTask, onDeleteTask, onAddConnection
}: ProjectEditorProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [editingFragmentId, setEditingFragmentId] = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState<string | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<'canvas' | 'tasks'>('canvas');

  const snapToGrid = useCallback((value: number) => {
    return Math.round(value / GRID_SIZE) * GRID_SIZE;
  }, []);

  const handleFragmentMouseDown = useCallback((e: React.MouseEvent, fragmentId: string) => {
    if ((e.target as HTMLElement).closest('.fragment-controls')) return;
    e.preventDefault();
    const fragment = fragments.find(f => f.id === fragmentId);
    if (!fragment || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    setDraggingId(fragmentId);
    setDragOffset({
      x: e.clientX - rect.left - fragment.x,
      y: e.clientY - rect.top - fragment.y
    });
  }, [fragments]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggingId || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const newX = Math.max(0, e.clientX - rect.left - dragOffset.x);
    const newY = Math.max(0, e.clientY - rect.top - dragOffset.y);

    const fragment = fragments.find(f => f.id === draggingId);
    if (fragment) {
      onUpdateFragment(draggingId, { x: newX, y: newY });
    }
  }, [draggingId, dragOffset, fragments, onUpdateFragment]);

  const handleMouseUp = useCallback(() => {
    if (draggingId) {
      const fragment = fragments.find(f => f.id === draggingId);
      if (fragment) {
        onUpdateFragment(draggingId, {
          x: snapToGrid(fragment.x),
          y: snapToGrid(fragment.y)
        });
      }
      setDraggingId(null);
    }
  }, [draggingId, fragments, onUpdateFragment, snapToGrid]);

  const getTaskCountForFragment = useCallback((fragmentId: string) => {
    return tasks.filter(t => t.fragmentId === fragmentId).length;
  }, [tasks]);

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case 'high': return '#fc8181';
      case 'medium': return '#fbd38d';
      case 'low': return '#9ae6b4';
    }
  };

  const getStatusLabel = (status: TaskStatus) => {
    switch (status) {
      case 'todo': return '待办';
      case 'in-progress': return '进行中';
      case 'done': return '已完成';
    }
  };

  const getFragmentById = (id: string) => allFragments.find(f => f.id === id);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f7f7f7' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '16px 24px',
        background: '#fff',
        borderBottom: '1px solid #e2e8f0',
        gap: 16
      }}>
        <button
          onClick={onBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 12px',
            background: 'none',
            border: '1px solid #e2e8f0',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 14,
            color: '#4a5568',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#f7fafc'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
        >
          <ArrowLeft size={16} />
          返回
        </button>

        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#2d3748', marginBottom: 2 }}>{project.name}</h1>
          {project.description && (
            <p style={{ fontSize: 13, color: '#718096' }}>{project.description}</p>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onAddFragment}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 16px',
              background: activePanel === 'canvas' ? '#4299e1' : '#edf2f7',
              color: activePanel === 'canvas' ? '#fff' : '#4a5568',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500,
              transition: 'all 0.2s ease'
            }}
          >
            <Lightbulb size={16} />
            添加灵感
          </button>
          <button
            onClick={onAddTask}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 16px',
              background: activePanel === 'tasks' ? '#48bb78' : '#edf2f7',
              color: activePanel === 'tasks' ? '#fff' : '#4a5568',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500,
              transition: 'all 0.2s ease'
            }}
          >
            <ListTodo size={16} />
            添加任务
          </button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={() => { setEditingFragmentId(null); setShowColorPicker(null); setConnectingFrom(null); }}
          style={{
            flex: 1,
            position: 'relative',
            overflow: 'auto',
            backgroundImage: `
              linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)
            `,
            backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
            cursor: connectingFrom ? 'crosshair' : 'default'
          }}
        >
          <svg
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '3000px',
              height: '2000px',
              pointerEvents: 'none'
            }}
          >
            {connections.map(conn => {
              const fragA = getFragmentById(conn.fragmentAId);
              const fragB = getFragmentById(conn.fragmentBId);
              if (!fragA || !fragB) return null;

              const mixedColor = mixColors(fragA.color, fragB.color);
              const strokeWidth = 1 + conn.relevance * 0.8;

              return (
                <line
                  key={conn.id}
                  x1={fragA.x + 100}
                  y1={fragA.y + 60}
                  x2={fragB.x + 100}
                  y2={fragB.y + 60}
                  stroke={mixedColor}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  opacity={0.6}
                />
              );
            })}
          </svg>

          {fragments.map(fragment => {
            const taskCount = getTaskCountForFragment(fragment.id);
            const isEditing = editingFragmentId === fragment.id;
            const isDragging = draggingId === fragment.id;
            const isConnectingSource = connectingFrom === fragment.id;

            return (
              <div
                key={fragment.id}
                onMouseDown={(e) => handleFragmentMouseDown(e, fragment.id)}
                onClick={(e) => {
                  e.stopPropagation();
                  if (connectingFrom && connectingFrom !== fragment.id) {
                    onAddConnection(connectingFrom, fragment.id);
                    setConnectingFrom(null);
                    return;
                  }
                  setEditingFragmentId(isEditing ? null : fragment.id);
                }}
                style={{
                  position: 'absolute',
                  left: fragment.x,
                  top: fragment.y,
                  width: 200,
                  background: '#fff',
                  borderRadius: 8,
                  padding: 16,
                  boxShadow: isDragging
                    ? '0 12px 32px rgba(0,0,0,0.18)'
                    : '0 2px 8px rgba(0,0,0,0.06)',
                  cursor: isDragging ? 'grabbing' : 'grab',
                  opacity: isDragging ? 0.8 : 1,
                  transition: isDragging ? 'none' : 'box-shadow 0.2s ease, opacity 0.2s ease',
                  borderTop: `4px solid ${fragment.color}`,
                  transform: isConnectingSource ? 'scale(1.05)' : 'scale(1)',
                  outline: isConnectingSource ? '2px dashed #4299e1' : 'none',
                  outlineOffset: 2
                }}
              >
                <div className="fragment-controls" style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  display: 'flex',
                  gap: 4,
                  opacity: isEditing ? 1 : 0,
                  transition: 'opacity 0.2s ease'
                }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowColorPicker(showColorPicker === fragment.id ? null : fragment.id); }}
                    style={iconBtnStyle}
                    title="选择颜色"
                  >
                    <Palette size={12} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConnectingFrom(connectingFrom === fragment.id ? null : fragment.id);
                    }}
                    style={{
                      ...iconBtnStyle,
                      background: isConnectingSource ? '#4299e1' : 'rgba(0,0,0,0.05)',
                      color: isConnectingSource ? '#fff' : '#718096'
                    }}
                    title="连接碎片"
                  >
                    <Link size={12} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('确定删除这个灵感碎片？')) onDeleteFragment(fragment.id);
                    }}
                    style={iconBtnStyle}
                    title="删除"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>

                {taskCount > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: '#4299e1',
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {taskCount}
                  </div>
                )}

                {showColorPicker === fragment.id && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      marginTop: 4,
                      background: '#fff',
                      padding: 8,
                      borderRadius: 6,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(6, 1fr)',
                      gap: 4,
                      zIndex: 10
                    }}
                  >
                    {FRAGMENT_COLORS.map(color => (
                      <button
                        key={color}
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdateFragment(fragment.id, { color });
                          setShowColorPicker(null);
                        }}
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 4,
                          border: fragment.color === color ? '2px solid #2d3748' : '2px solid transparent',
                          background: color,
                          cursor: 'pointer',
                          padding: 0
                        }}
                      />
                    ))}
                  </div>
                )}

                <div style={{ paddingTop: taskCount > 0 ? 16 : 0 }}>
                  {isEditing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <textarea
                        value={fragment.text}
                        onChange={(e) => onUpdateFragment(fragment.id, { text: e.target.value })}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="描述这个灵感..."
                        style={{
                          width: '100%',
                          minHeight: 60,
                          padding: 8,
                          border: '1px solid #e2e8f0',
                          borderRadius: 4,
                          fontSize: 13,
                          resize: 'vertical',
                          outline: 'none',
                          fontFamily: 'inherit'
                        }}
                        autoFocus
                      />
                      <input
                        type="text"
                        value={fragment.imagePath}
                        onChange={(e) => onUpdateFragment(fragment.id, { imagePath: e.target.value })}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="图片路径（可选）"
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          border: '1px solid #e2e8f0',
                          borderRadius: 4,
                          fontSize: 12,
                          outline: 'none',
                          fontFamily: 'inherit'
                        }}
                      />
                    </div>
                  ) : (
                    <>
                      <p style={{
                        fontSize: 13,
                        lineHeight: 1.5,
                        color: '#2d3748',
                        minHeight: 20,
                        wordBreak: 'break-word'
                      }}>
                        {fragment.text || '点击编辑灵感描述'}
                      </p>
                      {fragment.imagePath && (
                        <div style={{
                          marginTop: 8,
                          padding: 8,
                          background: '#f7fafc',
                          borderRadius: 4,
                          fontSize: 11,
                          color: '#718096',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}>
                          <Image size={12} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                            {fragment.imagePath}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {fragments.length === 0 && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              color: '#a0aec0'
            }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>💡</div>
              <div style={{ fontSize: 16, marginBottom: 4, color: '#718096' }}>还没有灵感碎片</div>
              <div style={{ fontSize: 13 }}>点击上方"添加灵感"按钮开始记录创意</div>
            </div>
          )}
        </div>

        <div style={{
          width: 320,
          minWidth: 320,
          background: '#fff',
          borderLeft: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#2d3748' }}>
              任务清单 ({tasks.length})
            </h3>
            <button
              onClick={onAddTask}
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                background: '#48bb78',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s ease'
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#38a169')}
              onMouseLeave={e => (e.currentTarget.style.background = '#48bb78')}
            >
              <Plus size={16} />
            </button>
          </div>

          <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
            {tasks.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#a0aec0', padding: 32 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
                <div style={{ fontSize: 13 }}>暂无任务，点击 + 添加</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {tasks.map(task => {
                  const boundFragment = fragments.find(f => f.id === task.fragmentId);
                  return (
                    <div
                      key={task.id}
                      style={{
                        padding: 12,
                        borderRadius: 6,
                        background: '#f7fafc',
                        borderLeft: `3px solid ${getPriorityColor(task.priority)}`,
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <input
                          type="checkbox"
                          checked={task.status === 'done'}
                          onChange={() => onUpdateTask(task.id, {
                            status: task.status === 'done' ? 'todo' : 'done'
                          })}
                          style={{
                            marginTop: 2,
                            width: 16,
                            height: 16,
                            cursor: 'pointer',
                            accentColor: '#4299e1'
                          }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <input
                            type="text"
                            value={task.name}
                            onChange={(e) => onUpdateTask(task.id, { name: e.target.value })}
                            style={{
                              width: '100%',
                              background: 'none',
                              border: 'none',
                              outline: 'none',
                              fontSize: 13,
                              fontWeight: 500,
                              color: task.status === 'done' ? '#a0aec0' : '#2d3748',
                              textDecoration: task.status === 'done' ? 'line-through' : 'none',
                              padding: 0,
                              fontFamily: 'inherit'
                            }}
                          />

                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                            <select
                              value={task.priority}
                              onChange={(e) => onUpdateTask(task.id, { priority: e.target.value as Priority })}
                              style={{
                                padding: '3px 6px',
                                fontSize: 11,
                                border: `1px solid ${getPriorityColor(task.priority)}`,
                                borderRadius: 4,
                                background: '#fff',
                                color: '#4a5568',
                                cursor: 'pointer',
                                outline: 'none',
                                fontFamily: 'inherit'
                              }}
                            >
                              <option value="high">高优先级</option>
                              <option value="medium">中优先级</option>
                              <option value="low">低优先级</option>
                            </select>

                            <select
                              value={task.status}
                              onChange={(e) => onUpdateTask(task.id, { status: e.target.value as TaskStatus })}
                              style={{
                                padding: '3px 6px',
                                fontSize: 11,
                                border: '1px solid #e2e8f0',
                                borderRadius: 4,
                                background: '#fff',
                                color: '#4a5568',
                                cursor: 'pointer',
                                outline: 'none',
                                fontFamily: 'inherit'
                              }}
                            >
                              <option value="todo">待办</option>
                              <option value="in-progress">进行中</option>
                              <option value="done">已完成</option>
                            </select>

                            <select
                              value={task.fragmentId || ''}
                              onChange={(e) => onUpdateTask(task.id, { fragmentId: e.target.value || null })}
                              style={{
                                padding: '3px 6px',
                                fontSize: 11,
                                border: '1px solid #e2e8f0',
                                borderRadius: 4,
                                background: '#fff',
                                color: '#4a5568',
                                cursor: 'pointer',
                                outline: 'none',
                                fontFamily: 'inherit',
                                maxWidth: 120
                              }}
                            >
                              <option value="">不绑定</option>
                              {fragments.map(f => (
                                <option key={f.id} value={f.id}>
                                  {f.text.slice(0, 12)}{f.text.length > 12 ? '...' : ''}
                                </option>
                              ))}
                            </select>
                          </div>

                          {boundFragment && (
                            <div style={{
                              marginTop: 8,
                              padding: '4px 8px',
                              background: boundFragment.color + '30',
                              borderRadius: 4,
                              fontSize: 11,
                              color: '#4a5568',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4
                            }}>
                              <div style={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                background: boundFragment.color
                              }} />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {boundFragment.text.slice(0, 20)}
                              </span>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => {
                            if (confirm('确定删除这个任务？')) onDeleteTask(task.id);
                          }}
                          style={{
                            ...iconBtnStyle,
                            flexShrink: 0
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const iconBtnStyle: React.CSSProperties = {
  width: 24,
  height: 24,
  borderRadius: 4,
  background: 'rgba(0,0,0,0.05)',
  border: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#718096',
  transition: 'all 0.2s ease'
};

export default memo(ProjectEditor);
