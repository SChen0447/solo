import express from 'express';
import cors from 'cors';
import routes from './routes';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.use('/api/bottles', routes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
