import express, { Request, Response } from 'express';
import cors from 'cors';

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

interface Note {
  name: string;
  octave: number;
  start: number;
  duration: number;
  strength: 'strong' | 'weak';
}

interface AnalyzeResponse {
  notes: Note[];
  bpm: number;
  key: string;
  timeSignature: string;
}

interface Chord {
  name: string;
  degree: string;
  frets: number[];
  fingers: number[];
  start: number;
  duration: number;
}

interface ChordProgression {
  id: number;
  name: string;
  description: string;
  chords: Chord[];
}

interface DrumPattern {
  kick: number[];
  snare: number[];
  hihat: number[];
}

interface AccompanimentResponse {
  timeSignature: string;
  bpm: number;
  drums: DrumPattern;
  bass: { note: string; octave: number; start: number; duration: number }[];
  strings: { note: string; octave: number; start: number; duration: number }[];
}

interface MelodyArchive {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  bpm: number;
  key: string;
  notes: Note[];
  chords: Chord[];
  accompaniment: AccompanimentResponse | null;
}

const archives: MelodyArchive[] = [];

const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const keys = ['C大调', 'G大调', 'D大调', 'A小调', 'E小调', 'D小调', 'F大调', 'Bb大调'];

function generateNotes(): Note[] {
  const notes: Note[] = [];
  let currentTime = 0;
  const numNotes = 16 + Math.floor(Math.random() * 8);

  for (let i = 0; i < numNotes; i++) {
    const nameIdx = Math.floor(Math.random() * 7);
    const noteName = ['C', 'D', 'E', 'F', 'G', 'A', 'B'][nameIdx];
    const octave = 4 + Math.floor(Math.random() * 2);
    const duration = [0.25, 0.5, 0.5, 1, 1, 2][Math.floor(Math.random() * 6)];
    const isStrong = i % 4 === 0;

    notes.push({
      name: noteName,
      octave,
      start: currentTime,
      duration,
      strength: isStrong ? 'strong' : 'weak',
    });

    currentTime += duration + Math.random() * 0.1;
  }

  return notes;
}

function generateChordFrets(root: string): number[] {
  const patterns: Record<string, number[]> = {
    C: [-1, 3, 2, 0, 1, 0],
    D: [-1, -1, 0, 2, 3, 2],
    E: [0, 2, 2, 1, 0, 0],
    F: [1, 3, 3, 2, 1, 1],
    G: [3, 2, 0, 0, 0, 3],
    A: [-1, 0, 2, 2, 2, 0],
    B: [-1, 2, 4, 4, 4, 2],
    Am: [-1, 0, 2, 2, 1, 0],
    Em: [0, 2, 2, 0, 0, 0],
    Dm: [-1, -1, 0, 2, 3, 1],
    Bm: [-1, 2, 4, 4, 3, 2],
    Fm: [1, 3, 3, 1, 1, 1],
  };
  return patterns[root] || [0, 2, 2, 1, 0, 0];
}

function generateChordProgressions(notes: Note[]): ChordProgression[] {
  const progressions: ChordProgression[] = [];

  const scheme1 = [
    { chord: 'C', degree: 'I' },
    { chord: 'G', degree: 'V' },
    { chord: 'Am', degree: 'vi' },
    { chord: 'F', degree: 'IV' },
  ];

  const scheme2 = [
    { chord: 'Am', degree: 'i' },
    { chord: 'F', degree: 'VI' },
    { chord: 'C', degree: 'III' },
    { chord: 'G', degree: 'V' },
  ];

  const scheme3 = [
    { chord: 'C', degree: 'I' },
    { chord: 'Am', degree: 'vi' },
    { chord: 'F', degree: 'IV' },
    { chord: 'G', degree: 'V' },
  ];

  const schemes = [
    { name: '经典流行进行', desc: 'I-V-vi-IV，大众流行金曲常用', scheme: scheme1 },
    { name: '伤感小调进行', desc: 'i-VI-III-V，叙事感强', scheme: scheme2 },
    { name: '50年代进行', desc: 'I-vi-IV-V，复古怀旧风', scheme: scheme3 },
  ];

  const totalDuration = notes.length > 0 ? notes[notes.length - 1].start + notes[notes.length - 1].duration + 1 : 16;
  const chordDuration = 2;

  schemes.forEach((s, idx) => {
    const chords: Chord[] = [];
    let time = 0;
    let chordIdx = 0;

    while (time < totalDuration) {
      const c = s.scheme[chordIdx % s.scheme.length];
      chords.push({
        name: c.chord,
        degree: c.degree,
        frets: generateChordFrets(c.chord),
        fingers: c.chord === 'F' ? [1, 2, 3, 4, 1, 1] : [0, 1, 2, 3, 0, 0],
        start: time,
        duration: chordDuration,
      });
      time += chordDuration;
      chordIdx++;
    }

    progressions.push({
      id: idx + 1,
      name: s.name,
      description: s.desc,
      chords,
    });
  });

  return progressions;
}

