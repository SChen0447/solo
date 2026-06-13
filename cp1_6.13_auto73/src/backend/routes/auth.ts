import { Router } from 'express';

const router = Router();

const ADMIN_PASSWORD = 'admin123';

router.post('/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.json({ success: true, token: 'mock-jwt-token' });
  } else {
    res.status(401).json({ success: false, error: 'Invalid password' });
  }
});

router.post('/logout', (req, res) => {
  res.json({ success: true });
});

export default router;
