import { Router } from 'express';
import { dataStore } from '../data/store';

const router = Router();

router.get('/', (req, res) => {
  res.json(dataStore.getEvents());
});

router.get('/:id', (req, res) => {
  const event = dataStore.getEventById(req.params.id);
  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }
  res.json(event);
});

router.post('/', (req, res) => {
  const { title, date, time, venue, venueUrl, price, ticketUrl, description } = req.body;
  const newEvent = dataStore.addEvent({
    title,
    date,
    time,
    venue,
    venueUrl,
    price,
    ticketUrl,
    description
  });
  res.status(201).json(newEvent);
});

router.delete('/:id', (req, res) => {
  const success = dataStore.deleteEvent(req.params.id);
  if (success) {
    res.json({ message: 'Event deleted' });
  } else {
    res.status(404).json({ error: 'Event not found' });
  }
});

export default router;
