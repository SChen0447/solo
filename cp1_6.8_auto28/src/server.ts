import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import type { CardData } from './types/card';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const cardsStore = new Map<string, CardData>();

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.post('/api/cards', (req, res) => {
  try {
    const cardData: Omit<CardData, 'id' | 'createdAt'> = req.body;
    const id = uuidv4();
    const newCard: CardData = {
      ...cardData,
      id,
      createdAt: Date.now(),
    };
    cardsStore.set(id, newCard);
    const shareUrl = `${req.protocol}://${req.get('host')}/card/${id}`;
    res.status(201).json({
      ...newCard,
      shareUrl,
    });
  } catch (error) {
    console.error('Error creating card:', error);
    res.status(500).json({ error: 'Failed to create card' });
  }
});

app.get('/api/cards/:id', (req, res) => {
  try {
    const { id } = req.params;
    const card = cardsStore.get(id);
    if (!card) {
      res.status(404).json({ error: 'Card not found' });
      return;
    }
    res.json(card);
  } catch (error) {
    console.error('Error getting card:', error);
    res.status(500).json({ error: 'Failed to get card' });
  }
});

app.put('/api/cards/:id', (req, res) => {
  try {
    const { id } = req.params;
    const existingCard = cardsStore.get(id);
    if (!existingCard) {
      res.status(404).json({ error: 'Card not found' });
      return;
    }
    const updatedCard: CardData = {
      ...existingCard,
      ...req.body,
      id,
    };
    cardsStore.set(id, updatedCard);
    res.json(updatedCard);
  } catch (error) {
    console.error('Error updating card:', error);
    res.status(500).json({ error: 'Failed to update card' });
  }
});

app.delete('/api/cards/:id', (req, res) => {
  try {
    const { id } = req.params;
    const deleted = cardsStore.delete(id);
    if (!deleted) {
      res.status(404).json({ error: 'Card not found' });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting card:', error);
    res.status(500).json({ error: 'Failed to delete card' });
  }
});

app.get('/api/cards', (req, res) => {
  const cards = Array.from(cardsStore.values());
  res.json(cards);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`API: http://localhost:${PORT}/api`);
});

export default app;
