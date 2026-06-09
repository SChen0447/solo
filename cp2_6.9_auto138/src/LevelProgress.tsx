import React, { useEffect, useState } from 'react';

interface LevelProgressProps {
  currentLevel: number;
  totalLevels: number;
  lives: number;
  maxLives?: number;
  onLifeLost?: () => void;
}

const LevelProgress: React.FC<LevelProgressProps> = ({
  currentLevel,
  totalLevels,
  lives,
  maxLives = 3,
}) => {
  const [animatingLives, setAnimatingLives] = useState<boolean[]>(
    new Array(maxLives).fill(false)
  );
  const [prevLives, setPrevLives] = useState(lives);

  useEffect(() => {
    if (lives < prevLives) {
      const lostIndex = lives;
      setAnimatingLives((prev) => {
        const newAnimating = [...prev];
        newAnimating[lostIndex] = true;
        return newAnimating;
      });
      setTimeout(() => {
        setAnimatingLives((prev) => {
          const newAnimating = [...prev];
          newAnimating[lostIndex] = false;
          return newAnimating;
        });
      }, 800);
    }
    setPrevLives(lives);
  }, [lives, prevLives]);

  const progress = totalLevels > 0 ? (currentLevel / totalLevels) * 100 : 0;

  return (
    <div style={styles.container}>
      <div style={styles.livesContainer}>
        {Array.from({ length: maxLives }, (_, index) => (
          <span
            key={index}
            style={{
              ...styles.heart,
              ...(index >= lives ? styles.heartLost : {}),
              ...(animatingLives[index] ? styles.heartAnimating : {}),
            }}
          >
            ❤️
          </span>
        ))}
      </div>

      <div style={styles.progressBarContainer}>
        <div style={styles.progressBar}>
          <div
            style={{
              ...styles.progressFill,
              width: `${progress}%`,
            }}
          />
        </div>
        <span style={styles.levelText}>
          关卡 {currentLevel} / {totalLevels}
        </span>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 20px',
    background: 'linear-gradient(135deg, rgba(167, 139, 250, 0.1), rgba(124, 58, 237, 0.1))',
    borderBottom: '1px solid rgba(167, 139, 250, 0.2)',
  },
  livesContainer: {
    display: 'flex',
    gap: '6px',
  },
  heart: {
    fontSize: '22px',
    transition: 'all 0.3s ease',
  },
  heartLost: {
    opacity: 0.3,
    filter: 'grayscale(100%)',
    transform: 'scale(0.8)',
  },
  heartAnimating: {
    animation: 'heartbeat 0.3s ease-in-out, redFlash 0.5s ease-in-out',
  },
  progressBarContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
    maxWidth: '400px',
    marginLeft: '20px',
  },
  progressBar: {
    flex: 1,
    height: '10px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '5px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #A78BFA, #7C3AED)',
    borderRadius: '5px',
    transition: 'width 0.4s ease',
  },
  levelText: {
    color: '#B0B0B8',
    fontSize: '14px',
    fontWeight: 500,
    minWidth: '80px',
    textAlign: 'right',
  },
};

export default LevelProgress;
