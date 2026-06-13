import { Router } from 'express';
import multer from 'multer';
import { dataStore } from '../data/store';
import { saveFile, deleteFile, ensureUploadDirs } from '../services/fileService';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
ensureUploadDirs();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }
});

router.get('/', (req, res) => {
  res.json(dataStore.getProfile());
});

router.put('/', (req, res) => {
  const { name, bio, signature } = req.body;
  const updated = dataStore.updateProfile({ name, bio, signature });
  res.json(updated);
});

router.post('/cover', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const ext = req.file.originalname.split('.').pop();
  const filename = `cover-${uuidv4()}.${ext}`;
  const filePath = saveFile(req.file.buffer, filename, 'image');
  
  const profile = dataStore.getProfile();
  if (profile.coverImage) {
    deleteFile(profile.coverImage);
  }
  
  const updated = dataStore.updateProfile({ coverImage: filePath });
  res.json(updated);
});

router.delete('/cover', (req, res) => {
  const profile = dataStore.getProfile();
  if (profile.coverImage) {
    deleteFile(profile.coverImage);
  }
  const updated = dataStore.updateProfile({ coverImage: '' });
  res.json(updated);
});

export default router;
