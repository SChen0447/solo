import express from 'express';
import cors from 'cors';
import decodeRouter from './routes/decode';

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

app.use('/api/decode', decodeRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: '尘封·书简解密服务已启动' });
});

app.listen(PORT, () => {
  console.log(`[Server] 尘封·书简解密后端服务运行在 http://localhost:${PORT}`);
});
