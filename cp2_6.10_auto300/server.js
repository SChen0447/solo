import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const DATA_DIR = path.join(__dirname, 'data');
const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');
const FEEDBACK_FILE = path.join(DATA_DIR, 'feedback.json');

const readJSON = (filePath) => {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
};

const writeJSON = (filePath, data) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
};

const addLog = (project, operator, action, summary) => {
  const snapshot = JSON.parse(JSON.stringify(project));
  delete snapshot.logs;
  const log = {
    id: 'log-' + uuidv4().slice(0, 8),
    projectId: project.id,
    operator,
    action,
    summary,
    timestamp: new Date().toISOString(),
    snapshot
  };
  if (!project.logs) project.logs = [];
  project.logs.unshift(log);
  return log;
};

app.get('/api/projects', (req, res) => {
  try {
    const { projects } = readJSON(PROJECTS_FILE);
    const simplified = projects.map(({ scenes, characters, chapters, logs, ...rest }) => rest);
    res.json(simplified.sort((a, b) => a.order - b.order));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/projects', (req, res) => {
  try {
    const data = readJSON(PROJECTS_FILE);
    const { title, cover } = req.body;
    const newProject = {
      id: 'proj-' + uuidv4().slice(0, 8),
      title,
      cover: cover || 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=manga%20cover%20placeholder%20comic%20style&image_size=square',
      progress: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      order: data.projects.length,
      characters: [],
      chapters: [],
      scenes: [],
      logs: []
    };
    data.projects.push(newProject);
    writeJSON(PROJECTS_FILE, data);
    res.status(201).json(newProject);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/projects/:id', (req, res) => {
  try {
    const { projects } = readJSON(PROJECTS_FILE);
    const project = projects.find(p => p.id === req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    project.scenes?.sort((a, b) => a.order - b.order);
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/projects/:id', (req, res) => {
  try {
    const data = readJSON(PROJECTS_FILE);
    const idx = data.projects.findIndex(p => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Project not found' });
    
    const oldProject = data.projects[idx];
    data.projects[idx] = { ...oldProject, ...req.body, updatedAt: new Date().toISOString() };
    
    if (req.body.order !== undefined) {
      data.projects.sort((a, b) => a.order - b.order);
    }
    
    addLog(data.projects[idx], '主编', 'project_update', '更新了项目信息');
    writeJSON(PROJECTS_FILE, data);
    res.json(data.projects[idx]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/projects/:id/scenes', (req, res) => {
  try {
    const { projects } = readJSON(PROJECTS_FILE);
    const project = projects.find(p => p.id === req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const scenes = (project.scenes || []).sort((a, b) => a.order - b.order);
    res.json(scenes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/projects/:id/scenes', (req, res) => {
  try {
    const data = readJSON(PROJECTS_FILE);
    const idx = data.projects.findIndex(p => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Project not found' });
    
    const project = data.projects[idx];
    const newScene = {
      id: 'scene-' + uuidv4().slice(0, 8),
      projectId: project.id,
      order: (project.scenes || []).length,
      chapterId: req.body.chapterId || (project.chapters?.[0]?.id || ''),
      thumbnail: req.body.thumbnail || 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=manga%20panel%20placeholder%20comic%20scene&image_size=landscape_4_3',
      script: req.body.script || '',
      dialogue: req.body.dialogue || '',
      artistId: req.body.artistId || '',
      status: req.body.status || 'draft'
    };
    
    if (!project.scenes) project.scenes = [];
    project.scenes.push(newScene);
    project.updatedAt = new Date().toISOString();
    
    const finishedCount = project.scenes.filter(s => s.status === 'finished').length;
    project.progress = project.scenes.length > 0 ? Math.round((finishedCount / project.scenes.length) * 100) : 0;
    
    addLog(project, '主编', 'scene_create', `创建了新分镜「${newScene.id}」`);
    writeJSON(PROJECTS_FILE, data);
    res.status(201).json(newScene);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/scenes/:id', (req, res) => {
  try {
    const data = readJSON(PROJECTS_FILE);
    let found = null;
    let projectIdx = -1;
    
    for (let i = 0; i < data.projects.length; i++) {
      const sceneIdx = (data.projects[i].scenes || []).findIndex(s => s.id === req.params.id);
      if (sceneIdx !== -1) {
        found = { projectIdx: i, sceneIdx };
        break;
      }
    }
    
    if (!found) return res.status(404).json({ error: 'Scene not found' });
    
    const project = data.projects[found.projectIdx];
    const oldScene = project.scenes[found.sceneIdx];
    project.scenes[found.sceneIdx] = { ...oldScene, ...req.body };
    project.updatedAt = new Date().toISOString();
    
    if (req.body.order !== undefined) {
      project.scenes.sort((a, b) => a.order - b.order);
      project.scenes.forEach((s, i) => s.order = i);
    }
    
    const finishedCount = project.scenes.filter(s => s.status === 'finished').length;
    project.progress = project.scenes.length > 0 ? Math.round((finishedCount / project.scenes.length) * 100) : 0;
    
    let summary = '更新了分镜信息';
    if (req.body.status && req.body.status !== oldScene.status) {
      summary = `分镜状态从「${oldScene.status}」变更为「${req.body.status}」`;
    }
    addLog(project, '主编', 'scene_update', summary);
    
    writeJSON(PROJECTS_FILE, data);
    res.json(project.scenes[found.sceneIdx]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/projects/:id/chapters/:chapterId/feedback', (req, res) => {
  try {
    const data = readJSON(FEEDBACK_FILE);
    const { emotion, comment } = req.body;
    const newFeedback = {
      id: 'fb-' + uuidv4().slice(0, 8),
      chapterId: req.params.chapterId,
      emotion,
      comment: comment || '',
      createdAt: new Date().toISOString()
    };
    data.feedback.push(newFeedback);
    writeJSON(FEEDBACK_FILE, data);
    res.status(201).json(newFeedback);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/projects/:id/chapters/:chapterId/feedback/stats', (req, res) => {
  try {
    const { feedback } = readJSON(FEEDBACK_FILE);
    const chapterFeedback = feedback.filter(f => f.chapterId === req.params.chapterId);
    
    const stats = {
      excited: 0,
      touched: 0,
      suspense: 0,
      funny: 0,
      shocked: 0,
      depressed: 0,
      total: chapterFeedback.length
    };
    
    chapterFeedback.forEach(f => {
      if (stats[f.emotion] !== undefined) {
        stats[f.emotion]++;
      }
    });
    
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/projects/:id/logs', (req, res) => {
  try {
    const { projects } = readJSON(PROJECTS_FILE);
    const project = projects.find(p => p.id === req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const logs = (project.logs || []).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/projects/:id/restore/:logId', (req, res) => {
  try {
    const data = readJSON(PROJECTS_FILE);
    const idx = data.projects.findIndex(p => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Project not found' });
    
    const project = data.projects[idx];
    const log = (project.logs || []).find(l => l.id === req.params.logId);
    if (!log || !log.snapshot) return res.status(404).json({ error: 'Log or snapshot not found' });
    
    const logs = project.logs;
    data.projects[idx] = {
      ...log.snapshot,
      logs,
      updatedAt: new Date().toISOString()
    };
    
    addLog(data.projects[idx], '主编', 'restore', `恢复到版本「${req.params.logId}」`);
    writeJSON(PROJECTS_FILE, data);
    res.json(data.projects[idx]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Comic Studio API server running on http://localhost:${PORT}`);
});
