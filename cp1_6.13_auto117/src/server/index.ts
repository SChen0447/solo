import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import PDFDocument from 'pdfkit';

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: 'uploads/' });

const PRESET_TRACKS = [
  { id: 'hiphop1', name: 'Hip-Hop Groove', style: 'Hip-Hop', bpm: 95, duration: 120000 },
  { id: 'breaking1', name: 'Breaking Beat', style: 'Breaking', bpm: 128, duration: 108000 },
  { id: 'popping1', name: 'Popping Funk', style: 'Popping', bpm: 110, duration: 96000 },
];

function generateBeats(bpm: number, durationMs: number) {
  const beats: { time: number; beat: number }[] = [];
  const interval = 60000 / bpm;
  let t = 0;
  let beat = 1;
  while (t < durationMs) {
    beats.push({ time: Math.round(t * 1000) / 1000, beat });
    t += interval;
    beat = beat >= 4 ? 1 : beat + 1;
  }
  return beats;
}

function generateSegments(durationMs: number) {
  const segments = [
    { name: 'intro', label: '前奏', start: 0, end: durationMs * 0.12 },
    { name: 'verse', label: '主歌', start: durationMs * 0.12, end: durationMs * 0.45 },
    { name: 'chorus', label: '副歌', start: durationMs * 0.45, end: durationMs * 0.78 },
    { name: 'bridge', label: '过渡', start: durationMs * 0.78, end: durationMs * 0.9 },
    { name: 'outro', label: '尾声', start: durationMs * 0.9, end: durationMs },
  ];
  return segments;
}

const DANCE_MOVES_POOL = [
  { name: 'Toprock', beats: 2, difficulty: 1 },
  { name: 'Six Step', beats: 4, difficulty: 3 },
  { name: 'Freeze', beats: 2, difficulty: 2 },
  { name: 'Pop', beats: 1, difficulty: 1 },
  { name: 'Lock', beats: 2, difficulty: 2 },
  { name: 'Wave', beats: 2, difficulty: 2 },
  { name: 'Gliding', beats: 2, difficulty: 3 },
  { name: 'Tutting', beats: 2, difficulty: 3 },
  { name: 'Uprock', beats: 2, difficulty: 1 },
  { name: 'Headspin', beats: 4, difficulty: 3 },
  { name: 'Windmill', beats: 4, difficulty: 3 },
  { name: 'Baby Freeze', beats: 2, difficulty: 2 },
  { name: 'Handspin', beats: 2, difficulty: 2 },
  { name: 'Electric Boogaloo', beats: 2, difficulty: 2 },
  { name: 'Robot', beats: 2, difficulty: 1 },
  { name: 'Hit', beats: 1, difficulty: 1 },
  { name: 'Twist-o-Flex', beats: 2, difficulty: 2 },
  { name: 'Neck-o-Flex', beats: 2, difficulty: 2 },
  { name: 'Master Swipe', beats: 2, difficulty: 3 },
  { name: 'Cork', beats: 2, difficulty: 3 },
  { name: 'Kick Out', beats: 1, difficulty: 1 },
  { name: 'Floor Rock', beats: 2, difficulty: 2 },
  { name: 'Air Flare', beats: 4, difficulty: 3 },
  { name: 'Scramble', beats: 2, difficulty: 1 },
];

const SCHEME_TEMPLATES = [
  { name: '震动锁链', bpmRange: [90, 120], moveIndices: [0, 4, 3, 7, 5, 8, 14, 15] },
  { name: '幻影步法', bpmRange: [120, 140], moveIndices: [1, 9, 2, 10, 22, 6, 18, 11] },
  { name: '脉冲律动', bpmRange: [80, 115], moveIndices: [3, 15, 5, 13, 16, 17, 7, 23] },
];

function generateScheme(template: typeof SCHEME_TEMPLATES[0], bpm: number, beats: { time: number; beat: number }[]) {
  const moves = template.moveIndices.slice(0, 6 + Math.floor(Math.random() * 3)).map((idx) => {
    const pool = DANCE_MOVES_POOL[idx % DANCE_MOVES_POOL.length];
    return { name: pool.name, beats: pool.beats, difficulty: pool.difficulty };
  });

  let beatIdx = 0;
  const movesWithTimestamps = moves.map((move) => {
    const timestamps: number[] = [];
    for (let i = 0; i < move.beats && beatIdx < beats.length; i++) {
      timestamps.push(beats[beatIdx].time);
      beatIdx++;
    }
    return { ...move, timestamps };
  });

  return {
    name: template.name,
    bpmRange: template.bpmRange,
    totalDifficulty: moves.reduce((s, m) => s + m.difficulty, 0),
    moves: movesWithTimestamps,
  };
}

