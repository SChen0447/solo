import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  generateFingerprint,
  getFingerprint,
  getAllFingerprintThumbnails,
  checkGuess,
  likeFingerprint,
  getProfileData,
  seedInitialData,
} from '../services/fingerprintGenerator';
import { GuessRequest } from '../types';

const router = Router();

const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

seedInitialData();

router.post('/upload-voice', upload.single('audio'), (_req: Request, res: Response) => {
  try {
    const { text } = _req.body;
    const fingerprint = generateFingerprint(_req.file?.buffer, text);
    res.json({ fingerprint });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to process audio' });
  }
});

router.post('/guess', (req: Request<{}, {}, GuessRequest>, res: Response) => {
  try {
    const { fingerprintId, selectedOption } = req.body;
    const result = checkGuess(fingerprintId, selectedOption);
    res.json(result);
  } catch (error) {
    console.error('Guess error:', error);
    res.status(500).json({ error: 'Failed to check guess' });
  }
});

router.get('/fingerprints', (_req: Request, res: Response) => {
  try {
    const thumbnails = getAllFingerprintThumbnails();
    res.json({ fingerprints: thumbnails });
  } catch (error) {
    console.error('Get fingerprints error:', error);
    res.status(500).json({ error: 'Failed to get fingerprints' });
  }
});

router.get('/fingerprint/:id', (req: Request, res: Response) => {
  try {
    const fp = getFingerprint(req.params.id);
    if (!fp) {
      res.status(404).json({ error: 'Fingerprint not found' });
      return;
    }
    res.json({ fingerprint: fp });
  } catch (error) {
    console.error('Get fingerprint error:', error);
    res.status(500).json({ error: 'Failed to get fingerprint' });
  }
});

router.get('/profile', (_req: Request, res: Response) => {
  try {
    const profile = getProfileData();
    res.json(profile);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

router.post('/like/:id', (req: Request, res: Response) => {
  try {
    const success = likeFingerprint(req.params.id);
    if (!success) {
      res.status(404).json({ error: 'Fingerprint not found' });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Like error:', error);
    res.status(500).json({ error: 'Failed to like' });
  }
});

export default router;
