import express from 'express';
import cors from 'cors';
import audioRoutes from './routes/audio';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use('/api', audioRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Voiceprint Archive server running on port ${PORT}`);
});
