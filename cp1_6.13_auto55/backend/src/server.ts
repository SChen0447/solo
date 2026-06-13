import express from 'express';
import cors from 'cors';
import routes from './routes';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.use('/api', routes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 诗笺传情后端服务已启动: http://localhost:${PORT}`);
  console.log(`📚 API 文档:`);
  console.log(`   GET    /api/poems          - 获取诗歌列表`);
  console.log(`   POST   /api/poems          - 创建新诗`);
  console.log(`   GET    /api/poems/:id/chain - 获取诗歌链`);
  console.log(`   POST   /api/poems/:id/extend - 续写诗歌`);
});
