import { Router, Request, Response } from 'express';

const router = Router();

interface CollectionItem {
  id: number;
  puzzleId: number;
  painting: string;
  description: string;
  unlockedAt: string;
}

let collections: CollectionItem[] = [];
let nextId = 1;

router.get('/', (_req: Request, res: Response) => {
  res.json({ collections });
});

router.post('/', (req: Request, res: Response) => {
  const { puzzleId, painting, description } = req.body;

  if (!puzzleId || !painting || !description) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  const exists = collections.find(c => c.puzzleId === puzzleId);
  if (exists) {
    res.json(exists);
    return;
  }

  const item: CollectionItem = {
    id: nextId++,
    puzzleId,
    painting,
    description,
    unlockedAt: new Date().toISOString()
  };

  collections.push(item);
  res.json(item);
});

router.delete('/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const index = collections.findIndex(c => c.id === id);

  if (index === -1) {
    res.status(404).json({ success: false });
    return;
  }

  collections.splice(index, 1);
  res.json({ success: true });
});

export default router;
