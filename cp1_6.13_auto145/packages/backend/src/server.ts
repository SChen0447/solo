import express from 'express';
import cors from 'cors';
import puzzleRouter from './routes/puzzle';
import collectionRouter from './routes/collection';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.use('/api/puzzles', puzzleRouter);
app.use('/api/collections', collectionRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
