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
  limits: { fileSize: 15 * 1024 * 1024 }
});

router.get('/', (req, res) => {
  res.json(dataStore.getWorks());
});

router.get('/:id', (req, res) => {
  const work = dataStore.getWorkById(req.params.id);
  if (!work) {
    return res.status(404).json({ error: 'Work not found' });
  }
  res.json(work);
});

router.post('/', upload.fields([{ name: 'audio', maxCount: 1 }, { name: 'cover', maxCount: 1 }]), (req, res) => {
  const { title, description, tags, duration } = req.body;
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  
  let audioUrl = '';
  let coverImage = '';
  
  if (files.audio && files.audio[0]) {
    const audioFile = files.audio[0];
    const ext = audioFile.originalname.split('.').pop();
    const filename = `work-${uuidv4()}.${ext}`;
    audioUrl = saveFile(audioFile.buffer, filename, 'work');
  }
  
  if (files.cover && files.cover[0]) {
    const coverFile = files.cover[0];
    const ext = coverFile.originalname.split('.').pop();
    const filename = `cover-${uuidv4()}.${ext}`;
    coverImage = saveFile(coverFile.buffer, filename, 'image');
  }
  
  const tagArray = typeof tags === 'string' ? tags.split(',') : (tags || []);
  
  const newWork = dataStore.addWork({
    title,
    description,
    coverImage,
    audioUrl,
    duration: parseInt(duration) || 0,
    tags: tagArray
  });
  
  res.status(201).json(newWork);
});

router.delete('/:id', (req, res) => {
  const work = dataStore.getWorkById(req.params.id);
  if (!work) {
    return res.status(404).json({ error: 'Work not found' });
  }
  
  if (work.audioUrl) deleteFile(work.audioUrl);
  if (work.coverImage) deleteFile(work.coverImage);
  
  const success = dataStore.deleteWork(req.params.id);
  if (success) {
    res.json({ message: 'Work deleted' });
  } else {
    res.status(404).json({ error: 'Work not found' });
  }
});

router.post('/:id/play', (req, res) => {
  const work = dataStore.incrementPlay(req.params.id);
  if (!work) {
    return res.status(404).json({ error: 'Work not found' });
  }
  res.json(work);
});

export default router;
