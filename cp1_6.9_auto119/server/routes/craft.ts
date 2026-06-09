import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { craftArtwork } from '../services/craftService';
import * as artworkRepo from '../repositories/artworkRepository';

const router = Router();

router.post('/craft', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { materialIds } = req.body;
    if (!Array.isArray(materialIds)) {
      res.status(400).json({ error: 'materialIds必须是数组' });
      return;
    }
    const result = await craftArtwork(userId, materialIds);
    if (!result.success) {
      res.status(400).json(result);
      return;
    }
    res.json(result);
  } catch (err: any) {
    console.error('Craft error:', err);
    res.status(500).json({ error: err.message || '合成失败' });
  }
});

router.get('/artworks', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const artworks = await artworkRepo.getUserArtworks(userId);
    res.json(artworks);
  } catch (err) {
    console.error('Get artworks error:', err);
    res.status(500).json({ error: '获取作品失败' });
  }
});

export default router;
