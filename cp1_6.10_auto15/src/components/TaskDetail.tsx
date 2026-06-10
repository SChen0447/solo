import React, { useState, useEffect, useMemo, useRef } from 'react';
import { marked } from 'marked';
import { useStore } from '../store';
import { Priority, PRIORITY_COLORS, PRIORITY_LABELS, COLUMN_TITLES, ColumnId } from '../types';

const PRIORITY_ORDER: Priority[] = ['urgent', 'high', 'medium', 'low'];

export const TaskDetail: React.FC = () => {
  const project = useStore((s) => s.getCurrentProject());
  const selectedTaskId = useStore((s) => s.selectedTaskId);
  const setSelectedTaskId = useStore((s) => s.setSelectedTaskId);
  const updateTask = useStore((s) => s.updateTask);
  const deleteTask = useStore((s) => s.deleteTask);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editableTitle, setEditableTitle] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);

  const task = selectedTaskId && project ? project.tasks[selectedTaskId] : null;

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  const markdownPreview = useMemo(() => {
    if (!task) return '';
    try {
      return marked.parse(task.description || '*无描述*') as string;
    } catch {
      return task.description || '*无描述*';
    }
  }, [task?.description]);

  if (!task || !project) return null;

  const handleClose = () => setSelectedTaskId(null);

  const handleTitleDoubleClick = () => {
    setEditableTitle(task.title);
    setIsEditingTitle(true);
  };

  const handleTitleSave = () => {
    if (editableTitle.trim()) {
      updateTask(project.id, task.id, { title: editableTitle.trim() });
    }
    setIsEditingTitle(false);
  };

  const handlePrioritySelect = (priority: Priority) => {
    updateTask(project.id, task.id, { priority });
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateTask(project.id, task.id, { dueDate: e.target.value || null });
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateTask(project.id, task.id, { description: e.target.value });
  };

  const handleColumnChange = (columnId: ColumnId) => {
    updateTask(project.id, task.id, { columnId });
  };

  const handleAssigneeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateTask(project.id, task.id, { assignee: e.target.value });
  };

  const handleDelete = () => {
    if (confirm('确定删除此任务？')) {
      deleteTask(project.id, task.id);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) handleClose();
  };

  return (
    <div className="task-detail-overlay" onClick={handleOverlayClick}>
      <div
        className="task-detail-panel"
        onClick={(e) => e.stopPropagation()}
        style={{ borderLeft: `4px solid ${PRIORITY_COLORS[task.priority]}` }}
      >
        <div className="task-detail__header">
          {isEditingTitle ? (
            <input
              ref={titleInputRef}
              type="text"
              className="task-detail__title-input"
              value={editableTitle}
              onChange={(e) => setEditableTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTitleSave();
                if (e.key === 'Escape') setIsEditingTitle(false);
              }}
            />
          ) : (
            <h2 className="task-detail__title" onDoubleClick={handleTitleDoubleClick}>
              {task.title}
              <span className="task-detail__edit-hint">双击编辑</span>
            </h2>
          )}
          <button className="task-detail__close" onClick={handleClose}>
            ×
          </button>
        </div>

        <div className="task-detail__section">
          <label>优先级</label>
          <div className="task-detail__priorities">
            {PRIORITY_ORDER.map((p) => (
              <button
                key={p}
                className={`priority-chip ${task.priority === p ? 'active' : ''}`}
                style={{
                  borderColor: PRIORITY_COLORS[p],
                  backgroundColor: task.priority === p ? PRIORITY_COLORS[p] : 'transparent',
                  color: task.priority === p ? '#fff' : PRIORITY_COLORS[p],
                }}
                onClick={() => handlePrioritySelect(p)}
              >
                {PRIORITY_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

        <div className="task-detail__row">
          <div className="task-detail__section">
            <label>状态</label>
            <select
              value={task.columnId}
              onChange={(e) => handleColumnChange(e.target.value as ColumnId)}
              className="task-detail__select"
            >
              <option value="todo">{COLUMN_TITLES.todo}</option>
              <option value="inProgress">{COLUMN_TITLES.inProgress}</option>
              <option value="done">{COLUMN_TITLES.done}</option>
            </select>
          </div>

          <div className="task-detail__section">
            <label>截止日期</label>
            <input
              type="date"
              value={task.dueDate || ''}
              onChange={handleDateChange}
              className="task-detail__date"
            />
          </div>

          <div className="task-detail__section">
            <label>负责人</label>
            <input
              type="text"
              value={task.assignee}
              onChange={handleAssigneeChange}
              placeholder="负责人姓名"
              className="task-detail__input"
            />
          </div>
        </div>

        <div className="task-detail__section">
          <label>描述（支持 Markdown）</label>
          <div className="task-detail__description">
            <textarea
              className="task-detail__textarea"
              value={task.description}
              onChange={handleDescriptionChange}
              placeholder="在此输入任务描述，支持 Markdown 语法..."
            />
            <div
              className="task-detail__preview markdown-body"
              dangerouslySetInnerHTML={{ __html: markdownPreview }}
            />
          </div>
        </div>

        <div className="task-detail__footer">
          <button className="task-detail__delete" onClick={handleDelete}>
            🗑️ 删除任务
          </button>
        </div>
      </div>
    </div>
  );
};