const BACKUP_MOVES = [
  { name: 'Snake', beats: 2, difficulty: 2, icon: '🐍' },
  { name: 'Bounce', beats: 1, difficulty: 1, icon: '⚡' },
  { name: 'Slide', beats: 2, difficulty: 1, icon: '🌀' },
  { name: 'Spin', beats: 2, difficulty: 2, icon: '🔄' },
  { name: 'Jump', beats: 1, difficulty: 1, icon: '🚀' },
  { name: 'Dip', beats: 2, difficulty: 2, icon: '⬇️' },
  { name: 'Flex', beats: 1, difficulty: 1, icon: '💪' },
  { name: 'Criss Cross', beats: 2, difficulty: 2, icon: '❌' },
];

app.post('/api/analyze', upload.single('audio'), (req, res) => {
  const presetId = req.body.presetId;
  let bpm: number;
  let durationMs: number;
  let trackName: string;
  let style: string;

  if (presetId) {
    const preset = PRESET_TRACKS.find((t) => t.id === presetId);
    if (!preset) {
      res.status(400).json({ error: 'Invalid preset ID' });
      return;
    }
    bpm = preset.bpm;
    durationMs = preset.duration;
    trackName = preset.name;
    style = preset.style;
  } else {
    bpm = 80 + Math.floor(Math.random() * 60);
    durationMs = 60000 + Math.floor(Math.random() * 120000);
    trackName = req.file?.originalname?.replace(/\.[^.]+$/, '') || 'Uploaded Track';
    style = 'Mixed';
  }

  const beats = generateBeats(bpm, durationMs);
  const segments = generateSegments(durationMs);

  setTimeout(() => {
    res.json({
      trackName,
      style,
      bpm,
      durationMs,
      beats,
      segments,
    });
  }, 800);
});

app.post('/api/generate', (req, res) => {
  const { bpm, beatCount } = req.body;
  const beats = generateBeats(bpm, (beatCount * 60000) / bpm);

  const schemes = SCHEME_TEMPLATES.map((template) =>
    generateScheme(template, bpm, beats)
  );

  setTimeout(() => {
    res.json({ schemes, backupMoves: BACKUP_MOVES });
  }, 600);
});

app.post('/api/export', (req, res) => {
  const { name, bpm, moves } = req.body as {
    name: string;
    bpm: number;
    moves: { name: string; beats: number; difficulty: number; timestamps: number[] }[];
  };

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));
  doc.on('end', () => {
    const pdfBuffer = Buffer.concat(chunks);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(name)}.pdf"`);
    res.send(pdfBuffer);
  });

  doc.rect(0, 0, doc.page.width, doc.page.height).fill('#0B1021');

  doc.fontSize(32).fillColor('#FEB47B').text('StreetDance Choreo Studio', 50, 120, { align: 'center' });
  doc.moveDown(1);
  doc.fontSize(22).fillColor('#ffffff').text(name, { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(14).fillColor('#aaaaaa').text(`BPM: ${bpm}`, { align: 'center' });

  doc.moveDown(2);
  doc.fontSize(16).fillColor('#FEB47B').text('Action List', { underline: true });
  doc.moveDown(0.5);

  moves.forEach((move, i) => {
    const stars = '★'.repeat(move.difficulty) + '☆'.repeat(3 - move.difficulty);
    doc.fontSize(12).fillColor('#ffffff').text(`${i + 1}. ${move.name}`, 50, undefined, { continued: true });
    doc.fillColor('#888888').text(`  ${move.beats} beats  ${stars}`);
    if (move.timestamps && move.timestamps.length > 0) {
      const tsStr = move.timestamps.map((t: number) => `${(t / 1000).toFixed(2)}s`).join(', ');
      doc.fontSize(10).fillColor('#666666').text(`   Timestamps: ${tsStr}`);
    }
    doc.moveDown(0.3);
  });

  doc.end();
});

if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
