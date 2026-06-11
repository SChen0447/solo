import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

let boards = [];
let cards = [];

const defaultBoardId = uuidv4();

boards.push({
  id: defaultBoardId,
  name: '我的灵感',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
});

const sampleCards = [
  {
    id: uuidv4(),
    title: '创意想法收集',
    description: '记录日常的灵感碎片，随时补充新的想法',
    color: '#DBEAFE',
    tags: ['创意'],
    imageUrl: '',
    linkUrl: '',
    order: 0,
    boardId: defaultBoardId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: uuidv4(),
    title: '设计参考素材',
    description: '收集优秀的设计案例和视觉参考',
    color: '#FCE7F3',
    tags: ['参考'],
    imageUrl: '',
    linkUrl: '',
    order: 1,
    boardId: defaultBoardId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: uuidv4(),
    title: '本周待办事项',
    description: '整理本周需要完成的任务清单',
    color: '#FEF3C7',
    tags: ['待办'],
    imageUrl: '',
    linkUrl: '',
    order: 2,
    boardId: defaultBoardId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

cards.push(...sampleCards);

app.get('/api/boards', (req, res) => {
  res.json(boards);
});

app.post('/api/boards', (req, res) => {
  const { name } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: '看板名称不能为空' });
  }
  
  const newBoard = {
    id: uuidv4(),
    name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  boards.push(newBoard);
  res.status(201).json(newBoard);
});

app.get('/api/boards/:boardId/cards', (req, res) => {
  const { boardId } = req.params;
  const boardCards = cards
    .filter(card => card.boardId === boardId)
    .sort((a, b) => a.order - b.order);
  
  res.json(boardCards);
});

app.post('/api/cards', (req, res) => {
  const { title, description, color, tags, imageUrl, linkUrl, boardId } = req.body;
  
  if (!title || !boardId) {
    return res.status(400).json({ error: '标题和看板ID不能为空' });
  }
  
  const boardCards = cards.filter(card => card.boardId === boardId);
  const maxOrder = boardCards.length > 0 
    ? Math.max(...boardCards.map(c => c.order)) 
    : -1;
  
  const newCard = {
    id: uuidv4(),
    title,
    description: description || '',
    color: color || '#FEF3C7',
    tags: tags || [],
    imageUrl: imageUrl || '',
    linkUrl: linkUrl || '',
    order: maxOrder + 1,
    boardId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  cards.push(newCard);
  res.status(201).json(newCard);
});

app.put('/api/cards/:id', (req, res) => {
  const { id } = req.params;
  const cardIndex = cards.findIndex(card => card.id === id);
  
  if (cardIndex === -1) {
    return res.status(404).json({ error: '卡片不存在' });
  }
  
  const updatedCard = {
    ...cards[cardIndex],
    ...req.body,
    id: cards[cardIndex].id,
    boardId: cards[cardIndex].boardId,
    createdAt: cards[cardIndex].createdAt,
    updatedAt: new Date().toISOString()
  };
  
  cards[cardIndex] = updatedCard;
  res.json(updatedCard);
});

app.delete('/api/cards/:id', (req, res) => {
  const { id } = req.params;
  const cardIndex = cards.findIndex(card => card.id === id);
  
  if (cardIndex === -1) {
    return res.status(404).json({ error: '卡片不存在' });
  }
  
  cards.splice(cardIndex, 1);
  res.json({ success: true });
});

app.put('/api/cards/:id/reorder', (req, res) => {
  const { id } = req.params;
  const { newOrder } = req.body;
  const cardIndex = cards.findIndex(card => card.id === id);
  
  if (cardIndex === -1) {
    return res.status(404).json({ error: '卡片不存在' });
  }
  
  const card = cards[cardIndex];
  const boardCards = cards
    .filter(c => c.boardId === card.boardId && c.id !== id)
    .sort((a, b) => a.order - b.order);
  
  const newOrderNum = Math.max(0, Math.min(newOrder, boardCards.length));
  
  boardCards.splice(newOrderNum, 0, card);
  
  boardCards.forEach((c, index) => {
    const idx = cards.findIndex(card => card.id === c.id);
    if (idx !== -1) {
      cards[idx].order = index;
      cards[idx].updatedAt = new Date().toISOString();
    }
  });
  
  const updatedCard = cards.find(c => c.id === id);
  res.json(updatedCard);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
