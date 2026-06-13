import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const exhibits = [
  {
    id: uuidv4(),
    name: '星辰碎片',
    description: '来自遥远星云的结晶，蕴含着宇宙诞生之初的微光能量。在黑暗中轻轻颤动，仿佛在诉说着光年之外的故事。',
    color: '#ff6b6b',
    rotationSpeed: 0.8,
  },
  {
    id: uuidv4(),
    name: '流光露珠',
    description: '凝结于黎明时分的神秘露珠，表面流转着永不重复的光影纹理。触碰时会泛起温柔的涟漪。',
    color: '#48dbfb',
    rotationSpeed: 1.2,
  },
  {
    id: uuidv4(),
    name: '梦境晶石',
    description: '据说可以映照出观察者内心最深处的梦境。晶石内部似乎藏着一片微缩的星空。',
    color: '#a29bfe',
    rotationSpeed: 0.5,
  },
  {
    id: uuidv4(),
    name: '琥珀之眼',
    description: '远古树脂凝结成的时光容器，封存着一只来自白垩纪的昆虫。琥珀表面泛着温暖的金色光芒。',
    color: '#feca57',
    rotationSpeed: 1.5,
  },
  {
    id: uuidv4(),
    name: '深海回音',
    description: '取自马里亚纳海沟最深处的奇异螺壳，靠近耳畔时能听到深海的低语和古老生物的歌声。',
    color: '#0abde3',
    rotationSpeed: 0.9,
  },
  {
    id: uuidv4(),
    name: '极光之羽',
    description: '来自北极冰原的神秘羽毛，在黑暗中会自行发出淡绿色的极光，仿佛带有极地的灵魂。',
    color: '#1dd1a1',
    rotationSpeed: 1.1,
  },
  {
    id: uuidv4(),
    name: '熔岩之心',
    description: '火山深处孕育的炽热宝石，触摸时能感受到地心的温度。内部流动着永不凝固的光流。',
    color: '#ff9f43',
    rotationSpeed: 0.7,
  },
  {
    id: uuidv4(),
    name: '量子之尘',
    description: '实验室中意外合成的微观粒子聚合体，在观测与未观测之间呈现出不同的色彩。',
    color: '#ee5a6f',
    rotationSpeed: 2.0,
  },
  {
    id: uuidv4(),
    name: '古木年轮',
    description: '千年古树的横截面切片，每一道年轮都记录着一段被遗忘的历史。轻触时会散发出淡淡的松香。',
    color: '#6ab04c',
    rotationSpeed: 0.6,
  },
  {
    id: uuidv4(),
    name: '月光棱镜',
    description: '仅在满月之夜才能激活的神秘棱镜，能将月光折射成七种不同颜色的光束。',
    color: '#c8d6e5',
    rotationSpeed: 1.3,
  },
  {
    id: uuidv4(),
    name: '时间沙漏',
    description: '沙粒永远不会漏完的微型沙漏，内部流动的不是沙子，而是凝固的光点。据说可以暂停时间三秒。',
    color: '#f368e0',
    rotationSpeed: 1.0,
  },
  {
    id: uuidv4(),
    name: '虚空之钥',
    description: '一把造型奇特的古老钥匙，没有人知道它能开启什么。但持有它的人会偶尔看到不存在的门。',
    color: '#5f27cd',
    rotationSpeed: 1.8,
  },
];

app.get('/api/exhibits', (_req, res) => {
  res.json(exhibits);
});

const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`[server] 光界·微物回廊 后端服务运行于 http://localhost:${PORT}`);
});
