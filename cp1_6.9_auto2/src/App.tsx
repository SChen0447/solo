import { useEffect, useRef, useState, useCallback } from 'react';
import BikeGame from './BikeGame';

interface GameState {
  score: number;
  fuel: number;
  distance: number;
  isGameOver: boolean;
  isPlaying: boolean;
  finalScore: number;
}

const initialState: GameState = {
  score: 0,
  fuel: 100,
  distance: 0,
  isGameOver: false,
  isPlaying: false,
  finalScore: 0
};

export default function App() {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<BikeGame | null>(null);
  const [gameState, setGameState] = useState<GameState>(initialState);
  const [scorePulse, setScorePulse] = useState(false);

  useEffect(() => {
    if (!gameContainerRef.current || gameRef.current) return;

    const game = new BikeGame(gameContainerRef.current, (event, data) => {
      if (event === 'scoreUpdate') {
        setGameState(prev => ({ ...prev, score: data!.score, distance: data!.distance }));
        setScorePulse(true);
        setTimeout(() => setScorePulse(false), 300);
      } else if (event === 'fuelUpdate') {
        setGameState(prev => ({ ...prev, fuel: data!.fuel }));
      } else if (event === 'gameOver') {
        setGameState(prev => ({
          ...prev,
          isGameOver: true,
          isPlaying: false,
          finalScore: data!.score
        }));
      } else if (event === 'gameStart') {
        setGameState({
          ...initialState,
          isPlaying: true
        });
      }
    });

    gameRef.current = game;

    return () => {
      game.destroy();
      gameRef.current = null;
    };
  }, []);

  const handleStart = useCallback(() => {
    gameRef.current?.start();
  }, []);

  const handleRestart = useCallback(() => {
    setGameState({ ...initialState, isPlaying: true });
    gameRef.current?.restart();
  }, []);

  const fuelColor = gameState.fuel > 60 ? '#ffd700' : gameState.fuel > 30 ? '#ff8c00' : '#8b0000';
  const fuelGradient = `linear-gradient(90deg, ${fuelColor} ${gameState.fuel}%, #2a2a2a ${gameState.fuel}%)`;

  return (
    <div style={styles.container}>
      <div style={styles.gameWrapper}>
        <div style={styles.hudTop}>
          <div style={{ ...styles.scorePanel, transform: scorePulse ? 'scale(1.1)' : 'scale(1)' }}>
            <div style={styles.scoreLabel}>距离</div>
            <div style={styles.scoreValue}>{Math.floor(gameState.distance)}m</div>
          </div>
          <div style={styles.scorePanel}>
            <div style={styles.scoreLabel}>分数</div>
            <div style={{ ...styles.scoreValue, transform: scorePulse ? 'scale(1.15)' : 'scale(1)', color: scorePulse ? '#ffd700' : '#d4a574' }}>
              {gameState.score}
            </div>
          </div>
          <div style={styles.fuelPanel}>
            <div style={styles.fuelLabel}>燃料</div>
            <div style={{ ...styles.fuelBar, background: fuelGradient }}>
              <div style={styles.fuelBarInner}>
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} style={{ ...styles.fuelTick, opacity: i < Math.ceil(gameState.fuel / 10) ? 0.8 : 0.1 }} />
                ))}
              </div>
            </div>
            <div style={{ ...styles.fuelValue, color: fuelColor }}>{Math.floor(gameState.fuel)}%</div>
          </div>
        </div>

        <div ref={gameContainerRef} style={styles.gameCanvas} />

        <div style={styles.hudBottom}>
          <div style={styles.controlHint}>
            <span style={styles.hintKey}>←/→</span> 左右移动
            <span style={styles.hintDivider}>|</span>
            <span style={styles.hintKey}>空格/点击</span> 跳跃
          </div>
        </div>

        {!gameState.isPlaying && !gameState.isGameOver && (
          <div style={styles.overlay}>
            <div style={styles.menuBox}>
              <h1 style={styles.title}>废土狂飙</h1>
              <p style={styles.subtitle}>WASTELAND BIKE</p>
              <div style={styles.divider} />
              <p style={styles.description}>
                在末日废土中驾驶改装机车<br />
                躲避残骸，收集燃料，生存下去
              </p>
              <button style={styles.startButton} onClick={handleStart}>
                <span style={styles.buttonText}>开始游戏</span>
              </button>
              <div style={styles.controlsBox}>
                <div style={styles.controlRow}>
                  <span style={styles.controlKey}>← →</span>
                  <span style={styles.controlDesc}>左右移动</span>
                </div>
                <div style={styles.controlRow}>
                  <span style={styles.controlKey}>空格</span>
                  <span style={styles.controlDesc}>跳跃避障</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {gameState.isGameOver && (
          <div style={styles.overlay}>
            <div style={styles.gameOverBox}>
              <h2 style={styles.gameOverTitle}>引擎熄火</h2>
              <p style={styles.gameOverSubtitle}>ENGINE STOPPED</p>
              <div style={styles.divider} />
              <div style={styles.finalScoreBox}>
                <div style={styles.finalScoreLabel}>最终分数</div>
                <div style={styles.finalScoreValue}>{gameState.finalScore}</div>
              </div>
              <div style={styles.finalStats}>
                <div style={styles.statItem}>
                  <div style={styles.statLabel}>行驶距离</div>
                  <div style={styles.statValue}>{Math.floor(gameState.distance)}m</div>
                </div>
              </div>
              <button style={styles.restartButton} onClick={handleRestart}>
                <span style={styles.buttonText}>重新启动</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: 'radial-gradient(ellipse at center, #1a1410 0%, #0a0806 70%, #000 100%)',
    overflow: 'hidden',
    position: 'relative'
  },
  gameWrapper: {
    position: 'relative',
    width: '100%',
    maxWidth: '1280px',
    height: '100%',
    maxHeight: '720px',
    aspectRatio: '16 / 9',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 0 60px rgba(139, 69, 19, 0.3), inset 0 0 80px rgba(0,0,0,0.5)',
    border: '3px solid #3d3028',
    borderRadius: '4px',
    overflow: 'hidden'
  },
  hudTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: '16px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
    zIndex: 10,
    background: 'linear-gradient(180deg, rgba(20,15,10,0.85) 0%, rgba(20,15,10,0) 100%)',
    pointerEvents: 'none'
  },
  scorePanel: {
    background: 'linear-gradient(180deg, #2a2018 0%, #1a1410 100%)',
    border: '2px solid #4a3a2a',
    borderRadius: '2px',
    padding: '8px 16px',
    minWidth: '100px',
    textAlign: 'center',
    boxShadow: 'inset 0 1px 0 rgba(255,200,150,0.1), 0 2px 8px rgba(0,0,0,0.5)',
    transition: 'transform 0.15s ease-out'
  },
  scoreLabel: {
    fontSize: '11px',
    color: '#8b7355',
    letterSpacing: '2px',
    textTransform: 'uppercase',
    fontFamily: 'Courier New, monospace'
  },
  scoreValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#d4a574',
    fontFamily: 'Courier New, monospace',
    textShadow: '0 0 10px rgba(212, 165, 116, 0.5)',
    transition: 'all 0.15s ease-out'
  },
  fuelPanel: {
    flex: 1,
    maxWidth: '300px',
    background: 'linear-gradient(180deg, #2a2018 0%, #1a1410 100%)',
    border: '2px solid #4a3a2a',
    borderRadius: '2px',
    padding: '8px 16px',
    boxShadow: 'inset 0 1px 0 rgba(255,200,150,0.1), 0 2px 8px rgba(0,0,0,0.5)'
  },
  fuelLabel: {
    fontSize: '11px',
    color: '#8b7355',
    letterSpacing: '2px',
    textTransform: 'uppercase',
    fontFamily: 'Courier New, monospace',
    marginBottom: '6px'
  },
  fuelBar: {
    height: '20px',
    borderRadius: '2px',
    position: 'relative',
    border: '1px solid #1a1008',
    overflow: 'hidden',
    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.6)'
  },
  fuelBarInner: {
    position: 'absolute',
    inset: 0,
    display: 'flex'
  },
  fuelTick: {
    flex: 1,
    borderRight: '1px solid rgba(0,0,0,0.4)',
    transition: 'opacity 0.3s ease'
  },
  fuelValue: {
    fontSize: '12px',
    fontFamily: 'Courier New, monospace',
    fontWeight: 'bold',
    textAlign: 'right',
    marginTop: '4px'
  },
  gameCanvas: {
    flex: 1,
    width: '100%',
    height: '100%',
    background: '#0a0806'
  },
  hudBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: '12px 24px',
    textAlign: 'center',
    zIndex: 10,
    background: 'linear-gradient(0deg, rgba(20,15,10,0.85) 0%, rgba(20,15,10,0) 100%)',
    pointerEvents: 'none'
  },
  controlHint: {
    color: '#6b5a4a',
    fontSize: '13px',
    fontFamily: 'Courier New, monospace',
    letterSpacing: '1px'
  },
  hintKey: {
    color: '#d4a574',
    padding: '2px 8px',
    background: 'rgba(60, 40, 30, 0.6)',
    borderRadius: '2px',
    margin: '0 4px'
  },
  hintDivider: {
    margin: '0 12px',
    color: '#4a3a2a'
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(10, 8, 6, 0.92)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    backdropFilter: 'blur(4px)'
  },
  menuBox: {
    background: 'linear-gradient(180deg, #2a2018 0%, #1a1410 100%)',
    border: '3px solid #5a4a3a',
    borderRadius: '4px',
    padding: '40px 60px',
    textAlign: 'center',
    boxShadow: '0 0 60px rgba(139, 69, 19, 0.4), inset 0 2px 0 rgba(255,200,150,0.1)',
    maxWidth: '480px',
    position: 'relative'
  },
  title: {
    fontSize: '48px',
    fontWeight: 'bold',
    color: '#d4a574',
    fontFamily: 'Courier New, monospace',
    letterSpacing: '6px',
    textShadow: '0 0 30px rgba(212, 165, 116, 0.6), 0 4px 0 #1a0f08',
    margin: 0
  },
  subtitle: {
    fontSize: '14px',
    color: '#8b4513',
    letterSpacing: '8px',
    fontFamily: 'Courier New, monospace',
    marginTop: '4px'
  },
  divider: {
    height: '2px',
    background: 'linear-gradient(90deg, transparent 0%, #5a4a3a 20%, #5a4a3a 80%, transparent 100%)',
    margin: '24px 0'
  },
  description: {
    fontSize: '14px',
    color: '#8b7355',
    lineHeight: '1.8',
    fontFamily: 'Courier New, monospace',
    marginBottom: '28px'
  },
  startButton: {
    background: 'linear-gradient(180deg, #8b4513 0%, #5a2d0a 100%)',
    border: '2px solid #a0522d',
    borderRadius: '2px',
    padding: '14px 48px',
    cursor: 'pointer',
    boxShadow: '0 4px 0 #3a1d08, 0 6px 20px rgba(139, 69, 19, 0.5), inset 0 1px 0 rgba(255,200,150,0.2)',
    transition: 'all 0.15s ease',
    position: 'relative',
    overflow: 'hidden'
  },
  buttonText: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#ffd9a0',
    fontFamily: 'Courier New, monospace',
    letterSpacing: '4px',
    textShadow: '0 1px 0 #1a0f08'
  },
  controlsBox: {
    marginTop: '28px',
    paddingTop: '20px',
    borderTop: '1px solid #3a2a1a'
  },
  controlRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 0'
  },
  controlKey: {
    color: '#d4a574',
    fontSize: '13px',
    fontFamily: 'Courier New, monospace',
    padding: '3px 10px',
    background: 'rgba(60, 40, 30, 0.8)',
    borderRadius: '2px',
    border: '1px solid #4a3a2a'
  },
  controlDesc: {
    color: '#6b5a4a',
    fontSize: '13px',
    fontFamily: 'Courier New, monospace'
  },
  gameOverBox: {
    background: 'linear-gradient(180deg, #2a1818 0%, #1a0f0f 100%)',
    border: '3px solid #6b2a2a',
    borderRadius: '4px',
    padding: '40px 60px',
    textAlign: 'center',
    boxShadow: '0 0 60px rgba(139, 0, 0, 0.4), inset 0 2px 0 rgba(255,100,100,0.1)',
    maxWidth: '420px'
  },
  gameOverTitle: {
    fontSize: '36px',
    fontWeight: 'bold',
    color: '#b8860b',
    fontFamily: 'Courier New, monospace',
    letterSpacing: '4px',
    textShadow: '0 0 20px rgba(184, 134, 11, 0.5), 0 3px 0 #1a0f08',
    margin: 0
  },
  gameOverSubtitle: {
    fontSize: '12px',
    color: '#8b2020',
    letterSpacing: '6px',
    fontFamily: 'Courier New, monospace',
    marginTop: '4px'
  },
  finalScoreBox: {
    margin: '20px 0'
  },
  finalScoreLabel: {
    fontSize: '12px',
    color: '#6b5a4a',
    letterSpacing: '3px',
    fontFamily: 'Courier New, monospace'
  },
  finalScoreValue: {
    fontSize: '56px',
    fontWeight: 'bold',
    color: '#ffd700',
    fontFamily: 'Courier New, monospace',
    textShadow: '0 0 30px rgba(255, 215, 0, 0.6)',
    lineHeight: 1
  },
  finalStats: {
    display: 'flex',
    justifyContent: 'center',
    gap: '24px',
    marginBottom: '24px'
  },
  statItem: {
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid #3a2a1a',
    borderRadius: '2px',
    padding: '10px 20px'
  },
  statLabel: {
    fontSize: '10px',
    color: '#6b5a4a',
    letterSpacing: '2px',
    fontFamily: 'Courier New, monospace'
  },
  statValue: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#d4a574',
    fontFamily: 'Courier New, monospace'
  },
  restartButton: {
    background: 'linear-gradient(180deg, #5a4a2a 0%, #3a2d10 100%)',
    border: '2px solid #8b7355',
    borderRadius: '2px',
    padding: '12px 40px',
    cursor: 'pointer',
    boxShadow: '0 4px 0 #1a1208, 0 6px 20px rgba(90, 74, 42, 0.4), inset 0 1px 0 rgba(255,200,150,0.15)',
    transition: 'all 0.15s ease'
  }
};
