import express from 'express';
import cors from 'cors';
import path from 'path';
import profileRoutes from './routes/profile';
import worksRoutes from './routes/works';
import eventsRoutes from './routes/events';
import statsRoutes from './routes/stats';
import authRoutes from './routes/auth';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/profile', profileRoutes);
app.use('/api/works', worksRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/auth', authRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
