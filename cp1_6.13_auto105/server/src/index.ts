import express from 'express';
import cors from 'cors';
import path from 'path';
import uploadRouter from './routes/upload';
import menuRouter from './routes/menu';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/upload', uploadRouter);
app.use('/api/menu', menuRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '食光·旬味后端服务运行正常' });
});

app.listen(PORT, () => {
  console.log(`🚀 食光·旬味后端服务运行在 http://localhost:${PORT}`);
});

export default app;
