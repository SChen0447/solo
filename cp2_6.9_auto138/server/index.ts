import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 52345;

app.use(cors());
app.use(express.json());

interface Word {
  word: string;
  meaning: string;
  level: 'CET-4' | 'CET-6' | 'KAOYAN';
}

const wordBank: Word[] = [
  { word: 'apple', meaning: '苹果', level: 'CET-4' },
  { word: 'book', meaning: '书籍', level: 'CET-4' },
  { word: 'happy', meaning: '快乐的', level: 'CET-4' },
  { word: 'water', meaning: '水', level: 'CET-4' },
  { word: 'friend', meaning: '朋友', level: 'CET-4' },
  { word: 'abundant', meaning: '丰富的', level: 'CET-6' },
  { word: 'brilliant', meaning: '杰出的', level: 'CET-6' },
  { word: 'challenge', meaning: '挑战', level: 'CET-6' },
  { word: 'diligent', meaning: '勤奋的', level: 'CET-6' },
  { word: 'energetic', meaning: '精力充沛的', level: 'CET-6' },
  { word: 'ambiguous', meaning: '模糊的', level: 'KAOYAN' },
  { word: 'contemplate', meaning: '沉思', level: 'KAOYAN' },
  { word: 'deteriorate', meaning: '恶化', level: 'KAOYAN' },
  { word: 'exaggerate', meaning: '夸大', level: 'KAOYAN' },
  { word: 'fluctuate', meaning: '波动', level: 'KAOYAN' },
];

interface GameState {
  currentLevel: number;
  lives: number;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
}

const gameState: GameState = {
  currentLevel: 0,
  lives: 3,
  score: 0,
  totalQuestions: 0,
  correctAnswers: 0,
};

app.get('/get-word', (_req, res) => {
  if (gameState.currentLevel >= wordBank.length || gameState.lives <= 0) {
    return res.json({
      gameOver: true,
      score: gameState.score,
      totalQuestions: gameState.totalQuestions,
      correctAnswers: gameState.correctAnswers,
    });
  }

  const word = wordBank[gameState.currentLevel];
  return res.json({
    gameOver: false,
    currentLevel: gameState.currentLevel + 1,
    totalLevels: wordBank.length,
    lives: gameState.lives,
    score: gameState.score,
    word: word.word,
    meaning: word.meaning,
    level: word.level,
  });
});

app.post('/submit-answer', (req, res) => {
  const { answer } = req.body;

  if (gameState.currentLevel >= wordBank.length || gameState.lives <= 0) {
    return res.json({
      gameOver: true,
      score: gameState.score,
      totalQuestions: gameState.totalQuestions,
      correctAnswers: gameState.correctAnswers,
    });
  }

  const currentWord = wordBank[gameState.currentLevel];
  const isCorrect = answer.toLowerCase() === currentWord.word.toLowerCase();

  gameState.totalQuestions++;

  if (isCorrect) {
    gameState.correctAnswers++;
    gameState.score += 10;
    gameState.currentLevel++;
  } else {
    gameState.lives--;
  }

  if (gameState.currentLevel >= wordBank.length || gameState.lives <= 0) {
    return res.json({
      correct: isCorrect,
      correctWord: currentWord.word,
      gameOver: true,
      score: gameState.score,
      totalQuestions: gameState.totalQuestions,
      correctAnswers: gameState.correctAnswers,
    });
  }

  const nextWord = wordBank[gameState.currentLevel];

  return res.json({
    correct: isCorrect,
    correctWord: currentWord.word,
    gameOver: false,
    currentLevel: gameState.currentLevel + 1,
    totalLevels: wordBank.length,
    lives: gameState.lives,
    score: gameState.score,
    nextWord: nextWord.word,
    nextMeaning: nextWord.meaning,
    nextLevel: nextWord.level,
  });
});

app.post('/reset-game', (_req, res) => {
  gameState.currentLevel = 0;
  gameState.lives = 3;
  gameState.score = 0;
  gameState.totalQuestions = 0;
  gameState.correctAnswers = 0;

  const word = wordBank[gameState.currentLevel];
  return res.json({
    currentLevel: gameState.currentLevel + 1,
    totalLevels: wordBank.length,
    lives: gameState.lives,
    score: gameState.score,
    word: word.word,
    meaning: word.meaning,
    level: word.level,
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
