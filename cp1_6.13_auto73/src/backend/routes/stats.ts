import { Router } from 'express';
import { dataStore } from '../data/store';

const router = Router();

router.get('/daily', (req, res) => {
  res.json(dataStore.getDailyStats());
});

router.get('/summary', (req, res) => {
  const works = dataStore.getWorks();
  const totalPlays = works.reduce((sum, w) => sum + w.plays, 0);
  const totalWorks = works.length;
  const totalEvents = dataStore.getEvents().length;
  
  res.json({
    totalPlays,
    totalWorks,
    totalEvents
  });
});

export default router;
