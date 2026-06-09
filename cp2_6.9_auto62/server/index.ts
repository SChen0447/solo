import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface EmotionWord {
  word: string;
  score: number;
}

interface EmotionLexicon {
  joy: EmotionWord[];
  anger: EmotionWord[];
  sadness: EmotionWord[];
  fear: EmotionWord[];
  calm: EmotionWord[];
  neutral: EmotionWord[];
}

export interface SentenceResult {
  index: number;
  sentence: string;
  score: number;
  label: 'joy' | 'anger' | 'sadness' | 'fear' | 'calm' | 'neutral';
  matchedWords: string[];
}

export type EmotionLabel = 'joy' | 'anger' | 'sadness' | 'fear' | 'calm' | 'neutral';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const lexiconPath = path.join(__dirname, 'emotion-lexicon.json');
const lexicon: EmotionLexicon = JSON.parse(fs.readFileSync(lexiconPath, 'utf-8'));

const LABEL_NAMES: Record<EmotionLabel, string> = {
  joy: '喜悦',
  anger: '愤怒',
  sadness: '悲伤',
  fear: '恐惧',
  calm: '平静',
  neutral: '中性',
};

const LABEL_COLORS: Record<EmotionLabel, string> = {
  joy: '#38A169',
  anger: '#E53E3E',
  sadness: '#4299E1',
  fear: '#805AD5',
  calm: '#38B2AC',
  neutral: '#A0AEC0',
};

function splitSentences(text: string): string[] {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  const sentences: string[] = [];
  let current = '';
  
  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    current += char;
    if (['。', '！', '!', '？', '?', '.', '；', ';', '\n'].includes(char)) {
      const trimmed = current.trim();
      if (trimmed.length > 0) {
        sentences.push(trimmed);
      }
      current = '';
    }
  }
  
  if (current.trim().length > 0) {
    sentences.push(current.trim());
  }
  
  return sentences.filter(s => s.length > 0);
}

function analyzeSentence(sentence: string, index: number): SentenceResult {
  const labelScores: Record<EmotionLabel, number> = {
    joy: 0,
    anger: 0,
    sadness: 0,
    fear: 0,
    calm: 0,
    neutral: 0,
  };
  
  const matchedWords: string[] = [];
  const labels: EmotionLabel[] = ['joy', 'anger', 'sadness', 'fear', 'calm', 'neutral'];
  
  for (const label of labels) {
    for (const { word, score } of lexicon[label]) {
      if (sentence.includes(word)) {
        labelScores[label] += Math.abs(score);
        matchedWords.push(word);
      }
    }
  }
  
  let totalScore = 0;
  let matchCount = 0;
  
  for (const label of labels) {
    for (const { word, score } of lexicon[label]) {
      if (sentence.includes(word)) {
        totalScore += score;
        matchCount++;
      }
    }
  }
  
  const avgScore = matchCount > 0 ? totalScore / matchCount : 0;
  const clampedScore = Math.max(-1, Math.min(1, avgScore));
  
  let dominantLabel: EmotionLabel = 'neutral';
  let maxScore = 0;
  
  for (const label of labels) {
    if (label !== 'neutral' && labelScores[label] > maxScore) {
      maxScore = labelScores[label];
      dominantLabel = label;
    }
  }
  
  if (maxScore === 0) {
    if (clampedScore > 0.1) dominantLabel = 'joy';
    else if (clampedScore < -0.1) dominantLabel = 'sadness';
    else dominantLabel = 'calm';
  }
  
  return {
    index,
    sentence,
    score: Number(clampedScore.toFixed(3)),
    label: dominantLabel,
    matchedWords,
  };
}

wss.on('connection', (ws: WebSocket) => {
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      if (message.type === 'analyze' && message.text) {
        const text = message.text;
        const sentences = splitSentences(text);
        const results: SentenceResult[] = [];
        const total = sentences.length;
        
        for (let i = 0; i < total; i++) {
          const result = analyzeSentence(sentences[i], i);
          results.push(result);
          
          const progress = Math.round(((i + 1) / total) * 100);
          ws.send(JSON.stringify({
            type: 'progress',
            progress,
            current: i + 1,
            total,
          }));
        }
        
        ws.send(JSON.stringify({
          type: 'complete',
          results,
          summary: {
            totalSentences: total,
            averageScore: Number((results.reduce((s, r) => s + r.score, 0) / Math.max(total, 1)).toFixed(3)),
            labelDistribution: labelsDistribution(results),
          },
        }));
      }
    } catch (err) {
      ws.send(JSON.stringify({
        type: 'error',
        message: (err as Error).message,
      }));
    }
  });
});

function labelsDistribution(results: SentenceResult[]): Record<EmotionLabel, number> {
  const dist: Record<EmotionLabel, number> = {
    joy: 0,
    anger: 0,
    sadness: 0,
    fear: 0,
    calm: 0,
    neutral: 0,
  };
  
  for (const r of results) {
    dist[r.label]++;
  }
  
  return dist;
}

app.post('/api/analyze', (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: '请提供文本内容' });
    }
    
    if (text.length < 50 || text.length > 50000) {
      return res.status(400).json({ error: '文本长度应在50到50000字之间' });
    }
    
    const sentences = splitSentences(text);
    const results = sentences.map((s, i) => analyzeSentence(s, i));
    
    res.json({
      results,
      summary: {
        totalSentences: results.length,
        averageScore: Number((results.reduce((s, r) => s + r.score, 0) / Math.max(results.length, 1)).toFixed(3)),
        labelDistribution: labelsDistribution(results),
      },
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get('/api/labels', (_req: Request, res: Response) => {
  res.json({
    labels: Object.entries(LABEL_NAMES).map(([key, name]) => ({
      key,
      name,
      color: LABEL_COLORS[key as EmotionLabel],
    })),
  });
});

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`情感分析服务运行在 http://localhost:${PORT}`);
});
