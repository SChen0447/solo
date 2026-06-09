import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const UPLOAD_DIR = path.join(__dirname, 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use('/api/files', express.static(UPLOAD_DIR));

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const allowed = ['.wav', '.mp3', '.ogg', '.m4a'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('仅支持 .wav .mp3 .ogg .m4a 音频文件'));
  },
  limits: { fileSize: 200 * 1024 * 1024 },
});

const fileRegistry = new Map();

app.post('/api/upload', upload.single('audio'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '未接收到文件' });
  }
  const fileId = path.basename(req.file.filename, path.extname(req.file.filename));
  const info = {
    fileId,
    filename: req.file.originalname,
    storedName: req.file.filename,
    url: `/api/files/${req.file.filename}`,
    size: req.file.size,
    uploadedAt: Date.now(),
  };
  fileRegistry.set(fileId, info);
  res.json({
    fileId: info.fileId,
    filename: info.filename,
    url: info.url,
    size: info.size,
  });
});

app.get('/api/tracks', (_req, res) => {
  const list = Array.from(fileRegistry.values()).map(({ storedName, ...rest }) => rest);
  res.json(list);
});

app.delete('/api/tracks/:id', (req, res) => {
  const info = fileRegistry.get(req.params.id);
  if (!info) return res.status(404).json({ error: 'File not found' });
  const filePath = path.join(UPLOAD_DIR, info.storedName);
  fs.unlink(filePath, (err) => {
    if (err && err.code !== 'ENOENT') {
      return res.status(500).json({ error: '删除失败', detail: err.message });
    }
    fileRegistry.delete(req.params.id);
    res.json({ success: true, fileId: req.params.id });
  });
});

app.post('/api/export', async (req, res) => {
  const { tracks = [], masterVolume = 80 } = req.body || {};
  const validTracks = tracks.filter(
    (t) => t && t.fileId && !t.muted && fileRegistry.has(t.fileId)
  );

  if (validTracks.length === 0) {
    return res.status(400).json({ error: '没有可导出的音轨' });
  }

  res.setHeader('Content-Type', 'audio/wav');
  res.setHeader('Content-Disposition', 'attachment; filename="mix.wav"');

  try {
    const masterGain = masterVolume / 100;
    let command = ffmpeg();

    validTracks.forEach((track) => {
      const info = fileRegistry.get(track.fileId);
      const filePath = path.join(UPLOAD_DIR, info.storedName);
      const trackGain = (track.volume / 100) * masterGain;
      const panValue = track.pan / 100;
      command = command.input(filePath);
      let audioFilter = `volume=${trackGain.toFixed(3)}`;
      if (track.filterFreq && track.filterFreq < 20000) {
        audioFilter += `,lowpass=f=${Math.min(track.filterFreq, 20000)}`;
      }
      if (panValue !== 0) {
        audioFilter += `,pan=stereo|c0<c0${panValue < 0 ? `*${1 + panValue * 0.5}` : ''}|c1<c1${panValue > 0 ? `*${1 - panValue * 0.5}` : ''}`;
      }
      command = command.audioFilter(audioFilter);
    });

    command
      .complexFilter([`amix=inputs=${validTracks.length}:duration=longest:normalize=0`])
      .audioCodec('pcm_s16le')
      .format('wav')
      .on('error', (err) => {
        console.error('ffmpeg error:', err.message);
        if (!res.headersSent) res.status(500).end();
        else res.end();
      })
      .pipe(res, { end: true });
  } catch (err) {
    console.error('Export error:', err);
    if (!res.headersSent) res.status(500).json({ error: '导出失败' });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.listen(PORT, () => {
  console.log(`[Audio Mixer API] 服务运行于 http://localhost:${PORT}`);
});
