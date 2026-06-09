import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import './db';
import authRoutes from './routes/auth';
import blindboxRoutes from './routes/blindbox';
import craftRoutes from './routes/craft';
import tradeRoutes, { setSocketIoServer } from './routes/trade';
import { setupSocket } from './socket';

const app = express();
const server = createServer(app);
const io = setupSocket(server);
setSocketIoServer(io);

const PORT = 3001;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api', blindboxRoutes);
app.use('/api', craftRoutes);
app.use('/api', tradeRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
