import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import type { Book, Match, Message, User } from './types';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const currentUserId = 'user-001';

const mockUsers: User[] = [
  { id: 'user-001', name: '爱书人', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user1' },
  { id: 'user-002', name: '书香门第', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user2' },
  { id: 'user-003', name: '书虫小明', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user3' },
];

const mockBooks: Book[] = [
  {
    id: uuidv4(),
    title: '百年孤独',
    author: '加西亚·马尔克斯',
    year: 1967,
    coverUrl: 'https://picsum.photos/seed/book1/400/600',
    description: '《百年孤独》是魔幻现实主义文学的代表作，描写了布恩迪亚家族七代人的传奇故事，以及加勒比海沿岸小镇马孔多的百年兴衰。',
    status: 'available',
    ownerId: 'user-002',
    ownerName: '书香门第',
    ownerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user2',
  },
  {
    id: uuidv4(),
    title: '三体',
    author: '刘慈欣',
    year: 2008,
    coverUrl: 'https://picsum.photos/seed/book2/400/600',
    description: '文化大革命如火如荼进行的同时，军方探寻外星文明的绝秘计划"红岸工程"取得了突破性进展。',
    status: 'available',
    ownerId: 'user-003',
    ownerName: '书虫小明',
    ownerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user3',
  },
  {
    id: uuidv4(),
    title: '活着',
    author: '余华',
    year: 1993,
    coverUrl: 'https://picsum.photos/seed/book3/400/600',
    description: '讲述了农村人福贵悲惨的人生遭遇。福贵本是个阔少爷，可他嗜赌如命，终于赌光了家业。',
    status: 'available',
    ownerId: 'user-002',
    ownerName: '书香门第',
    ownerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user2',
  },
  {
    id: uuidv4(),
    title: '围城',
    author: '钱钟书',
    year: 1947,
    coverUrl: 'https://picsum.photos/seed/book4/400/600',
    description: '《围城》是钱钟书所著的长篇小说，是中国现代文学史上一部风格独特的讽刺小说，被誉为"新儒林外史"。',
    status: 'exchanged',
    ownerId: 'user-003',
    ownerName: '书虫小明',
    ownerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user3',
  },
  {
    id: uuidv4(),
    title: '红楼梦',
    author: '曹雪芹',
    year: 1791,
    coverUrl: 'https://picsum.photos/seed/book5/400/600',
    description: '《红楼梦》是中国古典四大名著之首，以贾宝玉、林黛玉、薛宝钗的爱情婚姻悲剧为主线，展现了封建社会的全景图。',
    status: 'available',
    ownerId: 'user-001',
    ownerName: '爱书人',
    ownerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user1',
  },
  {
    id: uuidv4(),
    title: '平凡的世界',
    author: '路遥',
    year: 1986,
    coverUrl: 'https://picsum.photos/seed/book6/400/600',
    description: '该书以中国70年代中期到80年代中期十年间为背景，通过复杂的矛盾纠葛，以孙少安和孙少平两兄弟为中心，刻画了当时社会各阶层众多普通人的形象。',
    status: 'available',
    ownerId: 'user-001',
    ownerName: '爱书人',
    ownerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user1',
  },
  {
    id: uuidv4(),
    title: '挪威的森林',
    author: '村上春树',
    year: 1987,
    coverUrl: 'https://picsum.photos/seed/book7/400/600',
    description: '《挪威的森林》是日本作家村上春树于1987年所著的一部长篇爱情小说。故事讲述主角纠缠在情绪不稳定且患有精神疾病的直子和开朗活泼的小林绿子之间，展开了自我成长的旅程。',
    status: 'available',
    ownerId: 'user-002',
    ownerName: '书香门第',
    ownerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user2',
  },
  {
    id: uuidv4(),
    title: '白夜行',
    author: '东野圭吾',
    year: 1999,
    coverUrl: 'https://picsum.photos/seed/book8/400/600',
    description: '《白夜行》是日本作家东野圭吾创作的长篇小说，也是其代表作。故事围绕着一对有着不同寻常情愫的小学生展开。',
    status: 'available',
    ownerId: 'user-003',
    ownerName: '书虫小明',
    ownerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user3',
  },
];

const mockMatches: Match[] = [
  {
    id: uuidv4(),
    fromUserId: 'user-001',
    toUserId: 'user-002',
    fromBookId: mockBooks[4].id,
    toBookId: mockBooks[0].id,
    status: 'accepted',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

const mockMessages: Message[] = [
  {
    id: uuidv4(),
    matchId: mockMatches[0].id,
    content: '你好，我想用《红楼梦》换你的《百年孤独》',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    senderId: 'user-001',
    senderName: '爱书人',
    senderAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user1',
    isRead: true,
  },
  {
    id: uuidv4(),
    matchId: mockMatches[0].id,
    content: '好的，我正好想读《红楼梦》！我们约在哪里交换呢？',
    timestamp: new Date(Date.now() - 80000000).toISOString(),
    senderId: 'user-002',
    senderName: '书香门第',
    senderAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user2',
    isRead: true,
  },
  {
    id: uuidv4(),
    matchId: mockMatches[0].id,
    content: '周末在市中心的咖啡馆可以吗？',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    senderId: 'user-001',
    senderName: '爱书人',
    senderAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user1',
    isRead: false,
  },
];

let books: Book[] = [...mockBooks];
let matches: Match[] = [...mockMatches];
let messages: Message[] = [...mockMessages];

app.get('/api/user', (req, res) => {
  const user = mockUsers.find(u => u.id === currentUserId);
  res.json(user);
});

app.get('/api/books', (req, res) => {
  const { title, author, year, ownerId } = req.query;
  
  let filteredBooks = [...books];
  
  if (title && typeof title === 'string') {
    filteredBooks = filteredBooks.filter(b => 
      b.title.toLowerCase().includes(title.toLowerCase())
    );
  }
  
  if (author && typeof author === 'string') {
    filteredBooks = filteredBooks.filter(b => 
      b.author.toLowerCase().includes(author.toLowerCase())
    );
  }
  
  if (year && typeof year === 'string') {
    filteredBooks = filteredBooks.filter(b => 
      b.year === parseInt(year)
    );
  }
  
  if (ownerId && typeof ownerId === 'string') {
    filteredBooks = filteredBooks.filter(b => b.ownerId === ownerId);
  }
  
  setTimeout(() => {
    res.json(filteredBooks);
  }, 300);
});

app.get('/api/books/:id', (req, res) => {
  const book = books.find(b => b.id === req.params.id);
  if (!book) {
    return res.status(404).json({ error: 'Book not found' });
  }
  res.json(book);
});

app.post('/api/books', (req, res) => {
  const { title, author, year, coverUrl, description } = req.body;
  
  if (!title || !author || !year) {
    return res.status(400).json({ error: '缺少必填字段' });
  }
  
  const currentUser = mockUsers.find(u => u.id === currentUserId)!;
  
  const newBook: Book = {
    id: uuidv4(),
    title,
    author,
    year: parseInt(year),
    coverUrl: coverUrl || `https://picsum.photos/seed/${uuidv4()}/400/600`,
    description: description || '',
    status: 'available',
    ownerId: currentUserId,
    ownerName: currentUser.name,
    ownerAvatar: currentUser.avatar,
  };
  
  books.unshift(newBook);
  
  setTimeout(() => {
    res.status(201).json(newBook);
  }, 500);
});

app.get('/api/matches', (req, res) => {
  const userMatches = matches.filter(m => 
    m.fromUserId === currentUserId || m.toUserId === currentUserId
  );
  
  const matchesWithDetails = userMatches.map(match => {
    const fromBook = books.find(b => b.id === match.fromBookId);
    const toBook = books.find(b => b.id === match.toBookId);
    const fromUser = mockUsers.find(u => u.id === match.fromUserId);
    const toUser = mockUsers.find(u => u.id === match.toUserId);
    const lastMessage = messages
      .filter(msg => msg.matchId === match.id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
    
    const otherUser = match.fromUserId === currentUserId ? toUser : fromUser;
    
    return {
      ...match,
      fromBook,
      toBook,
      fromUser,
      toUser,
      otherUser,
      lastMessage,
    };
  });
  
  res.json(matchesWithDetails);
});

app.post('/api/matches', (req, res) => {
  const { toUserId, fromBookId, toBookId } = req.body;
  
  if (!toUserId || !fromBookId || !toBookId) {
    return res.status(400).json({ error: '缺少必填字段' });
  }
  
  const newMatch: Match = {
    id: uuidv4(),
    fromUserId: currentUserId,
    toUserId,
    fromBookId,
    toBookId,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  
  matches.push(newMatch);
  
  const currentUser = mockUsers.find(u => u.id === currentUserId)!;
  const toUser = mockUsers.find(u => u.id === toUserId)!;
  const fromBook = books.find(b => b.id === fromBookId)!;
  const toBook = books.find(b => b.id === toBookId)!;
  
  const systemMessageToReceiver: Message = {
    id: uuidv4(),
    matchId: newMatch.id,
    content: `${currentUser.name} 想用水《${fromBook.title}》交换你的《${toBook.title}》，是否同意？`,
    timestamp: new Date().toISOString(),
    senderId: currentUserId,
    senderName: currentUser.name,
    senderAvatar: currentUser.avatar,
    isRead: false,
  };
  
  const systemMessageToSender: Message = {
    id: uuidv4(),
    matchId: newMatch.id,
    content: `您已发起与 ${toUser.name} 的交换请求，等待对方确认。`,
    timestamp: new Date(Date.now() + 1000).toISOString(),
    senderId: toUserId,
    senderName: '系统通知',
    senderAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=system',
    isRead: false,
  };
  
  messages.push(systemMessageToReceiver, systemMessageToSender);
  
  res.status(201).json({ ...newMatch, fromBook, toBook });
});

app.get('/api/matches/:id/messages', (req, res) => {
  const matchId = req.params.id;
  const matchMessages = messages
    .filter(m => m.matchId === matchId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  
  matchMessages.forEach(msg => {
    if (msg.senderId !== currentUserId) {
      msg.isRead = true;
    }
  });
  
  res.json(matchMessages);
});

app.post('/api/matches/:id/messages', (req, res) => {
  const matchId = req.params.id;
  const { content } = req.body;
  
  if (!content) {
    return res.status(400).json({ error: '消息内容不能为空' });
  }
  
  const match = matches.find(m => m.id === matchId);
  if (!match) {
    return res.status(404).json({ error: '匹配不存在' });
  }
  
  const currentUser = mockUsers.find(u => u.id === currentUserId)!;
  
  const newMessage: Message = {
    id: uuidv4(),
    matchId,
    content,
    timestamp: new Date().toISOString(),
    senderId: currentUserId,
    senderName: currentUser.name,
    senderAvatar: currentUser.avatar,
    isRead: false,
  };
  
  messages.push(newMessage);
  
  setTimeout(() => {
    res.status(201).json(newMessage);
  }, 300);
});

app.get('/api/messages/unread-count', (req, res) => {
  const unreadCount = messages.filter(
    m => m.senderId !== currentUserId && !m.isRead
  ).length;
  res.json({ count: unreadCount });
});

app.listen(PORT, () => {
  console.log(`书香流转服务端运行在 http://localhost:${PORT}`);
});
