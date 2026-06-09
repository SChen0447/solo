const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../dist')));

const projects = new Map();
const tasks = new Map();
const messages = new Map();
const comments = new Map();

const COLOR_PALETTE = [
  '#F06292', '#BA68C8', '#7986CB', '#4FC3F7',
  '#4DB6AC', '#81C784', '#FFD54F', '#FF8A65'
];

const PRESET_USERS = [
  { id: 'user-1', name: '张设计师', initial: '张' },
  { id: 'user-2', name: '李美术', initial: '李' },
  { id: 'user-3', name: '王创意', initial: '王' },
  { id: 'user-4', name: '赵经理', initial: '赵' },
  { id: 'user-5', name: '陈客户', initial: '陈' }
];

function getRandomColor() {
  return COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
}

function mapToArray(map) {
  return Array.from(map.values());
}

const seedProject1Id = uuidv4();
const seedProject2Id = uuidv4();
const seedProject3Id = uuidv4();

projects.set(seedProject1Id, {
  id: seedProject1Id,
  name: '春季品牌视觉设计',
  client: '明月画廊',
  deadline: '2026-07-15',
  color: COLOR_PALETTE[0],
  createdAt: Date.now()
});

projects.set(seedProject2Id, {
  id: seedProject2Id,
  name: '城市主题插画系列',
  client: '星辰出版社',
  deadline: '2026-06-30',
  color: COLOR_PALETTE[3],
  createdAt: Date.now() + 1000
});

projects.set(seedProject3Id, {
  id: seedProject3Id,
  name: 'Logo焕新设计',
  client: '清风科技',
  deadline: '2026-05-20',
  color: COLOR_PALETTE[6],
  createdAt: Date.now() + 2000
});

const seedTasks = [
  { id: uuidv4(), projectId: seedProject1Id, title: '品牌主色调定义', description: '确定品牌的主色调和辅助色彩体系', status: 'todo', priority: 'high', assignee: 'user-1', deadline: '2026-06-15' },
  { id: uuidv4(), projectId: seedProject1Id, title: 'Logo初稿设计', description: '设计3-5个Logo方案供客户选择', status: 'inprogress', priority: 'urgent', assignee: 'user-2', deadline: '2026-06-12' },
  { id: uuidv4(), projectId: seedProject1Id, title: '名片设计', description: '完成品牌名片的设计稿', status: 'done', priority: 'medium', assignee: 'user-1', deadline: '2026-06-10' },
  { id: uuidv4(), projectId: seedProject2Id, title: '城市线稿绘制', description: '绘制5个主要城市的地标线稿', status: 'todo', priority: 'medium', assignee: 'user-3', deadline: '2026-06-20' },
  { id: uuidv4(), projectId: seedProject2Id, title: '色彩风格探索', description: '确定插画整体的色彩风格', status: 'inprogress', priority: 'high', assignee: 'user-2', deadline: '2026-06-18' },
  { id: uuidv4(), projectId: seedProject3Id, title: '客户需求调研', description: '深入了解客户品牌理念', status: 'done', priority: 'high', assignee: 'user-4', deadline: '2026-05-15' }
];

seedTasks.forEach(task => tasks.set(task.id, task));

const seedMessages = [
  { id: uuidv4(), projectId: seedProject1Id, sender: '张设计师', content: 'Logo的第二个方案已经完成，大家来看看', timestamp: Date.now() - 3600000 },
  { id: uuidv4(), projectId: seedProject1Id, sender: '赵经理', content: '好的，我下午会和客户沟通反馈', timestamp: Date.now() - 1800000 },
  { id: uuidv4(), projectId: seedProject1Id, sender: '李美术', content: '我觉得配色可以再调整一下', timestamp: Date.now() - 900000 }
];

seedMessages.forEach(msg => messages.set(msg.id, msg));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/projects', (req, res) => {
  const projectList = mapToArray(projects).map(p => {
    const projectTasks = mapToArray(tasks).filter(t => t.projectId === p.id);
    const completedTasks = projectTasks.filter(t => t.status === 'done').length;
    const totalTasks = projectTasks.length;
    return {
      ...p,
      stats: {
        total: totalTasks,
        completed: completedTasks,
        inprogress: projectTasks.filter(t => t.status === 'inprogress').length,
        todo: projectTasks.filter(t => t.status === 'todo').length
      }
    };
  });
  res.json(projectList);
});

app.get('/api/projects/:id', (req, res) => {
  const project = projects.get(req.params.id);
  if (!project) {
    return res.status(404).json({ error: '项目不存在' });
  }
  const projectTasks = mapToArray(tasks).filter(t => t.projectId === project.id);
  const completedTasks = projectTasks.filter(t => t.status === 'done').length;
  res.json({
    ...project,
    stats: {
      total: projectTasks.length,
      completed: completedTasks
    }
  });
});

