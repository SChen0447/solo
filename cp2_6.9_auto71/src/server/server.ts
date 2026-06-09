import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

interface Point {
  x: number;
  y: number;
  time: number;
}

interface Note {
  note: string;
  startTime: number;
  duration: number;
  pitch: number;
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function midiToNoteName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  const noteIndex = ((midi % 12) + 12) % 12;
  return NOTE_NAMES[noteIndex] + octave;
}

function yToPitch(y: number, canvasHeight: number): number {
  const minPitch = 60;
  const maxPitch = 83;
  const normalized = 1 - y / canvasHeight;
  const pitch = Math.round(minPitch + normalized * (maxPitch - minPitch));
  return Math.max(minPitch, Math.min(maxPitch, pitch));
}

function smoothPoints(points: Point[], windowSize: number = 5): Point[] {
  if (points.length < windowSize) return points;
  const smoothed: Point[] = [];
  for (let i = 0; i < points.length; i++) {
    const start = Math.max(0, i - Math.floor(windowSize / 2));
    const end = Math.min(points.length - 1, i + Math.floor(windowSize / 2));
    let sumX = 0, sumY = 0, count = 0;
    for (let j = start; j <= end; j++) {
      sumX += points[j].x;
      sumY += points[j].y;
      count++;
    }
    smoothed.push({
      x: sumX / count,
      y: sumY / count,
      time: points[i].time,
    });
  }
  return smoothed;
}

function detectExtrema(points: Point[]): number[] {
  const extrema: number[] = [];
  if (points.length < 3) return extrema;

  extrema.push(0);

  for (let i = 2; i < points.length - 2; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];

    const slope1 = curr.y - prev.y;
    const slope2 = next.y - curr.y;

    if ((slope1 <= 0 && slope2 > 0) || (slope1 >= 0 && slope2 < 0)) {
      extrema.push(i);
    }
  }

  extrema.push(points.length - 1);
  return extrema;
}

function mergeCloseExtrema(extrema: number[], points: Point[], minGap: number = 0.15): number[] {
  if (extrema.length <= 2) return extrema;

  const merged: number[] = [extrema[0]];
  for (let i = 1; i < extrema.length; i++) {
    const lastIdx = merged[merged.length - 1];
    const currIdx = extrema[i];
    const timeGap = points[currIdx].time - points[lastIdx].time;
    if (timeGap >= minGap) {
      merged.push(currIdx);
    }
  }
  return merged;
}

function analyzeMelody(points: Point[], canvasHeight: number = 300): Note[] {
  if (points.length < 5) return [];

  const sortedPoints = [...points].sort((a, b) => a.time - b.time);
  const smoothed = smoothPoints(sortedPoints, 7);

  let extrema = detectExtrema(smoothed);
  extrema = mergeCloseExtrema(extrema, smoothed, 0.12);

  const notes: Note[] = [];

  for (let i = 0; i < extrema.length - 1; i++) {
    const startIdx = extrema[i];
    const endIdx = extrema[i + 1];
    const startPoint = smoothed[startIdx];
    const endPoint = smoothed[endIdx];

    const startTime = startPoint.time;
    const duration = Math.max(0.08, endPoint.time - startTime);

    let sumY = 0;
    let count = 0;
    for (let j = startIdx; j <= endIdx; j++) {
      sumY += smoothed[j].y;
      count++;
    }
    const avgY = sumY / count;

    const pitch = yToPitch(avgY, canvasHeight);
    const noteName = midiToNoteName(pitch);

    notes.push({
      note: noteName,
      startTime: Number(startTime.toFixed(3)),
      duration: Number(duration.toFixed(3)),
      pitch,
    });
  }

  return notes.filter((n) => n.duration > 0.05);
}

app.post('/api/analyze', (req, res) => {
  try {
    const { points } = req.body as { points: Point[] };

    if (!points || !Array.isArray(points) || points.length === 0) {
      return res.status(400).json({ error: 'Invalid points data' });
    }

    const notes = analyzeMelody(points);
    res.json({ notes });
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Melody analysis server running on port ${PORT}`);
});
