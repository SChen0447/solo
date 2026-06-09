import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { Meeting, ActionItem, ActionStatus } from './types';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

let meetings: Meeting[] = [];

const STATUS_ORDER: ActionStatus[] = ['todo', 'in-progress', 'done'];

app.get('/api/meetings', (req, res) => {
  const sorted = [...meetings].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  res.json(sorted);
});

app.get('/api/meetings/:id', (req, res) => {
  const meeting = meetings.find(m => m.id === req.params.id);
  if (!meeting) {
    res.status(404).json({ error: '会议不存在' });
    return;
  }
  res.json(meeting);
});

app.post('/api/meetings', (req, res) => {
  const { title, date, description } = req.body;
  if (!title || !date) {
    res.status(400).json({ error: '标题和日期为必填项' });
    return;
  }
  const newMeeting: Meeting = {
    id: uuidv4(),
    title,
    date,
    description: description || '',
    actionItems: [],
    createdAt: Date.now()
  };
  meetings.push(newMeeting);
  res.status(201).json(newMeeting);
});

app.put('/api/meetings/:id', (req, res) => {
  const index = meetings.findIndex(m => m.id === req.params.id);
  if (index === -1) {
    res.status(404).json({ error: '会议不存在' });
    return;
  }
  const { title, date, description } = req.body;
  meetings[index] = {
    ...meetings[index],
    title: title || meetings[index].title,
    date: date || meetings[index].date,
    description: description !== undefined ? description : meetings[index].description
  };
  res.json(meetings[index]);
});

app.delete('/api/meetings/:id', (req, res) => {
  const index = meetings.findIndex(m => m.id === req.params.id);
  if (index === -1) {
    res.status(404).json({ error: '会议不存在' });
    return;
  }
  meetings.splice(index, 1);
  res.json({ success: true });
});

app.post('/api/meetings/:meetingId/actions', (req, res) => {
  const meeting = meetings.find(m => m.id === req.params.meetingId);
  if (!meeting) {
    res.status(404).json({ error: '会议不存在' });
    return;
  }
  const { description, assignee, dueDate } = req.body;
  if (!description || !assignee || !dueDate) {
    res.status(400).json({ error: '描述、负责人和截止日期为必填项' });
    return;
  }
  const newAction: ActionItem = {
    id: uuidv4(),
    description,
    assignee,
    dueDate,
    status: 'todo',
    meetingId: meeting.id
  };
  meeting.actionItems.push(newAction);
  res.status(201).json(newAction);
});

app.put('/api/actions/:actionId/status', (req, res) => {
  let action: ActionItem | undefined;
  let meeting: Meeting | undefined;
  
  for (const m of meetings) {
    const a = m.actionItems.find(item => item.id === req.params.actionId);
    if (a) {
      action = a;
      meeting = m;
      break;
    }
  }
  
  if (!action || !meeting) {
    res.status(404).json({ error: '动作项不存在' });
    return;
  }
  
  const currentIndex = STATUS_ORDER.indexOf(action.status);
  const nextIndex = (currentIndex + 1) % STATUS_ORDER.length;
  action.status = STATUS_ORDER[nextIndex];
  
  res.json(action);
});

app.delete('/api/actions/:actionId', (req, res) => {
  let found = false;
  for (const m of meetings) {
    const index = m.actionItems.findIndex(item => item.id === req.params.actionId);
    if (index !== -1) {
      m.actionItems.splice(index, 1);
      found = true;
      break;
    }
  }
  
  if (!found) {
    res.status(404).json({ error: '动作项不存在' });
    return;
  }
  
  res.json({ success: true });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', meetings: meetings.length });
});

app.listen(PORT, () => {
  console.log(`会议看板 API 服务器运行在 http://localhost:${PORT}`);
});

export default app;
