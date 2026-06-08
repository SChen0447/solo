import express, { type Request, type Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

interface Note {
  id: string;
  title: string;
  author: string;
  category: 'science' | 'history' | 'literature' | 'philosophy' | 'art';
  rating: number;
  content: string;
  excerpt: string;
  createdAt: number;
  updatedAt: number;
}

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

let notes: Note[] = [
  {
    id: uuidv4(),
    title: '三体',
    author: '刘慈欣',
    category: 'science',
    rating: 5,
    content: '## 读后感\n\n《三体》是一部震撼人心的科幻巨著。刘慈欣以其宏大的宇宙观和深刻的哲学思考，为读者展现了一个文明与文明之间碰撞的壮丽画卷。\n\n### 核心观点\n\n- 黑暗森林法则：宇宙就是一座黑暗森林，每个文明都是带枪的猎人\n- 技术爆炸：文明进步的速度和加速度不见得是一致的\n- 猜疑链：文明间无法判断彼此的善恶\n\n这本书不仅仅是一本科幻小说，更是对人类文明的深刻反思。',
    excerpt: '《三体》是一部震撼人心的科幻巨著。刘慈欣以其宏大的宇宙观和深刻的哲学思考...',
    createdAt: Date.now() - 86400000 * 10,
    updatedAt: Date.now() - 86400000 * 10,
  },
  {
    id: uuidv4(),
    title: '人类简史',
    author: '尤瓦尔·赫拉利',
    category: 'history',
    rating: 4,
    content: '## 从动物到上帝\n\n赫拉利以独特的视角重新审视了人类的发展历程。从认知革命到农业革命，再到科学革命，每一步都改变了人类的命运。\n\n**最精彩的观点：** 金钱是有史以来最普遍也最有效的互信系统。',
    excerpt: '赫拉利以独特的视角重新审视了人类的发展历程。从认知革命到农业革命...',
    createdAt: Date.now() - 86400000 * 8,
    updatedAt: Date.now() - 86400000 * 8,
  },
  {
    id: uuidv4(),
    title: '百年孤独',
    author: '加西亚·马尔克斯',
    category: 'literature',
    rating: 5,
    content: '## 魔幻现实主义的巅峰之作\n\n布恩迪亚家族七代人的传奇故事，在马孔多这个虚构的小镇上上演。马尔克斯用魔幻的笔触书写了拉美的历史与命运。\n\n> 多年以后，面对行刑队，奥雷里亚诺·布恩迪亚上校将会回想起父亲带他去见识冰块的那个遥远的下午。',
    excerpt: '布恩迪亚家族七代人的传奇故事，在马孔多这个虚构的小镇上上演...',
    createdAt: Date.now() - 86400000 * 6,
    updatedAt: Date.now() - 86400000 * 6,
  },
  {
    id: uuidv4(),
    title: '沉思录',
    author: '马可·奥勒留',
    category: 'philosophy',
    rating: 4,
    content: '## 一个罗马皇帝的哲学思考\n\n《沉思录》是古罗马皇帝马可·奥勒留写给自己的精神札记。斯多葛学派的智慧在这本书中得到了最完美的体现。\n\n- 不要浪费余生在对他人的揣测上\n- 接受命运安排的一切\n- 专注于当下，做好手头的事',
    excerpt: '《沉思录》是古罗马皇帝马可·奥勒留写给自己的精神札记。斯多葛学派的智慧...',
    createdAt: Date.now() - 86400000 * 5,
    updatedAt: Date.now() - 86400000 * 5,
  },
  {
    id: uuidv4(),
    title: '艺术的故事',
    author: '贡布里希',
    category: 'art',
    rating: 5,
    content: '## 从洞穴壁画到现代艺术\n\n贡布里希以清晰流畅的笔触，为读者讲述了艺术发展的完整历程。没有晦涩的术语，只有对美的真诚热爱。\n\n**经典语录：** 实际上没有艺术这种东西，只有艺术家而已。',
    excerpt: '贡布里希以清晰流畅的笔触，为读者讲述了艺术发展的完整历程...',
    createdAt: Date.now() - 86400000 * 4,
    updatedAt: Date.now() - 86400000 * 4,
  },
  {
    id: uuidv4(),
    title: '基地',
    author: '阿西莫夫',
    category: 'science',
    rating: 4,
    content: '## 心理史学的宏大构想\n\n阿西莫夫创造了心理史学这门虚构学科，用数学预测人类文明的未来。基地系列是科幻史上最宏大的叙事之一。\n\n### 核心概念\n\n1. 心理史学：预测群体行为
2. 谢顿计划：拯救银河文明
3. 基地：知识的灯塔',
    excerpt: '阿西莫夫创造了心理史学这门虚构学科，用数学预测人类文明的未来...',
    createdAt: Date.now() - 86400000 * 3,
    updatedAt: Date.now() - 86400000 * 3,
  },
  {
    id: uuidv4(),
    title: '万历十五年',
    author: '黄仁宇',
    category: 'history',
    rating: 4,
    content: '## 大历史观下的小切面\n\n黄仁宇以1587年为切入点，用大历史观重新审视明朝的衰落。看似平淡的一年，实则是历史的转折点。',
    excerpt: '黄仁宇以1587年为切入点，用大历史观重新审视明朝的衰落...',
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now() - 86400000 * 2,
  },
  {
    id: uuidv4(),
    title: '挪威的森林',
    author: '村上春树',
    category: 'literature',
    rating: 3,
    content: '## 青春的迷惘与成长\n\n村上春树以细腻的笔触书写了青春的爱与痛。渡边、直子、绿子，每个人都在寻找生命的出口。',
    excerpt: '村上春树以细腻的笔触书写了青春的爱与痛。渡边、直子、绿子...',
    createdAt: Date.now() - 86400000 * 1,
    updatedAt: Date.now() - 86400000 * 1,
  },
  {
    id: uuidv4(),
    title: '查拉图斯特拉如是说',
    author: '尼采',
    category: 'philosophy',
    rating: 5,
    content: '## 超人哲学的宣言\n\n尼采借查拉图斯特拉之口，宣告了上帝之死，呼唤超人的诞生。这是一本诗化的哲学著作，充满了激情与力量。\n\n> 那不能杀死我的，将使我更强大。',
    excerpt: '尼采借查拉图斯特拉之口，宣告了上帝之死，呼唤超人的诞生...',
    createdAt: Date.now() - 86400000 * 7,
    updatedAt: Date.now() - 86400000 * 7,
  },
  {
    id: uuidv4(),
    title: '梵高手稿',
    author: '文森特·梵高',
    category: 'art',
    rating: 4,
    content: '## 天才的内心世界\n\n梵高写给弟弟提奥的信件，展现了这位天才画家的真实内心。艺术的追求、生活的苦难、对自然的热爱，都在这些文字中流淌。',
    excerpt: '梵高写给弟弟提奥的信件，展现了这位天才画家的真实内心...',
    createdAt: Date.now() - 86400000 * 9,
    updatedAt: Date.now() - 86400000 * 9,
  },
  {
    id: uuidv4(),
    title: '时间简史',
    author: '史蒂芬·霍金',
    category: 'science',
    rating: 5,
    content: '## 探索宇宙的终极奥秘\n\n霍金用通俗的语言解释了宇宙的起源、时间的本质、黑洞的奥秘。这是科普写作的典范之作。',
    excerpt: '霍金用通俗的语言解释了宇宙的起源、时间的本质、黑洞的奥秘...',
    createdAt: Date.now() - 3600000,
    updatedAt: Date.now() - 3600000,
  },
  {
    id: uuidv4(),
    title: '明朝那些事儿',
    author: '当年明月',
    category: 'history',
    rating: 4,
    content: '## 通俗历史的巅峰\n\n当年明月以幽默风趣的笔调，讲述了明朝三百年的历史。正史也可以写得很好看。',
    excerpt: '当年明月以幽默风趣的笔调，讲述了明朝三百年的历史...',
    createdAt: Date.now() - 7200000,
    updatedAt: Date.now() - 7200000,
  },
];

function generateExcerpt(content: string): string {
  const plainText = content.replace(/[#>*_`\-]/g, '').replace(/\n+/g, ' ').trim();
  return plainText.length > 60 ? plainText.slice(0, 60) + '...' : plainText;
}

app.get('/api/notes', (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 12;
  const category = req.query.category as string;
  const search = req.query.search as string;

  let filteredNotes = [...notes];

  if (category && category !== 'all') {
    filteredNotes = filteredNotes.filter(note => note.category === category);
  }

  if (search) {
    const searchLower = search.toLowerCase();
    filteredNotes = filteredNotes.filter(
      note =>
        note.title.toLowerCase().includes(searchLower) ||
        note.author.toLowerCase().includes(searchLower)
    );
  }

  filteredNotes.sort((a, b) => b.createdAt - a.createdAt);

  const start = (page - 1) * limit;
  const paginatedNotes = filteredNotes.slice(start, start + limit);

  res.json({
    notes: paginatedNotes,
    total: filteredNotes.length,
    page,
    limit,
  });
});

app.get('/api/notes/:id', (req: Request, res: Response) => {
  const note = notes.find(n => n.id === req.params.id);
  if (!note) {
    res.status(404).json({ success: false, error: 'Note not found' });
    return;
  }
  res.json(note);
});

app.post('/api/notes', (req: Request, res: Response) => {
  const { title, author, category, rating, content } = req.body;

  if (!title || !author || !category || !content) {
    res.status(400).json({ success: false, error: 'Missing required fields' });
    return;
  }

  const newNote: Note = {
    id: uuidv4(),
    title,
    author,
    category,
    rating: rating || 0,
    content,
    excerpt: generateExcerpt(content),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  notes.unshift(newNote);
  res.status(201).json(newNote);
});

app.put('/api/notes/:id', (req: Request, res: Response) => {
  const noteIndex = notes.findIndex(n => n.id === req.params.id);
  if (noteIndex === -1) {
    res.status(404).json({ success: false, error: 'Note not found' });
    return;
  }

  const existingNote = notes[noteIndex];
  const updatedNote: Note = {
    ...existingNote,
    ...req.body,
    id: existingNote.id,
    createdAt: existingNote.createdAt,
    updatedAt: Date.now(),
    excerpt: req.body.content ? generateExcerpt(req.body.content) : existingNote.excerpt,
  };

  notes[noteIndex] = updatedNote;
  res.json(updatedNote);
});

app.delete('/api/notes/:id', (req: Request, res: Response) => {
  const noteIndex = notes.findIndex(n => n.id === req.params.id);
  if (noteIndex === -1) {
    res.status(404).json({ success: false, error: 'Note not found' });
    return;
  }

  notes.splice(noteIndex, 1);
  res.json({ success: true });
});

app.get('/api/stats', (_req: Request, res: Response) => {
  const total = notes.length;
  const avgRating = total > 0
    ? Math.round((notes.reduce((sum, n) => sum + n.rating, 0) / total) * 10) / 10
    : 0;

  const categoryCounts: Record<string, number> = {
    science: 0,
    history: 0,
    literature: 0,
    philosophy: 0,
    art: 0,
  };

  notes.forEach(note => {
    categoryCounts[note.category] = (categoryCounts[note.category] || 0) + 1;
  });

  res.json({
    total,
    avgRating,
    categoryCounts,
  });
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ success: true, message: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server ready on port ${PORT}`);
});

export default app;
