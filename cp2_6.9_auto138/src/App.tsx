import React, { useState, useCallback } from 'react';
import { WordService, WordResponse, SubmitResponse } from './WordService';
import LevelProgress from './LevelProgress';
import GameBoard from './GameBoard';

type GameState = 'ready' | 'playing' | 'result';

interface GameData {
  currentLevel: number;
  totalLevels: number;
  lives: number;
  score: number;
  word: string;
  meaning: string;
  level: 'CET-4' | 'CET-6' | 'KAOYAN';
  totalQuestions: number;
  correctAnswers: number;
  consecutiveCorrect: number;
}

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>('ready');
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const startGame = useCallback(async () => {
    setIsLoading(true);
    try {
      const response: WordResponse = await WordService.resetGame();
      if (response.word && response.meaning && response.level) {
        setGameData({
          currentLevel: response.currentLevel || 1,
          totalLevels: response.totalLevels || 15,
          lives: response.lives || 3,
          score: response.score || 0,
          word: response.word,
          meaning: response.meaning,
          level: response.level,
          totalQuestions: 0,
          correctAnswers: 0,
          consecutiveCorrect: 0,
        });
        setGameState('playing');
      }
    } catch (error) {
      console.error('Failed to start game:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSubmit = useCallback(async (answer: string) => {
    if (!gameData) return;

    try {
      const response: SubmitResponse = await WordService.submitAnswer(answer);

      if (response.correct) {
        const newConsecutive = gameData.consecutiveCorrect + 1;
        let bonusScore = 0;
        if (newConsecutive > 0 && newConsecutive % 3 === 0) {
          bonusScore = 5;
        }

        if (response.gameOver) {
          setGameData({
            ...gameData,
            score: (response.score || gameData.score) + bonusScore,
            totalQuestions: response.totalQuestions || gameData.totalQuestions + 1,
            correctAnswers: response.correctAnswers || gameData.correctAnswers + 1,
            consecutiveCorrect: newConsecutive,
          });
          setGameState('result');
        } else if (response.nextWord && response.nextMeaning && response.nextLevel) {
          const nextWord = response.nextWord;
          const nextMeaning = response.nextMeaning;
          const nextLevel = response.nextLevel;
          setIsFlipping(true);
          setTimeout(() => {
            setGameData({
              currentLevel: response.currentLevel || gameData.currentLevel + 1,
              totalLevels: response.totalLevels || gameData.totalLevels,
              lives: response.lives ?? gameData.lives,
              score: (response.score || gameData.score) + bonusScore,
              word: nextWord,
              meaning: nextMeaning,
              level: nextLevel,
              totalQuestions: response.totalQuestions || gameData.totalQuestions + 1,
              correctAnswers: response.correctAnswers || gameData.correctAnswers + 1,
              consecutiveCorrect: newConsecutive,
            });
            setIsFlipping(false);
          }, 300);
        }
      } else {
        const newLives = (response.lives ?? gameData.lives - 1);

        if (response.gameOver || newLives <= 0) {
          setGameData({
            ...gameData,
            lives: 0,
            totalQuestions: response.totalQuestions || gameData.totalQuestions + 1,
            consecutiveCorrect: 0,
          });
          setTimeout(() => {
            setGameState('result');
          }, 500);
        } else if (response.nextWord && response.nextMeaning && response.nextLevel) {
          const nextWord = response.nextWord;
          const nextMeaning = response.nextMeaning;
          const nextLevel = response.nextLevel;
          setIsFlipping(true);
          setTimeout(() => {
            setGameData({
              currentLevel: response.currentLevel || gameData.currentLevel + 1,
              totalLevels: response.totalLevels || gameData.totalLevels,
              lives: newLives,
              score: response.score || gameData.score,
              word: nextWord,
              meaning: nextMeaning,
              level: nextLevel,
              totalQuestions: response.totalQuestions || gameData.totalQuestions + 1,
              correctAnswers: response.correctAnswers || gameData.correctAnswers,
              consecutiveCorrect: 0,
            });
            setIsFlipping(false);
          }, 300);
        } else {
          setGameData({
            ...gameData,
            lives: newLives,
            totalQuestions: response.totalQuestions || gameData.totalQuestions + 1,
            consecutiveCorrect: 0,
          });
        }
      }
    } catch (error) {
      console.error('Failed to submit answer:', error);
    }
  }, [gameData]);

  const getLevelStyle = (level: string): React.CSSProperties => {
    const styles: Record<string, React.CSSProperties> = {
      'CET-4': { background: '#34D399', color: '#000' },
      'CET-6': { background: '#60A5FA', color: '#000' },
      'KAOYAN': { background: '#A78BFA', color: '#000' },
    };
    return styles[level] || {};
  };

  const accuracy = gameData && gameData.totalQuestions > 0
    ? Math.round((gameData.correctAnswers / gameData.totalQuestions) * 100)
    : 0;

  const handleRestart = () => {
    setGameState('ready');
    setGameData(null);
  };

  return (
    <div style={styles.app}>
      <div style={styles.topProgressBar} />

      <div style={styles.content}>
        {gameState === 'ready' && (
          <div style={styles.readyCard}>
            <h1 style={styles.title}>📚 词汇闯关拼写测试</h1>
            <p style={styles.subtitle}>听单词发音，输入正确拼写，闯关晋级！</p>
            <div style={styles.rulesContainer}>
              <div style={styles.ruleItem}>
                <span style={styles.ruleIcon}>🎯</span>
                <span>共15关，难度逐级递增</span>
              </div>
              <div style={styles.ruleItem}>
                <span style={styles.ruleIcon}>❤️</span>
                <span>3条生命值，拼错扣1条</span>
              </div>
              <div style={styles.ruleItem}>
                <span style={styles.ruleIcon}>⏱️</span>
                <span>每关15秒限时答题</span>
              </div>
              <div style={styles.ruleItem}>
                <span style={styles.ruleIcon}>🔥</span>
                <span>连续答对3关额外+5分</span>
              </div>
            </div>
            <button
              onClick={startGame}
              disabled={isLoading}
              style={{
                ...styles.startButton,
                ...(isLoading ? styles.startButtonLoading : {}),
              }}
            >
              {isLoading ? (
                <span style={styles.loadingIcon}></span>
              ) : (
                '开始闯关'
              )}
            </button>
          </div>
        )}

        {gameState === 'playing' && gameData && (
          <>
            <LevelProgress
              currentLevel={gameData.currentLevel}
              totalLevels={gameData.totalLevels}
              lives={gameData.lives}
              maxLives={3}
            />
            <div style={styles.gameArea}>
              <GameBoard
                word={gameData.word}
                meaning={gameData.meaning}
                level={gameData.level}
                score={gameData.score}
                onSubmit={handleSubmit}
                isFlipping={isFlipping}
              />
              <div style={styles.difficultyContainer}>
                <span style={{ ...styles.difficultyBadge, ...getLevelStyle(gameData.level) }}>
                  当前难度：{gameData.level}
                </span>
              </div>
            </div>
          </>
        )}

        {gameState === 'result' && gameData && (
          <div style={styles.resultCard}>
            <h2 style={styles.resultTitle}>🎉 游戏结束</h2>
            <div style={styles.scoreDisplay}>
              <span style={styles.finalScoreLabel}>最终得分</span>
              <span style={styles.finalScore}>{gameData.score}</span>
            </div>
            <div style={styles.statsContainer}>
              <div style={styles.statItem}>
                <span style={styles.statValue}>{gameData.correctAnswers}</span>
                <span style={styles.statLabel}>答对</span>
              </div>
              <div style={styles.statDivider} />
              <div style={styles.statItem}>
                <span style={styles.statValue}>{gameData.totalQuestions}</span>
                <span style={styles.statLabel}>总题数</span>
              </div>
              <div style={styles.statDivider} />
              <div style={styles.statItem}>
                <span style={{ ...styles.statValue, color: '#A78BFA' }}>{accuracy}%</span>
                <span style={styles.statLabel}>正确率</span>
              </div>
            </div>
            <div style={styles.levelReached}>
              <span>到达关卡：</span>
              <span style={styles.levelReachedValue}>
                {gameData.currentLevel} / {gameData.totalLevels}
              </span>
            </div>
            <button onClick={handleRestart} style={styles.restartButton}>
              再玩一次
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: '100vh',
    background: '#181825',
    display: 'flex',
    flexDirection: 'column',
  },
  topProgressBar: {
    height: '30px',
    background: 'linear-gradient(90deg, #A78BFA, #7C3AED)',
    boxShadow: '0 2px 10px rgba(167, 139, 250, 0.3)',
  },
  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  readyCard: {
    margin: 'auto',
    width: '90%',
    maxWidth: '480px',
    padding: '40px 32px',
    background: 'rgba(30, 30, 46, 0.7)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(167, 139, 250, 0.2)',
    textAlign: 'center',
    animation: 'popIn 0.4s ease-out',
  },
  title: {
    fontSize: '28px',
    color: '#FFFFFF',
    marginBottom: '12px',
  },
  subtitle: {
    fontSize: '16px',
    color: '#B0B0B8',
    marginBottom: '28px',
  },
  rulesContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '32px',
    textAlign: 'left',
  },
  ruleItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '14px',
    color: '#B0B0B8',
  },
  ruleIcon: {
    fontSize: '20px',
  },
  startButton: {
    width: '100%',
    padding: '14px 32px',
    background: 'linear-gradient(135deg, #A78BFA, #7C3AED)',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    fontSize: '18px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  startButtonLoading: {
    opacity: 0.7,
    cursor: 'not-allowed',
  },
  loadingIcon: {
    width: '20px',
    height: '20px',
    border: '2px solid transparent',
    borderTopColor: '#FFFFFF',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  gameArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px 0',
    gap: '20px',
  },
  difficultyContainer: {
    display: 'flex',
    justifyContent: 'center',
  },
  difficultyBadge: {
    padding: '6px 16px',
    borderRadius: '16px',
    fontSize: '14px',
    fontWeight: 600,
  },
  resultCard: {
    margin: 'auto',
    width: '90%',
    maxWidth: '480px',
    padding: '40px 32px',
    background: 'rgba(30, 30, 46, 0.7)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(167, 139, 250, 0.2)',
    textAlign: 'center',
    animation: 'popIn 0.4s ease-out',
  },
  resultTitle: {
    fontSize: '28px',
    color: '#FFFFFF',
    marginBottom: '24px',
  },
  scoreDisplay: {
    marginBottom: '28px',
  },
  finalScoreLabel: {
    display: 'block',
    fontSize: '14px',
    color: '#B0B0B8',
    marginBottom: '8px',
  },
  finalScore: {
    fontSize: '56px',
    fontWeight: 'bold',
    color: '#FFD700',
    textShadow: '0 0 20px rgba(255, 215, 0, 0.3)',
  },
  statsContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '20px',
    marginBottom: '24px',
    padding: '20px',
    background: 'rgba(255, 255, 255, 0.03)',
    borderRadius: '8px',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    flex: 1,
  },
  statValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: '12px',
    color: '#B0B0B8',
  },
  statDivider: {
    width: '1px',
    height: '40px',
    background: 'rgba(255, 255, 255, 0.1)',
  },
  levelReached: {
    fontSize: '14px',
    color: '#B0B0B8',
    marginBottom: '28px',
  },
  levelReachedValue: {
    fontWeight: 'bold',
    color: '#A78BFA',
    marginLeft: '4px',
  },
  restartButton: {
    width: '100%',
    padding: '14px 32px',
    background: 'linear-gradient(135deg, #A78BFA, #7C3AED)',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    fontSize: '18px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
};

export default App;
