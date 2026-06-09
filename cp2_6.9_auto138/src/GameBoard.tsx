import React, { useState, useEffect, useRef, useCallback } from 'react';

interface GameBoardProps {
  word: string;
  meaning: string;
  level: 'CET-4' | 'CET-6' | 'KAOYAN';
  score: number;
  onSubmit: (answer: string) => Promise<void>;
  isFlipping: boolean;
}

const GameBoard: React.FC<GameBoardProps> = ({
  word,
  meaning,
  level,
  score,
  onSubmit,
  isFlipping,
}) => {
  const [input, setInput] = useState('');
  const [timeLeft, setTimeLeft] = useState(15);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showBonus, setShowBonus] = useState(false);
  const [scoreAnimating, setScoreAnimating] = useState(false);
  const [prevScore, setPrevScore] = useState(score);
  const timerRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInput('');
    setTimeLeft(15);
    startTimer();
    inputRef.current?.focus();
  }, [word]);

  useEffect(() => {
    if (score > prevScore) {
      setScoreAnimating(true);
      setTimeout(() => setScoreAnimating(false), 200);
      if (score - prevScore === 15) {
        setShowBonus(true);
        setTimeout(() => setShowBonus(false), 1500);
      }
    }
    setPrevScore(score);
  }, [score, prevScore]);

  const startTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    timerRef.current = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0.1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const speakWord = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      setIsPlaying(true);
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);
      window.speechSynthesis.speak(utterance);
    }
  }, [word]);

  const handleSubmit = async () => {
    if (!input.trim() || isLoading || timeLeft <= 0) return;

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    setIsLoading(true);
    try {
      await onSubmit(input.toLowerCase());
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const progressPercent = (timeLeft / 15) * 100;
  const progressColor = progressPercent > 50
    ? '#34D399'
    : progressPercent > 25
    ? '#FBBF24'
    : '#F87171';

  const levelStyle: Record<string, React.CSSProperties> = {
    'CET-4': { background: '#34D399', color: '#000' },
    'CET-6': { background: '#60A5FA', color: '#000' },
    'KAOYAN': { background: '#A78BFA', color: '#000' },
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.scoreContainer}>
        <span style={styles.scoreLabel}>得分</span>
        <span
          style={{
            ...styles.scoreValue,
            ...(scoreAnimating ? styles.scoreAnimating : {}),
          }}
        >
          {score}
        </span>
      </div>

      <div
        style={{
          ...styles.card,
          animation: isFlipping ? 'flipCard 0.6s ease-in-out' : undefined,
          transformStyle: 'preserve-3d',
        }}
      >
        <div style={styles.levelBadgeContainer}>
          <span style={{ ...styles.levelBadge, ...levelStyle[level] }}>
            {level}
          </span>
        </div>

        <button
          onClick={speakWord}
          disabled={isPlaying}
          style={{
            ...styles.speakButton,
            ...(isPlaying ? styles.speakButtonActive : {}),
          }}
        >
          <span style={styles.speakIcon}>{isPlaying ? '🔊' : '🔈'}</span>
          <span style={styles.speakText}>听读音</span>
        </button>

        <p style={styles.meaningText}>{meaning}</p>

        <div style={styles.inputContainer}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value.toLowerCase())}
            onKeyDown={handleKeyDown}
            placeholder="输入单词拼写..."
            style={styles.input}
            disabled={isLoading || timeLeft <= 0}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          {showBonus && (
            <div style={styles.bonusFloat}>+5 连击奖励!</div>
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={isLoading || !input.trim() || timeLeft <= 0}
          style={{
            ...styles.submitButton,
            ...((isLoading || !input.trim() || timeLeft <= 0)
              ? styles.submitButtonDisabled
              : {}),
          }}
        >
          {isLoading ? (
            <span style={styles.loadingSpinner}></span>
          ) : (
            '提交答案'
          )}
        </button>

        <div style={styles.timerContainer}>
          <div style={styles.timerBar}>
            <div
              style={{
                ...styles.timerFill,
                width: `${progressPercent}%`,
                backgroundColor: progressColor,
              }}
            />
          </div>
          <span style={styles.timerText}>
            {Math.ceil(timeLeft)}s
          </span>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    position: 'relative',
    width: '100%',
    maxWidth: '480px',
    padding: '0 20px',
  },
  scoreContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    marginBottom: '20px',
  },
  scoreLabel: {
    fontSize: '16px',
    color: '#B0B0B8',
  },
  scoreValue: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#FFFFFF',
    transition: 'all 0.2s ease',
  },
  scoreAnimating: {
    animation: 'scoreFloat 0.2s ease-out forwards',
  },
  card: {
    width: '100%',
    minHeight: '300px',
    padding: '28px 24px',
    background: 'rgba(30, 30, 46, 0.7)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(167, 139, 250, 0.2)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    perspective: '1000px',
  },
  levelBadgeContainer: {
    position: 'absolute',
    top: '12px',
    right: '12px',
  },
  levelBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 600,
  },
  speakButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 28px',
    background: 'linear-gradient(135deg, #A78BFA, #7C3AED)',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    marginTop: '10px',
  },
  speakButtonActive: {
    transform: 'scale(1.05)',
    boxShadow: '0 0 20px rgba(167, 139, 250, 0.5)',
  },
  speakIcon: {
    fontSize: '20px',
  },
  speakText: {
    fontSize: '16px',
  },
  meaningText: {
    fontSize: '18px',
    color: '#B0B0B8',
    textAlign: 'center',
  },
  inputContainer: {
    width: '100%',
    position: 'relative',
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '18px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '2px solid rgba(167, 139, 250, 0.3)',
    borderRadius: '8px',
    color: '#FFFFFF',
    outline: 'none',
    transition: 'all 0.2s ease',
    textAlign: 'center',
    letterSpacing: '2px',
  },
  bonusFloat: {
    position: 'absolute',
    left: '50%',
    top: '0',
    transform: 'translateX(-50%)',
    color: '#FFD700',
    fontWeight: 'bold',
    fontSize: '18px',
    animation: 'floatUp 1.5s ease-out forwards',
    pointerEvents: 'none',
    whiteSpace: 'nowrap',
  },
  submitButton: {
    width: '100%',
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #34D399, #059669)',
    color: '#000',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  submitButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
    background: 'rgba(52, 211, 153, 0.3)',
  },
  loadingSpinner: {
    width: '18px',
    height: '18px',
    border: '2px solid transparent',
    borderTopColor: '#000',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  timerContainer: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  timerBar: {
    flex: 1,
    height: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  timerFill: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.1s linear, background-color 0.3s ease',
  },
  timerText: {
    fontSize: '14px',
    color: '#B0B0B8',
    minWidth: '30px',
    textAlign: 'right',
    fontWeight: 600,
  },
};

export default GameBoard;
