import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { openBox } from '../services/materialService';
import * as materialRepo from '../repositories/materialRepository';

const router = Router();

router.post('/open-box', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const result = await openBox(userId);
    res.json(result);
  } catch (err: any) {
    console.error('Open box error:', err);
    res.status(400).json({ error: err.message || '开箱失败' });
  }
});

router.get('/materials', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const materials = await materialRepo.getUserMaterials(userId);
    res.json(materials);
  } catch (err) {
    console.error('Get materials error:', err);
    res.status(500).json({ error: '获取材料失败' });
  }
});

export default router;
