import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

export type 情绪标签 = '欢快' | '忧郁' | '激昂' | '宁静' | '思念' | '幻梦' | '炽热' | '空灵';

export interface 诗句 {
  id: string;
  文本: string;
  情绪: 情绪标签;
  用户ID: string;
  提交时间: number;
}

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

const 诗句库: 诗句[] = [
  {
    id: uuidv4(),
    文本: '月光洒在湖面，碎成星河万点',
    情绪: '幻梦',
    用户ID: 'seed-001',
    提交时间: Date.now() - 3600000
  },
  {
    id: uuidv4(),
    文本: '风吹过麦浪，金色的涟漪荡漾',
    情绪: '欢快',
    用户ID: 'seed-002',
    提交时间: Date.now() - 3000000
  },
  {
    id: uuidv4(),
    文本: '雨后的青石板路，映着霓虹的孤独',
    情绪: '忧郁',
    用户ID: 'seed-003',
    提交时间: Date.now() - 2400000
  },
  {
    id: uuidv4(),
    文本: '心跳如鼓，少年执剑向天涯',
    情绪: '激昂',
    用户ID: 'seed-004',
    提交时间: Date.now() - 1800000
  },
  {
    id: uuidv4(),
    文本: '禅房花木深，钟声绕白云',
    情绪: '宁静',
    用户ID: 'seed-005',
    提交时间: Date.now() - 1200000
  },
  {
    id: uuidv4(),
    文本: '家书抵万金，鸿雁几时归',
    情绪: '思念',
    用户ID: 'seed-006',
    提交时间: Date.now() - 600000
  },
  {
    id: uuidv4(),
    文本: '烈焰焚尽旧世界，凤凰浴火重生',
    情绪: '炽热',
    用户ID: 'seed-007',
    提交时间: Date.now() - 300000
  },
  {
    id: uuidv4(),
    文本: '竹林深处笛声起，一片空灵入云霄',
    情绪: '空灵',
    用户ID: 'seed-008',
    提交时间: Date.now() - 100000
  }
];

let 在线用户数 = Math.floor(Math.random() * 50) + 10;

setInterval(() => {
  const 变化 = Math.floor(Math.random() * 5) - 2;
  在线用户数 = Math.max(5, 在线用户数 + 变化);
}, 5000);

app.get('/诗句', (_req, res) => {
  const 排序后 = [...诗句库].sort((a, b) => b.提交时间 - a.提交时间);
  res.json(排序后);
});

app.post('/诗句', (req, res) => {
  try {
    const { 文本, 情绪, 用户ID } = req.body;

    if (!文本 || typeof 文本 !== 'string') {
      return res.status(400).json({ 错误: '诗句文本不能为空' });
    }

    if (文本.length > 50) {
      return res.status(400).json({ 错误: '诗句文本不能超过50个字' });
    }

    const 有效情绪: 情绪标签[] = ['欢快', '忧郁', '激昂', '宁静', '思念', '幻梦', '炽热', '空灵'];
    if (!情绪 || !有效情绪.includes(情绪)) {
      return res.status(400).json({ 错误: '无效的情绪标签' });
    }

    const 新诗句: 诗句 = {
      id: uuidv4(),
      文本: 文本.trim(),
      情绪,
      用户ID: 用户ID || uuidv4(),
      提交时间: Date.now()
    };

    诗句库.push(新诗句);
    res.status(201).json(新诗句);
  } catch (错误) {
    res.status(500).json({ 错误: '服务器内部错误' });
  }
});

app.get('/在线', (_req, res) => {
  res.json({ 在线用户数 });
});

app.listen(PORT, () => {
  console.log(`\n  碎光·诗册 服务器已启动`);
  console.log(`  本地地址: http://localhost:${PORT}`);
  console.log(`  诗句接口: GET/POST http://localhost:${PORT}/诗句`);
  console.log(`  在线接口: GET http://localhost:${PORT}/在线\n`);
});

export default app;
