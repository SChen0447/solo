import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import * as tradeService from '../services/tradeService';
import * as listingRepo from '../repositories/listingRepository';
import type { Server } from 'socket.io';

const router = Router();

let io: Server;

export function setSocketIoServer(server: Server) {
  io = server;
}

router.get('/market/listings', async (_req, res) => {
  try {
    const listings = await listingRepo.getAllListings();
    res.json(listings);
  } catch (err) {
    console.error('Get listings error:', err);
    res.status(500).json({ error: '获取市场列表失败' });
  }
});

router.post('/trade/list', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const username = req.username!;
    const { artworkId, price } = req.body;
    if (!artworkId || !price) {
      res.status(400).json({ error: '作品ID和价格不能为空' });
      return;
    }
    const listing = await tradeService.listArtwork(userId, username, artworkId, price);
    if (io) {
      io.emit('trade:new', { listing });
    }
    res.json({ listing });
  } catch (err: any) {
    console.error('List artwork error:', err);
    res.status(400).json({ error: err.message || '上架失败' });
  }
});

router.post('/trade/buy', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const buyerId = req.userId!;
    const { listingId } = req.body;
    if (!listingId) {
      res.status(400).json({ error: '交易ID不能为空' });
      return;
    }
    const result = await tradeService.buyArtwork(buyerId, listingId);
    if (!result.success) {
      res.status(400).json(result);
      return;
    }
    if (io) {
      io.emit('trade:sold', { listingId, buyerId });
      if (result.sellerId) {
        io.emit('user:update', {
          userId: result.sellerId,
          coins: result.sellerCoins,
        });
      }
      io.emit('user:update', {
        userId: buyerId,
        coins: result.buyerCoins,
      });
    }
    res.json(result);
  } catch (err: any) {
    console.error('Buy artwork error:', err);
    res.status(500).json({ error: err.message || '购买失败' });
  }
});

export default router;
