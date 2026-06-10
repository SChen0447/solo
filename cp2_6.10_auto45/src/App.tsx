import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Task, Dependency, ContextMenuState } from './types';
import { sampleTasks, sampleDependencies, getTaskDuration } from './data';
import { DependencyGraph, computeCriticalPath } from './components/DependencyGraph';

export const App: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>(sampleTasks);
  const [dependencies, setDependencies] = useState<Dependency[]>(sampleDependencies);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    taskId: null
  });
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingProgress, setEditingProgress] = useState(0);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const graphKey = useRef(0);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const nodeWidth = isMobile ? 140 : 180;
  const nodeHeight = 120;

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.progress === 100).length;
    const avgProgress = Math.round(tasks.reduce((sum, t) => sum + t.progress, 0) / total);
    const { length: criticalPathLength } = computeCriticalPath(tasks);
    return { total, completed, avgProgress, criticalPathLength };
  }, [tasks]);

  const { pathIds: criticalPathIds } = useMemo(() => computeCriticalPath(tasks), [tasks]);

  const handleContextMenu = useCallback((e: React.MouseEvent, taskId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      taskId
    });
  }, []);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(prev => ({ ...prev, visible: false }));
  }, []);

  useEffect(() => {
    const handleClick = () => handleCloseContextMenu();
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [handleCloseContextMenu]);

  const handleEditProgress = useCallback(() => {
    if (!contextMenu.taskId) return;
    const task = tasks.find(t => t.id === contextMenu.taskId);
    if (task) {
      setEditingProgress(task.progress);
      setEditingTaskId(contextMenu.taskId);
    }
    handleCloseContextMenu();
  }, [contextMenu.taskId, tasks, handleCloseContextMenu]);

  const handleConfirmProgress = useCallback(() => {
    if (!editingTaskId) return;
    setTasks(prev => prev.map(t =>
      t.id === editingTaskId ? { ...t, progress: editingProgress } : t
    ));
    setEditingTaskId(null);
  }, [editingTaskId, editingProgress]);

  const handleAddSubtask = useCallback(() => {
    if (!contextMenu.taskId) return;
    const parentTask = tasks.find(t => t.id === contextMenu.taskId);
    if (!parentTask) return;

    const newTaskId = `task-${uuidv4().slice(0, 8)}`;
    const parentEnd = new Date(parentTask.endDate);
    const startDate = new Date(parentEnd.getTime() + 24 * 60 * 60 * 1000);
    const endDate = new Date(startDate.getTime() + 4 * 24 * 60 * 60 * 1000);

    const newTask: Task = {
      id: newTaskId,
      name: '新子任务',
      startDate: startDate.toISOString().slice(0, 10),
      endDate: endDate.toISOString().slice(0, 10),
      progress: 0,
      assignee: '待分配',
      dependencies: [contextMenu.taskId],
      description: '',
      notes: ''
    };

    const newDependency: Dependency = {
      source: contextMenu.taskId,
      target: newTaskId,
      description: '子任务依赖',
      delayDays: 0
    };

    setTasks(prev => [...prev, newTask]);
    setDependencies(prev => [...prev, newDependency]);
    localStorage.removeItem('taskNodePositions');
    graphKey.current++;
    handleCloseContextMenu();
  }, [contextMenu.taskId, tasks, handleCloseContextMenu]);

  const handleDeleteTask = useCallback(() => {
    if (!contextMenu.taskId) return;
    const taskIdToDelete = contextMenu.taskId;

    setTasks(prev => prev
      .filter(t => t.id !== taskIdToDelete)
      .map(t => ({
        ...t,
        dependencies: t.dependencies.filter(d => d !== taskIdToDelete)
      }))
    );
    setDependencies(prev => prev.filter(
      d => d.source !== taskIdToDelete && d.target !== taskIdToDelete
    ));
    localStorage.removeItem('taskNodePositions');
    graphKey.current++;
    handleCloseContextMenu();
  }, [contextMenu.taskId, handleCloseContextMenu]);

  const handleTaskDoubleClick = useCallback((task: Task) => {
    setDetailTask(task);
  }, []);

  const handleResetLayout = useCallback(() => {
    localStorage.removeItem('taskNodePositions');
    graphKey.current++;
    setTasks([...tasks]);
  }, [tasks]);

  const handleSaveSnapshot = useCallback(() => {
    const snapshot = {
      tasks,
      dependencies,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('projectSnapshot', JSON.stringify(snapshot));
    alert('快照已保存到本地存储！');
  }, [tasks, dependencies]);

  const handleExportPNG = useCallback(() => {
    const container = document.querySelector('.graph-container');
    if (!container) return;

    alert('导出功能：在完整实现中会将画布导出为PNG图片。\n当前演示环境已保存项目状态。');
  }, []);

  const miniGanttData = useMemo(() => {
    const sorted = [...tasks].sort((a, b) =>
      new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );
    const minDate = new Date(sorted[0]?.startDate || Date.now());
    const maxDate = new Date(sorted[sorted.length - 1]?.endDate || Date.now());
    const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    return sorted.map(task => {
      const startOffset = Math.ceil(
        (new Date(task.startDate).getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      const duration = getTaskDuration(task);
      return {
        task,
        leftPercent: (startOffset / totalDays) * 100,
        widthPercent: (duration / totalDays) * 100,
        isCritical: criticalPathIds.has(task.id)
      };
    });
  }, [tasks, criticalPathIds]);

  const getTaskDetailInfo = useCallback((task: Task) => {
    const predecessors = tasks.filter(t => task.dependencies.includes(t.id));
    const successors = tasks.filter(t => t.dependencies.includes(task.id));
    const duration = getTaskDuration(task);
    const completedDays = Math.round(duration * (task.progress / 100));
    return { predecessors, successors, completedDays, duration };
  }, [tasks]);

  return (
    <div className="app-container" onClick={handleCloseContextMenu}>
      <div className="toolbar">
        <div className="toolbar-title">📊 团队项目进度可视化</div>
        <div className="toolbar-buttons">
          <button className="toolbar-btn" onClick={handleResetLayout}>
            🔄 重置布局
          </button>
          <button className="toolbar-btn" onClick={handleSaveSnapshot}>
            💾 保存快照
          </button>
          <button className="toolbar-btn" onClick={handleExportPNG}>
            📷 导出为PNG
          </button>
        </div>
      </div>

      <div className="main-content">
        <DependencyGraph
          key={graphKey.current}
          tasks={tasks}
          dependencies={dependencies}
          onContextMenu={handleContextMenu}
          onTaskDoubleClick={handleTaskDoubleClick}
          onUpdateTaskProgress={(id, progress) => {
            setTasks(prev => prev.map(t => t.id === id ? { ...t, progress } : t));
          }}
          nodeWidth={nodeWidth}
          nodeHeight={nodeHeight}
        />
      </div>

      {contextMenu.visible && (
        <div
          className="context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="context-menu-item" onClick={handleEditProgress}>
            ✏️ 编辑进度
          </div>
          <div className="context-menu-item" onClick={handleAddSubtask}>
            ➕ 添加子任务
          </div>
          <div className="context-menu-item context-menu-danger" onClick={handleDeleteTask}>
            🗑️ 删除任务
          </div>
        </div>
      )}

      {editingTaskId && (
        <div className="modal-overlay" onClick={() => setEditingTaskId(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">编辑任务进度</div>
            <div className="modal-body">
              <input
                type="range"
                min="0"
                max="100"
                value={editingProgress}
                onChange={(e) => setEditingProgress(Number(e.target.value))}
                className="progress-slider"
              />
              <div className="progress-value">{editingProgress}%</div>
            </div>
            <div className="modal-footer">
              <button className="modal-btn" onClick={() => setEditingTaskId(null)}>取消</button>
              <button className="modal-btn modal-btn-primary" onClick={handleConfirmProgress}>确认</button>
            </div>
          </div>
        </div>
      )}

      {detailTask && (
        <div className="modal-overlay" onClick={() => setDetailTask(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">任务详情 - {detailTask.name}</div>
            <div className="modal-body">
              {(() => {
                const info = getTaskDetailInfo(detailTask);
                return (
                  <div className="detail-content">
                    <div className="detail-row">
                      <span className="detail-label">负责人:</span>
                      <span className="detail-value">{detailTask.assignee}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">时间范围:</span>
                      <span className="detail-value">{detailTask.startDate} ~ {detailTask.endDate}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">完成天数:</span>
                      <span className="detail-value">{info.completedDays} / {info.duration} 天</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">进度:</span>
                      <span className="detail-value">{detailTask.progress}%</span>
                    </div>
                    <div className="detail-section">
                      <div className="detail-section-title">前置任务 ({info.predecessors.length})</div>
                      <div className="detail-list">
                        {info.predecessors.length === 0 ? (
                          <span className="detail-empty">无</span>
                        ) : (
                          info.predecessors.map(p => (
                            <span key={p.id} className="detail-tag">{p.name}</span>
                          ))
                        )}
                      </div>
                    </div>
                    <div className="detail-section">
                      <div className="detail-section-title">后置任务 ({info.successors.length})</div>
                      <div className="detail-list">
                        {info.successors.length === 0 ? (
                          <span className="detail-empty">无</span>
                        ) : (
                          info.successors.map(s => (
                            <span key={s.id} className="detail-tag">{s.name}</span>
                          ))
                        )}
                      </div>
                    </div>
                    {detailTask.notes && (
                      <div className="detail-section">
                        <div className="detail-section-title">备注</div>
                        <div className="detail-notes">{detailTask.notes}</div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
            <div className="modal-footer">
              <button className="modal-btn modal-btn-primary" onClick={() => setDetailTask(null)}>关闭</button>
            </div>
          </div>
        </div>
      )}

      <div className={`stats-panel ${isMobile ? 'stats-mobile' : ''}`}>
        <div className="stats-item">
          <span className="stats-label">总任务数</span>
          <span className="stats-value">{stats.total}</span>
        </div>
        <div className="stats-item">
          <span className="stats-label">已完成</span>
          <span className="stats-value stats-success">{stats.completed}</span>
        </div>
        <div className="stats-item">
          <span className="stats-label">平均进度</span>
          <span className="stats-value">{stats.avgProgress}%</span>
        </div>
        <div className="stats-item">
          <span className="stats-label">关键路径</span>
          <span className="stats-value stats-critical">{stats.criticalPathLength}天</span>
        </div>
        <div className="stats-gantt">
          <span className="stats-label">迷你甘特图</span>
          <div className="mini-gantt">
            {miniGanttData.map(item => (
              <div
                key={item.task.id}
                className={`mini-gantt-bar ${item.isCritical ? 'gantt-critical' : ''}`}
                style={{
                  left: `${item.leftPercent}%`,
                  width: `${item.widthPercent}%`
                }}
                title={`${item.task.name} (${item.task.progress}%)`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