function generateAccompaniment(bpm: number, chords: Chord[]): AccompanimentResponse {
  const beatDuration = 60 / bpm;
  const bars = Math.max(8, Math.ceil(chords.length / 2));
  const totalBeats = bars * 4;

  const kick: number[] = [];
  const snare: number[] = [];
  const hihat: number[] = [];

  for (let i = 0; i < totalBeats; i++) {
    if (i % 4 === 0 || i % 4 === 2) kick.push(i);
    if (i % 4 === 1 || i % 4 === 3) snare.push(i);
    for (let h = 0; h < 2; h++) hihat.push(i + h * 0.5);
  }

  const bass: { note: string; octave: number; start: number; duration: number }[] = [];
  chords.forEach((c) => {
    bass.push({
      note: c.name.replace(/m$/, ''),
      octave: 2,
      start: c.start,
      duration: c.duration,
    });
  });

  const strings: { note: string; octave: number; start: number; duration: number }[] = [];
  chords.forEach((c) => {
    const root = c.name.replace(/m$/, '');
    const rootIdx = noteNames.indexOf(root);
    const thirdIdx = c.name.endsWith('m') ? (rootIdx + 3) % 12 : (rootIdx + 4) % 12;
    const fifthIdx = (rootIdx + 7) % 12;
    strings.push({ note: noteNames[rootIdx], octave: 4, start: c.start, duration: c.duration });
    strings.push({ note: noteNames[thirdIdx], octave: 4, start: c.start, duration: c.duration });
    strings.push({ note: noteNames[fifthIdx], octave: 4, start: c.start, duration: c.duration });
  });

  return {
    timeSignature: '4/4',
    bpm,
    drums: { kick, snare, hihat },
    bass,
    strings,
  };
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

app.post('/api/analyze', async (req: Request, res: Response) => {
  await delay(1000 + Math.random() * 500);

  const bpm = 80 + Math.floor(Math.random() * 60);
  const key = keys[Math.floor(Math.random() * keys.length)];

  const response: AnalyzeResponse = {
    notes: generateNotes(),
    bpm,
    key,
    timeSignature: '4/4',
  };

  res.json(response);
});

app.post('/api/chords', async (req: Request, res: Response) => {
  await delay(1000 + Math.random() * 500);
  const { notes } = req.body as { notes: Note[] };
  const progressions = generateChordProgressions(notes || generateNotes());
  res.json(progressions);
});

app.post('/api/accompaniment', async (req: Request, res: Response) => {
  const { bpm, chords } = req.body as { bpm: number; chords: Chord[] };
  const totalMs = 1000 + Math.random() * 500;
  const steps = 10;

  for (let i = 0; i <= steps; i++) {
    await delay(totalMs / steps);
  }

  const accompaniment = generateAccompaniment(bpm || 100, chords || generateChordProgressions(generateNotes())[0].chords);
  res.json(accompaniment);
});

app.post('/api/save', async (req: Request, res: Response) => {
  await delay(500);
  const archive = req.body as Omit<MelodyArchive, 'id' | 'createdAt'>;
  const newArchive: MelodyArchive = {
    ...archive,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
  };
  archives.unshift(newArchive);
  res.json({ success: true, archive: newArchive });
});

app.get('/api/load', async (req: Request, res: Response) => {
  await delay(300);
  res.json(archives);
});

app.get('/api/load/:id', async (req: Request, res: Response) => {
  await delay(300);
  const archive = archives.find((a) => a.id === req.params.id);
  if (archive) {
    res.json(archive);
  } else {
    res.status(404).json({ error: '档案不存在' });
  }
});

app.listen(PORT, () => {
  console.log(`Melody Workshop backend running on port ${PORT}`);
});
