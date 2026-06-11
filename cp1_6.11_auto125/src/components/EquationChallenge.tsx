import React, { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import './EquationChallenge.css';

interface EquationTerm {
  symbol: string;
  subscript: number;
}

interface EquationSide {
  terms: {
    element: EquationTerm;
    coefficient: number;
  }[];
}

interface EquationQuestion {
  id: string;
  reactants: EquationSide;
  products: EquationSide;
  correctCoefficients: number[];
  difficulty: 'easy' | 'hard';
  userCoefficients: number[];
  submitted: boolean;
  isCorrect?: boolean;
}

const equationTemplates = [
  {
    reactants: [{ symbol: 'H', subscript: 2 }, { symbol: 'O', subscript: 2 }],
    products: [{ symbol: 'H', subscript: 2 }, { symbol: 'O', subscript: 1 }],
    correct: [2, 1, 2],
    difficulty: 'easy' as const,
  },
  {
    reactants: [{ symbol: 'N', subscript: 2 }, { symbol: 'H', subscript: 2 }],
    products: [{ symbol: 'N', subscript: 1 }, { symbol: 'H', subscript: 3 }],
    correct: [1, 3, 2],
    difficulty: 'easy' as const,
  },
  {
    reactants: [{ symbol: 'C', subscript: 1 }, { symbol: 'O', subscript: 2 }],
    products: [{ symbol: 'C', subscript: 1 }, { symbol: 'O', subscript: 2 }],
    correct: [1, 1, 1],
    difficulty: 'easy' as const,
  },
  {
    reactants: [{ symbol: 'Na', subscript: 1 }, { symbol: 'Cl', subscript: 2 }],
    products: [{ symbol: 'Na', subscript: 1 }, { symbol: 'Cl', subscript: 1 }],
    correct: [2, 1, 2],
    difficulty: 'easy' as const,
  },
  {
    reactants: [{ symbol: 'Mg', subscript: 1 }, { symbol: 'O', subscript: 2 }],
    products: [{ symbol: 'Mg', subscript: 1 }, { symbol: 'O', subscript: 1 }],
    correct: [2, 1, 2],
    difficulty: 'easy' as const,
  },
  {
    reactants: [{ symbol: 'Fe', subscript: 1 }, { symbol: 'O', subscript: 2 }],
    products: [{ symbol: 'Fe', subscript: 2 }, { symbol: 'O', subscript: 3 }],
    correct: [4, 3, 2],
    difficulty: 'easy' as const,
  },
  {
    reactants: [{ symbol: 'H', subscript: 2 }, { symbol: 'O', subscript: 2 }],
    products: [{ symbol: 'H', subscript: 2 }, { symbol: 'O', subscript: 1 }],
    correct: [2, 1, 2],
    difficulty: 'easy' as const,
  },
  {
    reactants: [{ symbol: 'P', subscript: 4 }, { symbol: 'O', subscript: 2 }],
    products: [{ symbol: 'P', subscript: 2 }, { symbol: 'O', subscript: 5 }],
    correct: [1, 5, 2],
    difficulty: 'hard' as const,
  },
  {
    reactants: [{ symbol: 'C', subscript: 2 }, { symbol: 'H', subscript: 6 }, { symbol: 'O', subscript: 2 }],
    products: [{ symbol: 'C', subscript: 1 }, { symbol: 'O', subscript: 2 }, { symbol: 'H', subscript: 2 }, { symbol: 'O', subscript: 1 }],
    correct: [1, 3, 2, 3],
    difficulty: 'hard' as const,
  },
  {
    reactants: [{ symbol: 'Al', subscript: 1 }, { symbol: 'O', subscript: 2 }],
    products: [{ symbol: 'Al', subscript: 2 }, { symbol: 'O', subscript: 3 }],
    correct: [4, 3, 2],
    difficulty: 'hard' as const,
  },
  {
    reactants: [{ symbol: 'K', subscript: 1 }, { symbol: 'Cl', subscript: 1 }, { symbol: 'O', subscript: 3 }],
    products: [{ symbol: 'K', subscript: 1 }, { symbol: 'Cl', subscript: 1 }, { symbol: 'O', subscript: 2 }],
    correct: [2, 2, 3],
    difficulty: 'hard' as const,
  },
  {
    reactants: [{ symbol: 'C', subscript: 3 }, { symbol: 'H', subscript: 8 }, { symbol: 'O', subscript: 2 }],
    products: [{ symbol: 'C', subscript: 1 }, { symbol: 'O', subscript: 2 }, { symbol: 'H', subscript: 2 }, { symbol: 'O', subscript: 1 }],
    correct: [1, 5, 3, 4],
    difficulty: 'hard' as const,
  },
  {
    reactants: [{ symbol: 'Na', subscript: 2 }, { symbol: 'O', subscript: 1 }, { symbol: 'H', subscript: 2 }, { symbol: 'O', subscript: 1 }],
    products: [{ symbol: 'Na', subscript: 1 }, { symbol: 'O', subscript: 1 }, { symbol: 'H', subscript: 1 }],
    correct: [1, 2],
    difficulty: 'hard' as const,
  },
  {
    reactants: [{ symbol: 'Ca', subscript: 1 }, { symbol: 'C', subscript: 1 }, { symbol: 'O', subscript: 3 }],
    products: [{ symbol: 'Ca', subscript: 1 }, { symbol: 'O', subscript: 1 }, { symbol: 'C', subscript: 1 }, { symbol: 'O', subscript: 2 }],
    correct: [1, 1, 1],
    difficulty: 'hard' as const,
  },
];

const playSuccessSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1);
    oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2);
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.4);
  } catch (e) {
    // Audio not supported
  }
};

const playErrorSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(200, audioContext.currentTime + 0.15);
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (e) {
    // Audio not supported
  }
};

interface EquationChallengeProps {
  onScoreUpdate: (score: number, correct: number, total: number) => void;
}

const EquationChallenge: React.FC<EquationChallengeProps> = ({ onScoreUpdate }) => {
  const [questions, setQuestions] = useState<EquationQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [skipChances, setSkipChances] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const timerRef = useRef<number | null>(null);

  const generateQuestions = useCallback(() => {
    const shuffled = [...equationTemplates].sort(() => Math.random() - 0.5);
    const easyQuestions = shuffled.filter((q) => q.difficulty === 'easy').slice(0, 5);
    const hardQuestions = shuffled.filter((q) => q.difficulty === 'hard').slice(0, 5);
    const selected = [...easyQuestions, ...hardQuestions];
    
    return selected.map((template) => {
      const totalTerms = template.reactants.length + template.products.length;
      return {
        id: uuidv4(),
        reactants: {
          terms: template.reactants.map((r, i) => ({
            element: r,
            coefficient: template.correct[i],
          })),
        },
        products: {
          terms: template.products.map((p, i) => ({
            element: p,
            coefficient: template.correct[template.reactants.length + i],
          })),
        },
        correctCoefficients: template.correct,
        difficulty: template.difficulty,
        userCoefficients: new Array(totalTerms).fill(1),
        submitted: false,
      };
    });
  }, []);

  const startGame = useCallback(() => {
    const newQuestions = generateQuestions();
    setQuestions(newQuestions);
    setCurrentIndex(0);
    setScore(0);
    setCorrectCount(0);
    setStreak(0);
    setSkipChances(0);
    setTimeLeft(30);
    setGameStarted(true);
    setGameOver(false);
    onScoreUpdate(0, 0, 0);
  }, [generateQuestions, onScoreUpdate]);

  useEffect(() => {
    if (!gameStarted || gameOver || questions.length === 0) return;

    const currentQuestion = questions[currentIndex];
    if (currentQuestion?.submitted) return;

    timerRef.current = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [gameStarted, gameOver, currentIndex, questions]);

  const handleTimeout = useCallback(() => {
    setQuestions((prev) => {
      const newQuestions = [...prev];
      if (newQuestions[currentIndex]) {
        newQuestions[currentIndex] = {
          ...newQuestions[currentIndex],
          submitted: true,
          isCorrect: false,
        };
      }
      return newQuestions;
    });
    setStreak(0);
    playErrorSound();
  }, [currentIndex]);

  const handleCoefficientChange = useCallback((termIndex: number, delta: number) => {
    if (questions[currentIndex]?.submitted) return;
    
    const currentQuestion = questions[currentIndex];
    const maxCoef = currentQuestion.difficulty === 'easy' ? 5 : 10;
    
    setQuestions((prev) => {
      const newQuestions = [...prev];
      const q = { ...newQuestions[currentIndex] };
      const newVal = q.userCoefficients[termIndex] + delta;
      if (newVal >= 1 && newVal <= maxCoef) {
        q.userCoefficients = [...q.userCoefficients];
        q.userCoefficients[termIndex] = newVal;
      }
      newQuestions[currentIndex] = q;
      return newQuestions;
    });
  }, [currentIndex, questions]);

  const handleSubmit = useCallback(() => {
    if (questions[currentIndex]?.submitted) return;
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    const currentQuestion = questions[currentIndex];
    const isCorrect = currentQuestion.userCoefficients.every(
      (coef, index) => coef === currentQuestion.correctCoefficients[index]
    );

    setQuestions((prev) => {
      const newQuestions = [...prev];
      newQuestions[currentIndex] = {
        ...newQuestions[currentIndex],
        submitted: true,
        isCorrect,
      };
      return newQuestions;
    });

    if (isCorrect) {
      setScore((prev) => prev + 10);
      setCorrectCount((prev) => prev + 1);
      setStreak((prev) => {
        const newStreak = prev + 1;
        if (newStreak % 3 === 0) {
          setSkipChances((s) => s + 1);
        }
        return newStreak;
      });
      playSuccessSound();
    } else {
      setStreak(0);
      playErrorSound();
    }

    const newCorrect = isCorrect ? correctCount + 1 : correctCount;
    onScoreUpdate(isCorrect ? score + 10 : score, newCorrect, currentIndex + 1);
  }, [currentIndex, questions, score, correctCount, onScoreUpdate]);

  const handleSkip = useCallback(() => {
    if (skipChances <= 0 || questions[currentIndex]?.submitted) return;
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    setSkipChances((prev) => prev - 1);
    setQuestions((prev) => {
      const newQuestions = [...prev];
      newQuestions[currentIndex] = {
        ...newQuestions[currentIndex],
        submitted: true,
        isCorrect: undefined,
      };
      return newQuestions;
    });
  }, [skipChances, currentIndex, questions]);

  const handleNext = useCallback(() => {
    if (currentIndex >= questions.length - 1) {
      setGameOver(true);
    } else {
      setCurrentIndex((prev) => prev + 1);
      setTimeLeft(30);
    }
  }, [currentIndex, questions.length]);

  const renderTerm = (
    element: EquationTerm,
    userCoef: number,
    correctCoef: number,
    submitted: boolean,
    isCorrect: boolean | undefined,
    index: number,
    isFirst: boolean
  ) => {
    const showWrong = submitted && isCorrect === false && userCoef !== correctCoef;
    const showCorrect = submitted && isCorrect === false && userCoef === correctCoef;

    return (
      <span key={index} className={`equation-term ${showWrong ? 'wrong' : ''} ${showCorrect ? 'correct' : ''}`}>
        {!isFirst && <span className="plus-sign">+</span>}
        <span className="coefficient-selector">
          <button
            className="coef-btn coef-up"
            onClick={() => handleCoefficientChange(index, 1)}
            disabled={submitted}
            aria-label={`增加系数`}
          >
            ▲
          </button>
          <span className="coef-value">{userCoef}</span>
          <button
            className="coef-btn coef-down"
            onClick={() => handleCoefficientChange(index, -1)}
            disabled={submitted}
            aria-label={`减少系数`}
          >
            ▼
          </button>
        </span>
        <span className="element-symbol-eq">{element.symbol}</span>
        {element.subscript > 1 && (
          <span className="element-subscript">{element.subscript}</span>
        )}
        {submitted && isCorrect === false && showWrong && (
          <span className="correct-answer">正确: {correctCoef}</span>
        )}
      </span>
    );
  };

  if (!gameStarted) {
    return (
      <div className="equation-challenge">
        <div className="challenge-intro">
          <h2 className="challenge-title">⚗️ 方程式配平挑战</h2>
          <p className="challenge-desc">
            共10道题，每题限时30秒，答对一题得10分
          </p>
          <p className="challenge-tip">
            前5题为基础题（系数1-5），后5题为进阶题（系数2-10）
          </p>
          <p className="challenge-tip">
            💡 连续答对3题可获得一次「跳过本题」机会
          </p>
          <button className="start-btn" onClick={startGame}>
            开始挑战
          </button>
        </div>
      </div>
    );
  }

  if (gameOver) {
    const percentage = Math.round((correctCount / questions.length) * 100);
    return (
      <div className="equation-challenge">
        <div className="game-over">
          <h2 className="game-over-title">🎉 挑战完成！</h2>
          <div className="final-score">
            <span className="score-label">最终得分</span>
            <span className="score-value">{score} / 100</span>
          </div>
          <div className="final-stats">
            <div className="stat-item">
              <span className="stat-value">{correctCount}</span>
              <span className="stat-label">答对</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{questions.length - correctCount}</span>
              <span className="stat-label">答错</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{percentage}%</span>
              <span className="stat-label">正确率</span>
            </div>
          </div>
          {percentage < 60 && (
            <p className="study-tip">📚 正确率低于60%，建议复习元素规律哦！</p>
          )}
          <button className="restart-btn" onClick={startGame}>
            再来一次
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  if (!currentQuestion) return null;

  const allTerms = [
    ...currentQuestion.reactants.terms.map((t) => ({ ...t.element, correctCoef: t.coefficient })),
    ...currentQuestion.products.terms.map((t) => ({ ...t.element, correctCoef: t.coefficient })),
  ];

  const reactantCount = currentQuestion.reactants.terms.length;

  return (
    <div className="equation-challenge">
      <div className="challenge-header">
        <div className="question-progress">
          第 {currentIndex + 1} / {questions.length} 题
          <span className={`difficulty-badge ${currentQuestion.difficulty}`}>
            {currentQuestion.difficulty === 'easy' ? '基础' : '进阶'}
          </span>
        </div>
        <div className={`countdown ${timeLeft <= 10 ? 'warning' : ''}`}>
          ⏱️ {timeLeft}s
        </div>
      </div>

      <div className="score-strip">
        <span>得分: <strong>{score}</strong></span>
        <span>连续正确: <strong>{streak}</strong></span>
        <span>跳过机会: <strong>{skipChances}</strong></span>
      </div>

      <div className="equation-display">
        <div className="equation-side reactants">
          {currentQuestion.reactants.terms.map((term, index) =>
            renderTerm(
              term.element,
              currentQuestion.userCoefficients[index],
              term.coefficient,
              currentQuestion.submitted,
              currentQuestion.isCorrect,
              index,
              index === 0
            )
          )}
        </div>
        
        <div className="equation-arrow">→</div>
        
        <div className="equation-side products">
          {currentQuestion.products.terms.map((term, index) =>
            renderTerm(
              term.element,
              currentQuestion.userCoefficients[reactantCount + index],
              term.coefficient,
              currentQuestion.submitted,
              currentQuestion.isCorrect,
              reactantCount + index,
              index === 0
            )
          )}
        </div>
      </div>

      {currentQuestion.submitted && (
        <div className={`result-feedback ${currentQuestion.isCorrect ? 'success' : currentQuestion.isCorrect === false ? 'error' : 'skipped'}`}>
          {currentQuestion.isCorrect ? '✅ 回答正确！+10分' : currentQuestion.isCorrect === false ? '❌ 回答错误，正确答案已标出' : '⏭️ 已跳过本题'}
        </div>
      )}

      <div className="action-buttons">
        {!currentQuestion.submitted ? (
          <>
            <button
              className="skip-btn"
              onClick={handleSkip}
              disabled={skipChances <= 0}
            >
              跳过 ({skipChances})
            </button>
            <button className="submit-btn" onClick={handleSubmit}>
              提交答案
            </button>
          </>
        ) : (
          <button className="next-btn" onClick={handleNext}>
            {currentIndex >= questions.length - 1 ? '查看结果' : '下一题 →'}
          </button>
        )}
      </div>
    </div>
  );
};

export default EquationChallenge;
