import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';
import type { Story, Paragraph, CreateStoryRequest, CreateStoryResponse } from '../src/shared/types';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(cors());
app.use(bodyParser.json());

const stories = new Map<string, Story>();
const LOCK_DURATION = 60000;

function generateStoryId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

function createStory(title: string, opening: string, authorName: string): Story {
  const now = Date.now();
  const id = generateStoryId();
  const openingParagraph: Paragraph = {
    id: uuidv4(),
    index: 0,
    authorName,
    content: opening,
    timestamp: now,
    durationMs: 0
  };
  const story: Story = {
    id,
    title,
    paragraphs: [openingParagraph],
    currentWriterId: null,
    currentWriterName: null,
    lockExpiresAt: null,
    lastParagraphTime: now,
    createdAt: now
  };
  stories.set(id, story);
  return story;
}

function checkAndReleaseExpiredLocks() {
  const now = Date.now();
  for (const [storyId, story] of stories) {
    if (story.lockExpiresAt && now > story.lockExpiresAt) {
      story.currentWriterId = null;
      story.currentWriterName = null;
      story.lockExpiresAt = null;
      io.to(storyId).emit('lock-released', { storyId });
      io.to(storyId).emit('writer-status', {
        storyId,
        writerName: null
      });
    }
  }
}
setInterval(checkAndReleaseExpiredLocks, 5000);

app.post('/api/story', (req, res) => {
  const { title, opening, authorName } = req.body as CreateStoryRequest;
  if (!title || !opening || !authorName) {
    return res.status(400).json({ error: '缺少必要字段' });
  }
  if (opening.length > 300) {
    return res.status(400).json({ error: '开头段落不能超过300字' });
  }
  const story = createStory(title, opening, authorName);
  const response: CreateStoryResponse = { id: story.id, story };
  res.json(response);
});

app.get('/api/story/:id', (req, res) => {
  const story = stories.get(req.params.id);
  if (!story) {
    return res.status(404).json({ error: '故事不存在' });
  }
  res.json(story);
});

io.on('connection', (socket) => {
  let currentStoryId: string | null = null;
  let currentUserName: string | null = null;

  socket.on('join-story', (data: { storyId: string; userName: string }) => {
    const { storyId, userName } = data;
    const story = stories.get(storyId);
    if (!story) {
      socket.emit('story-state', null);
      return;
    }
    currentStoryId = storyId;
    currentUserName = userName;
    socket.join(storyId);
    socket.emit('story-state', story);
    socket.emit('writer-status', {
      storyId,
      writerName: story.currentWriterName
    });
  });

  socket.on('request-lock', (data: { storyId: string; userId: string; userName: string }) => {
    const { storyId, userId, userName } = data;
    const story = stories.get(storyId);
    if (!story) return;

    const now = Date.now();
    if (story.lockExpiresAt && now < story.lockExpiresAt && story.currentWriterId !== userId) {
      socket.emit('lock-denied', { storyId, currentWriter: story.currentWriterName });
      return;
    }

    story.currentWriterId = userId;
    story.currentWriterName = userName;
    story.lockExpiresAt = now + LOCK_DURATION;
    socket.emit('lock-granted', { storyId, userId, expiresAt: story.lockExpiresAt });
    io.to(storyId).emit('writer-status', {
      storyId,
      writerName: userName
    });
  });

  socket.on('submit-paragraph', (data: { storyId: string; userId: string; content: string }) => {
    const { storyId, userId, content } = data;
    const story = stories.get(storyId);
    if (!story) return;
    if (story.currentWriterId !== userId) {
      socket.emit('lock-denied', { storyId, currentWriter: story.currentWriterName });
      return;
    }
    if (!content || content.length > 300) {
      return;
    }

    const now = Date.now();
    const durationMs = story.lastParagraphTime ? now - story.lastParagraphTime : 0;
    const paragraph: Paragraph = {
      id: uuidv4(),
      index: story.paragraphs.length,
      authorName: story.currentWriterName || '匿名',
      content,
      timestamp: now,
      durationMs
    };
    story.paragraphs.push(paragraph);
    story.lastParagraphTime = now;
    story.currentWriterId = null;
    story.currentWriterName = null;
    story.lockExpiresAt = null;

    io.to(storyId).emit('paragraph-added', { storyId, paragraph });
    io.to(storyId).emit('lock-released', { storyId });
    io.to(storyId).emit('writer-status', { storyId, writerName: null });
  };

  socket.on('disconnect', () => {
    if (currentStoryId) {
      const story = stories.get(currentStoryId);
      if (story && story.currentWriterId === socket.id) {
        story.currentWriterId = null;
        story.currentWriterName = null;
        story.lockExpiresAt = null;
        io.to(currentStoryId).emit('lock-released', { storyId: currentStoryId });
        io.to(currentStoryId).emit('writer-status', {
          storyId: currentStoryId,
          writerName: null
        });
      }
    }
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`故事接龙后端服务运行在 http://localhost:${PORT}`);
});
