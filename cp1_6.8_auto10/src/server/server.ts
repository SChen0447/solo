import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import cors from 'cors';
import type { Task, OnlineUser, Baseline, WSMessage, WSActionType } from '../types';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

let tasks: Task[] = [
  {
    id: '1',
    name: '需求分析',
    startDate: dayjs().subtract(2, 'day').format('YYYY-MM-DD'),
    endDate: dayjs().add(3, 'day').format('YYYY-MM-DD'),
    priority: 'high',
    assignee: '张三',
    description: '完成项目需求分析文档',
    progress: 80,
    dependencies: [],
    createdAt: dayjs().toISOString(),
    updatedAt: dayjs().toISOString(),
  },
  {
    id: '2',
    name: 'UI设计',
    startDate: dayjs().add(2, 'day').format('YYYY-MM-DD'),
    endDate: dayjs().add(7, 'day').format('YYYY-MM-DD'),
    priority: 'medium',
    assignee: '李四',
    description: '完成界面设计稿',
    progress: 30,
    dependencies: ['1'],
    createdAt: dayjs().toISOString(),
    updatedAt: dayjs().toISOString(),
  },
  {
    id: '3',
    name: '前端开发',
    startDate: dayjs().add(5, 'day').format('YYYY-MM-DD'),
    endDate: dayjs().add(15, 'day').format('YYYY-MM-DD'),
    priority: 'high',
    assignee: '王五',
    description: '实现前端页面功能',
    progress: 0,
    dependencies: ['2'],
    createdAt: dayjs().toISOString(),
    updatedAt: dayjs().toISOString(),
  },
  {
    id: '4',
    name: '后端开发',
    startDate: dayjs().add(3, 'day').format('YYYY-MM-DD'),
    endDate: dayjs().add(14, 'day').format('YYYY-MM-DD'),
    priority: 'high',
    assignee: '赵六',
    description: '实现后端API接口',
    progress: 10,
    dependencies: ['1'],
    createdAt: dayjs().toISOString(),
    updatedAt: dayjs().toISOString(),
  },
  {
    id: '5',
    name: '测试上线',
    startDate: dayjs().add(14, 'day').format('YYYY-MM-DD'),
    endDate: dayjs().add(20, 'day').format('YYYY-MM-DD'),
    priority: 'medium',
    assignee: '钱七',
    description: '系统测试与部署上线',
    progress: 0,
    dependencies: ['3', '4'],
    createdAt: dayjs().toISOString(),
    updatedAt: dayjs().toISOString(),
  },
];

let baselines: Baseline[] = [];
let onlineUsers: OnlineUser[] = [];

const avatarColors = ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#34495e'];
const avatarNames = ['用户A', '用户B', '用户C', '用户D', '用户E'];

function calculateTaskWarnings(): Task[] {
  const taskMap = new Map<string, Task>();
  tasks.forEach(t => taskMap.set(t.id, { ...t, isWarning: false }));

  tasks.forEach(task => {
    if (task.dependencies.length === 0) return;
    
    const taskStart = dayjs(task.startDate);
    
    task.dependencies.forEach(depId => {
      const depTask = taskMap.get(depId);
      if (!depTask) return;
      
      const depEnd = dayjs(depTask.endDate);
      
      if (depEnd.isAfter(taskStart.subtract(1, 'day'))) {
        const t = taskMap.get(task.id);
        if (t) t.isWarning = true;
      }
      
      if (depTask.progress < 100 && dayjs().isAfter(depEnd)) {
        const t = taskMap.get(task.id);
        if (t) t.isWarning = true;
      }
    });
  });

  return Array.from(taskMap.values());
}

function broadcastMessage(type: WSActionType, payload: any, excludeSocketId?: string) {
  const message: WSMessage = {
    type,
    payload,
    timestamp: Date.now(),
  };
  
  const messageStr = JSON.stringify(message);
  
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      const ws = client as any;
      if (excludeSocketId && ws.socketId === excludeSocketId) return;
      client.send(messageStr);
    }
  });
}

app.get('/api/tasks', (_req, res) => {
  const tasksWithWarnings = calculateTaskWarnings();
  res.json(tasksWithWarnings);
});

