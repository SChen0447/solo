import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import GanttChart from './components/GanttChart';
import TaskPanel from './components/TaskPanel';
import { useWebSocket } from './hooks/useWebSocket';
import type { Task, OnlineUser, Baseline, ViewMode, FilterOptions, WSMessage } from '../types';
import './styles/global.css';

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [filters, setFilters] = useState<FilterOptions>({
    assignee: '',
    priority: '',
    status: '',
  });
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [baselines, setBaselines] = useState<Baseline[]>([]);
  const [selectedBaselineId, setSelectedBaselineId] = useState<string | null>(null);
  const [showBaseline, setShowBaseline] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createTaskData, setCreateTaskData] = useState<{ startDate: string; endDate: string } | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const notificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showNotification = useCallback((message: string) => {
    setNotification(message);
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
    }
    notificationTimeoutRef.current = setTimeout(() => {
      setNotification(null);
    }, 3000);
  }, []);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await axios.get('/api/tasks');
      setTasks(res.data);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    }
  }, []);

  const fetchOnlineUsers = useCallback(async () => {
    try {
      const res = await axios.get('/api/users/online');
      setOnlineUsers(res.data);
    } catch (err) {
      console.error('Failed to fetch online users:', err);
    }
  }, []);

  const fetchBaselines = useCallback(async () => {
    try {
      const res = await axios.get('/api/baselines');
      setBaselines(res.data);
    } catch (err) {
      console.error('Failed to fetch baselines:', err);
    }
  }, []);

  const handleWSMessage = useCallback((message: WSMessage) => {
    switch (message.type) {
      case 'task:create':
      case 'task:update':
      case 'task:delete':
      case 'dependency:add':
      case 'dependency:remove':
        if (message.payload.tasks) {
          setTasks(message.payload.tasks);
        }
        if (message.type === 'task:create') {
          showNotification(`新任务已创建: ${message.payload.task?.name || ''}`);
        }
        break;
      case 'user:join':
      case 'user:leave':
        if (message.payload.users) {
          setOnlineUsers(message.payload.users);
        }
        if (message.type === 'user:join') {
          showNotification(`${message.payload.user?.name || '新用户'} 加入了协作`);
        }
        break;
      case 'baseline:set':
        if (message.payload.baselines) {
          setBaselines(message.payload.baselines);
        }
        showNotification('新基线已保存');
        break;
    }
  }, [showNotification]);

  useWebSocket({ onMessage: handleWSMessage });

  useEffect(() => {
    fetchTasks();
    fetchOnlineUsers();
    fetchBaselines();
  }, [fetchTasks, fetchOnlineUsers, fetchBaselines]);

  const handleCreateTask = useCallback(async (taskData: Partial<Task>) => {
    try {
      await axios.post('/api/tasks', taskData);
      setIsCreating(false);
      setCreateTaskData(null);
      showNotification('任务创建成功');
    } catch (err) {
      console.error('Failed to create task:', err);
      showNotification('任务创建失败');
    }
  }, [showNotification]);

  const handleUpdateTask = useCallback(async (taskId: string, taskData: Partial<Task>) => {
    try {
      await axios.put(`/api/tasks/${taskId}`, taskData);
      showNotification('任务更新成功');
    } catch (err) {
      console.error('Failed to update task:', err);
      showNotification('任务更新失败');
    }
  }, [showNotification]);

  const handleDeleteTask = useCallback(async (taskId: string) => {
    try {
      await axios.delete(`/api/tasks/${taskId}`);
      setSelectedTaskId(null);
      showNotification('任务已删除');
    } catch (err) {
      console.error('Failed to delete task:', err);
      showNotification('任务删除失败');
    }
  }, [showNotification]);

  const handleAddDependency = useCallback(async (fromTaskId: string, toTaskId: string) => {
    try {
      await axios.post('/api/dependencies', { fromTaskId, toTaskId });
      showNotification('依赖关系已建立');
    } catch (err) {
      console.error('Failed to add dependency:', err);
      showNotification('添加依赖失败');
    }
  }, [showNotification]);

  const handleChartClick = useCallback((date: string) => {
    setIsCreating(true);
    setCreateTaskData({
      startDate: date,
      endDate: dayjs(date).add(3, 'day').format('YYYY-MM-DD'),
    });
  }, []);

  const handleSaveBaseline = useCallback(async (name: string) => {
    try {
      await axios.post('/api/baselines', { name });
    } catch (err) {
      console.error('Failed to save baseline:', err);
      showNotification('保存基线失败');
    }
  }, [showNotification]);

  const assignees = Array.from(new Set(tasks.map(t => t.assignee).filter(Boolean)));

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1 className="app-title">甘特图</h1>
          <p className="app-subtitle">项目排期协作</p>
        </div>
        
        <div className="sidebar-section">
          <h3 className="sidebar-section-title">视图模式</h3>
          <div className="view-mode-buttons">
            {(['week', 'month', 'quarter'] as ViewMode[]).map(mode => (
              <button
                key={mode}
                className={`view-mode-btn ${viewMode === mode ? 'active' : ''}`}
                onClick={() => setViewMode(mode)}
              >
                {mode === 'week' ? '周' : mode === 'month' ? '月' : '季度'}
              </button>
            ))}
          </div>
        </div>

        <div className="sidebar-section">
          <h3 className="sidebar-section-title">筛选</h3>
          
          <div className="filter-group">
            <label className="filter-label">负责人</label>
            <select
              className="filter-select"
              value={filters.assignee}
              onChange={e => setFilters({ ...filters, assignee: e.target.value })}
            >
              <option value="">全部</option>
              {assignees.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">优先级</label>
            <select
              className="filter-select"
              value={filters.priority}
              onChange={e => setFilters({ ...filters, priority: e.target.value })}
            >
              <option value="">全部</option>
              <option value="high">高</option>
              <option value="medium">中</option>
              <option value="low">低</option>
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">状态</label>
            <select
              className="filter-select"
              value={filters.status}
              onChange={e => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">全部</option>
              <option value="not-started">未开始</option>
              <option value="in-progress">进行中</option>
              <option value="completed">已完成</option>
            </select>
          </div>
        </div>

        <div className="sidebar-section">
          <h3 className="sidebar-section-title">基线对比</h3>
          <div className="baseline-controls">
            <label className="baseline-toggle">
              <input
                type="checkbox"
                checked={showBaseline}
                onChange={e => setShowBaseline(e.target.checked)}
              />
              <span>显示基线</span>
            </label>
            {baselines.length > 0 && (
              <select
                className="filter-select"
                value={selectedBaselineId || ''}
                onChange={e => {
                  setSelectedBaselineId(e.target.value || null);
                  setShowBaseline(!!e.target.value);
                }}
              >
                <option value="">选择基线</option>
                {baselines.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            )}
            <button
              className="btn btn-primary btn-small"
              onClick={() => handleSaveBaseline(`基线 ${baselines.length + 1}`)}
            >
              保存基线
            </button>
          </div>
        </div>

        <div className="sidebar-footer">
          <div className="legend">
            <div className="legend-item">
              <span className="legend-color" style={{ background: '#e74c3c' }}></span>
              <span>高优先级</span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ background: '#f39c12' }}></span>
              <span>中优先级</span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ background: '#2ecc71' }}></span>
              <span>低优先级</span>
            </div>
            <div className="legend-item">
              <span className="legend-color legend-warning"></span>
              <span>延期预警</span>
            </div>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="top-header">
          <div className="header-left">
            <h2 className="page-title">项目排期</h2>
            <span className="task-count">{tasks.length} 个任务</span>
          </div>
          <div className="header-right">
            <div className="online-users-indicator">
              <span className="online-dot"></span>
              <span>{onlineUsers.length} 人在线</span>
            </div>
          </div>
        </header>

        <GanttChart
          tasks={tasks}
          viewMode={viewMode}
          filters={filters}
          selectedTaskId={selectedTaskId}
          onTaskSelect={setSelectedTaskId}
          onTaskUpdate={handleUpdateTask}
          onTaskCreate={handleCreateTask}
          onChartClick={handleChartClick}
          onAddDependency={handleAddDependency}
          showBaseline={showBaseline}
          baselineTasks={selectedBaselineId ? baselines.find(b => b.id === selectedBaselineId)?.tasks : null}
        />
      </main>

      <TaskPanel
        task={selectedTaskId ? tasks.find(t => t.id === selectedTaskId) || null : null}
        tasks={tasks}
        isCreating={isCreating}
        createTaskData={createTaskData}
        onClose={() => {
          setSelectedTaskId(null);
          setIsCreating(false);
          setCreateTaskData(null);
        }}
        onUpdate={handleUpdateTask}
        onDelete={handleDeleteTask}
        onCreate={handleCreateTask}
        onlineUsers={onlineUsers}
      />

      {notification && (
        <div className="notification-toast">
          <span>{notification}</span>
        </div>
      )}
    </div>
  );
}

export default App;
