import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { PoemSegment, PoemChain, CreatePoemRequest, ExtendPoemRequest } from './types';

const router = Router();

let poemChains: Map<string, PoemChain> = new Map();
let poemSegments: Map<string, PoemSegment> = new Map();

const ancientNames = [
  '云中子', '水边客', '山间人', '月下翁', '松间士',
  '竹里居', '梅边隐', '兰若生', '菊畔游', '莲间坐',
  '枫亭客', '桃溪人', '柳岸生', '梨园客', '杏园翁',
  '薇歌子', '芷岸人', '汀洲客', '烟波钓徒', '云水闲人'
];

const inspirations = [
  { type: 'reference' as const, source: '李商隐《锦瑟》', originalText: '锦瑟无端五十弦，一弦一柱思华年。庄生晓梦迷蝴蝶，望帝春心托杜鹃。' },
  { type: 'reference' as const, source: '李白《静夜思》', originalText: '床前明月光，疑是地上霜。举头望明月，低头思故乡。' },
  { type: 'reference' as const, source: '杜甫《春望》', originalText: '国破山河在，城春草木深。感时花溅泪，恨别鸟惊心。' },
  { type: 'reference' as const, source: '苏轼《水调歌头》', originalText: '明月几时有，把酒问青天。不知天上宫阙，今夕是何年。' },
  { type: 'reference' as const, source: '李清照《如梦令》', originalText: '常记溪亭日暮，沉醉不知归路。兴尽晚回舟，误入藕花深处。' },
  { type: 'original' as const },
  { type: 'original' as const },
  { type: 'original' as const },
];

const samplePoems = [
  {
    content: '清风徐来水波兴，\n一叶扁舟任纵横。',
    author: ancientNames[0],
    inspiration: inspirations[5]
  },
  {
    content: '锦瑟华年谁与度，\n月桥花院，琐窗朱户。',
    author: ancientNames[1],
    inspiration: inspirations[0]
  },
  {
    content: '床前月光如霜冷，\n客子归心似箭飞。',
    author: ancientNames[2],
    inspiration: inspirations[1]
  },
  {
    content: '国破山河依旧在，\n城春草木又一新。',
    author: ancientNames[3],
    inspiration: inspirations[2]
  },
  {
    content: '明月几时有，\n把酒问青天。',
    author: ancientNames[4],
    inspiration: inspirations[3]
  },
  {
    content: '常记溪亭日暮，\n沉醉不知归路。',
    author: ancientNames[5],
    inspiration: inspirations[4]
  },
  {
    content: '竹外桃花三两枝，\n春江水暖鸭先知。',
    author: ancientNames[6],
    inspiration: inspirations[6]
  },
  {
    content: '接天莲叶无穷碧，\n映日荷花别样红。',
    author: ancientNames[7],
    inspiration: inspirations[7]
  },
];

function initializeSampleData() {
  samplePoems.forEach((poem, index) => {
    const chainId = uuidv4();
    const segmentId = uuidv4();
    const now = Date.now() - index * 3600000;

    const segment: PoemSegment = {
      id: segmentId,
      content: poem.content,
      author: poem.author,
      createdAt: now,
      parentId: null,
      chainId: chainId,
      inspiration: poem.inspiration
    };

    const chain: PoemChain = {
      id: chainId,
      segments: [segment],
      createdAt: now,
      inspiration: poem.inspiration
    };

    poemSegments.set(segmentId, segment);
    poemChains.set(chainId, chain);

    if (index < 3) {
      for (let i = 0; i < 2; i++) {
        const extSegmentId = uuidv4();
        const extSegment: PoemSegment = {
          id: extSegmentId,
          content: `续写诗句${i + 1}：\n诗情画意满人间，\n风月无边醉客颜。`,
          author: ancientNames[8 + i],
          createdAt: now + (i + 1) * 1800000,
          parentId: chain.segments[chain.segments.length - 1].id,
          chainId: chainId,
          inspiration: { type: 'original' }
        };
        poemSegments.set(extSegmentId, extSegment);
        chain.segments.push(extSegment);
      }
    }
  });
}

initializeSampleData();

router.get('/poems', (_req: Request, res: Response) => {
  const chains = Array.from(poemChains.values())
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(chain => ({
      id: chain.id,
      firstSegment: chain.segments[0],
      segmentCount: chain.segments.length,
      createdAt: chain.createdAt,
      inspiration: chain.inspiration
    }));
  res.json(chains);
});

router.post('/poems', (req: Request<{}, {}, CreatePoemRequest>, res: Response) => {
  const { content, author, inspiration } = req.body;

  if (!content || !author) {
    return res.status(400).json({ error: '内容和作者不能为空' });
  }

  const chainId = uuidv4();
  const segmentId = uuidv4();
  const now = Date.now();

  const segment: PoemSegment = {
    id: segmentId,
    content,
    author,
    createdAt: now,
    parentId: null,
    chainId,
    inspiration
  };

  const chain: PoemChain = {
    id: chainId,
    segments: [segment],
    createdAt: now,
    inspiration
  };

  poemSegments.set(segmentId, segment);
  poemChains.set(chainId, chain);

  res.status(201).json({
    chain,
    segment
  });
});

router.get('/poems/:id/chain', (req: Request<{ id: string }>, res: Response) => {
  const chain = poemChains.get(req.params.id);

  if (!chain) {
    return res.status(404).json({ error: '诗歌链不存在' });
  }

  res.json({
    ...chain,
    segments: chain.segments.sort((a, b) => a.createdAt - b.createdAt)
  });
});

router.post('/poems/:id/extend', (req: Request<{ id: string }, {}, ExtendPoemRequest>, res: Response) => {
  const chain = poemChains.get(req.params.id);

  if (!chain) {
    return res.status(404).json({ error: '诗歌链不存在' });
  }

  const { content, author } = req.body;

  if (!content || !author) {
    return res.status(400).json({ error: '内容和作者不能为空' });
  }

  const lastSegment = chain.segments[chain.segments.length - 1];
  const segmentId = uuidv4();
  const now = Date.now();

  const segment: PoemSegment = {
    id: segmentId,
    content,
    author,
    createdAt: now,
    parentId: lastSegment.id,
    chainId: chain.id,
    inspiration: { type: 'original' }
  };

  poemSegments.set(segmentId, segment);
  chain.segments.push(segment);

  res.status(201).json(segment);
});

export default router;
