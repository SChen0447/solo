import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 4001;

app.use(cors());
app.use(express.json());

let projects = [
  { id: 'default', name: '默认项目', createdAt: Date.now() }
];

let notes = [];

app.get('/api/projects', (req, res) => {
  res.json(projects);
});

app.post('/api/projects', (req, res) => {
  const { name } = req.body;
  const project = {
    id: uuidv4(),
    name: name || '新项目',
    createdAt: Date.now()
  };
  projects.push(project);
  res.json(project);
});

app.get('/api/projects/:id/notes', (req, res) => {
  const { id } = req.params;
  const projectNotes = notes.filter(n => n.projectId === id);
  res.json(projectNotes);
});

app.post('/api/notes', (req, res) => {
  const { projectId, content, x, y, width, height } = req.body;
  const note = {
    id: uuidv4(),
    projectId,
    content: content || '',
    x: x || 100,
    y: y || 100,
    width: width || 200,
    height: height || 200,
    likes: 0,
    comments: [],
    createdAt: Date.now()
  };
  notes.push(note);
  res.json(note);
});

app.put('/api/notes/:id', (req, res) => {
  const { id } = req.params;
  const noteIndex = notes.findIndex(n => n.id === id);
  if (noteIndex === -1) {
    return res.status(404).json({ error: 'Note not found' });
  }
  notes[noteIndex] = { ...notes[noteIndex], ...req.body };
  res.json(notes[noteIndex]);
});

app.put('/api/notes/:id/like', (req, res) => {
  const { id } = req.params;
  const noteIndex = notes.findIndex(n => n.id === id);
  if (noteIndex === -1) {
    return res.status(404).json({ error: 'Note not found' });
  }
  notes[noteIndex].likes += 1;
  res.json(notes[noteIndex]);
});

app.post('/api/notes/:id/comments', (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  const noteIndex = notes.findIndex(n => n.id === id);
  if (noteIndex === -1) {
    return res.status(404).json({ error: 'Note not found' });
  }
  const comment = {
    id: uuidv4(),
    content,
    createdAt: Date.now()
  };
  notes[noteIndex].comments.push(comment);
  res.json(notes[noteIndex]);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