app.post('/api/tasks', (req, res) => {
  const { name, startDate, endDate, priority, assignee, description, progress = 0, dependencies = [] } = req.body;
  
  if (!name || !startDate || !endDate) {
    return res.status(400).json({ error: '任务名称和起止日期不能为空' });
  }

  const newTask: Task = {
    id: uuidv4(),
    name,
    startDate,
    endDate,
    priority,
    assignee: assignee || '',
    description: description || '',
    progress,
    dependencies,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  tasks.push(newTask);
  const tasksWithWarnings = calculateTaskWarnings();
  
  broadcastMessage('task:create', { task: newTask, tasks: tasksWithWarnings });
  
  res.status(201).json(newTask);
});

app.put('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  const taskIndex = tasks.findIndex(t => t.id === id);
  
  if (taskIndex === -1) {
    return res.status(404).json({ error: '任务不存在' });
  }

  const updatedTask: Task = {
    ...tasks[taskIndex],
    ...req.body,
    id,
    updatedAt: new Date().toISOString(),
  };

  tasks[taskIndex] = updatedTask;
  const tasksWithWarnings = calculateTaskWarnings();
  
  broadcastMessage('task:update', { task: updatedTask, tasks: tasksWithWarnings });
  
  res.json(updatedTask);
});

app.delete('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  const taskIndex = tasks.findIndex(t => t.id === id);
  
  if (taskIndex === -1) {
    return res.status(404).json({ error: '任务不存在' });
  }

  const deletedTask = tasks[taskIndex];
  tasks.splice(taskIndex, 1);
  
  tasks = tasks.map(t => ({
    ...t,
    dependencies: t.dependencies.filter(depId => depId !== id),
  }));
  
  const tasksWithWarnings = calculateTaskWarnings();
  
  broadcastMessage('task:delete', { taskId: id, tasks: tasksWithWarnings });
  
  res.json(deletedTask);
});

app.post('/api/dependencies', (req, res) => {
  const { fromTaskId, toTaskId } = req.body;
  
  const fromTask = tasks.find(t => t.id === fromTaskId);
  const toTask = tasks.find(t => t.id === toTaskId);
  
  if (!fromTask || !toTask) {
    return res.status(404).json({ error: '任务不存在' });
  }
  
  if (toTask.dependencies.includes(fromTaskId)) {
    return res.status(400).json({ error: '依赖已存在' });
  }
  
  toTask.dependencies.push(fromTaskId);
  toTask.updatedAt = new Date().toISOString();
  
  const tasksWithWarnings = calculateTaskWarnings();
  
  broadcastMessage('dependency:add', { 
    fromTaskId, 
    toTaskId, 
    tasks: tasksWithWarnings 
  });
  
  res.json({ success: true, tasks: tasksWithWarnings });
});

app.delete('/api/dependencies', (req, res) => {
  const { fromTaskId, toTaskId } = req.body;
  
  const toTask = tasks.find(t => t.id === toTaskId);
  
  if (!toTask) {
    return res.status(404).json({ error: '任务不存在' });
  }
  
  toTask.dependencies = toTask.dependencies.filter(depId => depId !== fromTaskId);
  toTask.updatedAt = new Date().toISOString();
  
  const tasksWithWarnings = calculateTaskWarnings();
  
  broadcastMessage('dependency:remove', { 
    fromTaskId, 
    toTaskId, 
    tasks: tasksWithWarnings 
  });
  
  res.json({ success: true, tasks: tasksWithWarnings });
});

app.get('/api/baselines', (_req, res) => {
  res.json(baselines);
});

app.post('/api/baselines', (req, res) => {
  const { name } = req.body;
  
  const newBaseline: Baseline = {
    id: uuidv4(),
    name: name || `基线 ${baselines.length + 1}`,
    tasks: JSON.parse(JSON.stringify(tasks)),
    createdAt: new Date().toISOString(),
  };
  
  baselines.push(newBaseline);
  
  broadcastMessage('baseline:set', { baseline: newBaseline, baselines });
  
  res.status(201).json(newBaseline);
});

app.get('/api/users/online', (_req, res) => {
  res.json(onlineUsers);
});

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws: any) => {
  const socketId = uuidv4();
  ws.socketId = socketId;
  
  const userIndex = onlineUsers.length % avatarNames.length;
  const newUser: OnlineUser = {
    id: uuidv4(),
    name: avatarNames[userIndex],
    avatar: '',
    color: avatarColors[userIndex],
    socketId,
    lastActive: Date.now(),
  };
  
  onlineUsers.push(newUser);
  
  ws.send(JSON.stringify({
    type: 'user:join',
    payload: { user: newUser, users: onlineUsers },
    timestamp: Date.now(),
  }));
  
  broadcastMessage('user:join', { user: newUser, users: onlineUsers }, socketId);
  
  ws.on('message', (data: string) => {
    try {
      const message = JSON.parse(data) as WSMessage;
      newUser.lastActive = Date.now();
      
      if (message.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      }
    } catch (e) {
      console.error('WebSocket message parse error:', e);
    }
  });
  
  ws.on('close', () => {
    onlineUsers = onlineUsers.filter(u => u.socketId !== socketId);
    broadcastMessage('user:leave', { userId: newUser.id, users: onlineUsers });
  });
  
  ws.on('error', (error: Error) => {
    console.error('WebSocket error:', error);
  });
});

console.log('Gantt Collaboration Server starting...');