app.post('/api/projects', (req, res) => {
  const { name, client, deadline } = req.body;
  if (!name || name.length > 30) {
    return res.status(400).json({ error: '项目名称无效（最多30字）' });
  }
  if (!client || client.length > 20) {
    return res.status(400).json({ error: '客户姓名无效（最多20字）' });
  }
  const id = uuidv4();
  const project = {
    id,
    name,
    client,
    deadline,
    color: getRandomColor(),
    createdAt: Date.now()
  };
  projects.set(id, project);
  res.status(201).json(project);
});

app.put('/api/projects/:id', (req, res) => {
  const project = projects.get(req.params.id);
  if (!project) {
    return res.status(404).json({ error: '项目不存在' });
  }
  const updated = { ...project, ...req.body, id: project.id };
  projects.set(req.params.id, updated);
  res.json(updated);
});

app.delete('/api/projects/:id', (req, res) => {
  const deleted = projects.delete(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: '项目不存在' });
  }
  mapToArray(tasks)
    .filter(t => t.projectId === req.params.id)
    .forEach(t => tasks.delete(t.id));
  res.json({ success: true });
});

app.get('/api/projects/:id/tasks', (req, res) => {
  const projectTasks = mapToArray(tasks)
    .filter(t => t.projectId === req.params.id)
    .map(t => ({
      ...t,
      comments: mapToArray(comments).filter(c => c.taskId === t.id)
    }));
  res.json(projectTasks);
});

app.post('/api/tasks', (req, res) => {
  const { projectId, title, description, priority, assignee, deadline } = req.body;
  if (!projectId || !title) {
    return res.status(400).json({ error: '缺少必要字段' });
  }
  const id = uuidv4();
  const task = {
    id,
    projectId,
    title,
    description: description || '',
    status: 'todo',
    priority: priority || 'medium',
    assignee: assignee || null,
    deadline: deadline || null,
    createdAt: Date.now()
  };
  tasks.set(id, task);
  res.status(201).json(task);
});

app.put('/api/tasks/:id', (req, res) => {
  const task = tasks.get(req.params.id);
  if (!task) {
    return res.status(404).json({ error: '任务不存在' });
  }
  const updated = { ...task, ...req.body, id: task.id };
  tasks.set(req.params.id, updated);
  res.json(updated);
});

app.delete('/api/tasks/:id', (req, res) => {
  const deleted = tasks.delete(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: '任务不存在' });
  }
  res.json({ success: true });
});

app.get('/api/projects/:id/messages', (req, res) => {
  const projectMessages = mapToArray(messages)
    .filter(m => m.projectId === req.params.id)
    .sort((a, b) => b.timestamp - a.timestamp);
  res.json(projectMessages);
});

app.post('/api/messages', (req, res) => {
  const { projectId, sender, content } = req.body;
  if (!projectId || !sender || !content) {
    return res.status(400).json({ error: '缺少必要字段' });
  }
  const id = uuidv4();
  const message = {
    id,
    projectId,
    sender,
    content,
    timestamp: Date.now()
  };
  messages.set(id, message);
  res.status(201).json(message);
});

app.get('/api/tasks/:id/comments', (req, res) => {
  const taskComments = mapToArray(comments)
    .filter(c => c.taskId === req.params.id)
    .sort((a, b) => a.timestamp - b.timestamp);
  res.json(taskComments);
});

app.post('/api/comments', (req, res) => {
  const { taskId, sender, content } = req.body;
  if (!taskId || !sender || !content) {
    return res.status(400).json({ error: '缺少必要字段' });
  }
  const id = uuidv4();
  const comment = {
    id,
    taskId,
    sender,
    content,
    timestamp: Date.now()
  };
  comments.set(id, comment);
  res.status(201).json(comment);
});

app.get('/api/users', (req, res) => {
  res.json(PRESET_USERS);
});

app.get('/api/stats/overview', (req, res) => {
  const allProjects = mapToArray(projects);
  const now = Date.now();
  
  const total = allProjects.length;
  let completed = 0;
  let inprogress = 0;
  let overdue = 0;

  allProjects.forEach(p => {
    const projectTasks = mapToArray(tasks).filter(t => t.projectId === p.id);
    const doneTasks = projectTasks.filter(t => t.status === 'done');
    const hasInProgress = projectTasks.some(t => t.status === 'inprogress' || t.status === 'todo');
    
    if (projectTasks.length > 0 && doneTasks.length === projectTasks.length) {
      completed++;
    } else if (hasInProgress) {
      inprogress++;
    }
    
    const deadline = new Date(p.deadline).getTime();
    const allDone = projectTasks.length > 0 && doneTasks.length === projectTasks.length;
    if (deadline < now && !allDone) {
      overdue++;
    }
  });

  res.json({ total, completed, inprogress, overdue });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`ArtFlow Server running on port ${PORT}`);
});
