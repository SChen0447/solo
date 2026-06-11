import React, { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import BeeDance from './components/BeeDance';
import HoneyMap from './components/HoneyMap';
import type {
  DanceInfo,
  DanceType,
  DistanceCategory,
  HoneyColor,
  NectarSource,
  QueenDance,
  GamePhase,
} from './types';

const MAP_SIZE = 400;
const GRID_COUNT = 6;
const CELL_SIZE = MAP_SIZE / GRID_COUNT;
const MAP_CENTER_X = MAP_SIZE / 2;
const MAP_CENTER_Y = MAP_SIZE / 2;
const NEAR_THRESHOLD = 140;

const INITIAL_HONEY_COLORS: HoneyColor[] = [
  { id: 'gold', name: '金蜜', color: '#f7c600', unlocked: true, unlockScore: 0 },
  { id: 'buckwheat', name: '荞麦蜜', color: '#8b4513', unlocked: false, unlockScore: 20 },
  { id: 'clover', name: '三叶草蜜', color: '#b0e57c', unlocked: false, unlockScore: 50 },
];

const TOTEM_ICONS = ['🐝', '🍯', '🌸', '👑'];

const computeAngle = (targetX: number, targetY: number): number => {
  const dx = targetX - MAP_CENTER_X;
  const dy = targetY - MAP_CENTER_Y;
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
  return ((angle % 360) + 360) % 360;
};

const computeDistance = (x: number, y: number): number => {
  return Math.sqrt(Math.pow(x - MAP_CENTER_X, 2) + Math.pow(y - MAP_CENTER_Y, 2));
};

const gridToPixel = (gridX: number, gridY: number): { x: number; y: number } => ({
  x: gridX * CELL_SIZE + CELL_SIZE / 2,
  y: gridY * CELL_SIZE + CELL_SIZE / 2,
});

const generateDanceInfo = (): {
  danceInfo: DanceInfo;
  correctGridX: number;
  correctGridY: number;
} => {
  let gridX: number, gridY: number;
  do {
    gridX = Math.floor(Math.random() * GRID_COUNT);
    gridY = Math.floor(Math.random() * GRID_COUNT);
  } while (gridX === 2 && gridY === 2);

  const pixel = gridToPixel(gridX, gridY);
  const distance = computeDistance(pixel.x, pixel.y);
  const distanceCategory: DistanceCategory = distance < NEAR_THRESHOLD ? 'near' : 'far';
  const waggleAngle = computeAngle(pixel.x, pixel.y);
  const stepFrequency = distanceCategory === 'near' ? 0.8 : 2.0;
  const danceTypes: DanceType[] = ['figure8', 'round'];
  const danceType = danceTypes[Math.floor(Math.random() * danceTypes.length)];

  return {
    danceInfo: {
      danceType,
      waggleAngle,
      stepFrequency,
      distanceCategory,
      nectarGridX: gridX,
      nectarGridY: gridY,
      nectarPixelX: pixel.x,
      nectarPixelY: pixel.y,
    },
    correctGridX: gridX,
    correctGridY: gridY,
  };
};

const generateQueenDances = (): {
  queenDances: QueenDance[];
  correctGridX: number;
  correctGridY: number;
  correctDanceIndex: number;
} => {
  const correctData = generateDanceInfo();
  const correctDanceIndex = Math.floor(Math.random() * 2);

  let wrongGridX: number, wrongGridY: number;
  do {
    wrongGridX = Math.floor(Math.random() * GRID_COUNT);
    wrongGridY = Math.floor(Math.random() * GRID_COUNT);
  } while (
    (wrongGridX === correctData.correctGridX && wrongGridY === correctData.correctGridY) ||
    (wrongGridX === 2 && wrongGridY === 2)
  );

  const wrongPixel = gridToPixel(wrongGridX, wrongGridY);
  const wrongDistance = computeDistance(wrongPixel.x, wrongPixel.y);
  const wrongCategory: DistanceCategory = wrongDistance < NEAR_THRESHOLD ? 'near' : 'far';
  const wrongAngle = computeAngle(wrongPixel.x, wrongPixel.y);
  const wrongFreq = wrongCategory === 'near' ? 0.8 : 2.0;

  const danceTypes: DanceType[] = ['figure8', 'round'];
  const wrongDance: QueenDance = {
    danceType: danceTypes[Math.floor(Math.random() * danceTypes.length)],
    waggleAngle: wrongAngle,
    stepFrequency: wrongFreq,
    distanceCategory: wrongCategory,
    nectarGridX: wrongGridX,
    nectarGridY: wrongGridY,
    nectarPixelX: wrongPixel.x,
    nectarPixelY: wrongPixel.y,
    pathColor: '#aaff44',
    isCorrect: false,
  };

  const correctDance: QueenDance = {
    ...correctData.danceInfo,
    pathColor: '#ffcc00',
    isCorrect: true,
  };

  const queenDances =
    correctDanceIndex === 0
      ? [correctDance, wrongDance]
      : [wrongDance, correctDance];

  return {
    queenDances,
    correctGridX: correctData.correctGridX,
    correctGridY: correctData.correctGridY,
    correctDanceIndex,
  };
};

const App: React.FC = () => {
  const [phase, setPhase] = useState<GamePhase>('watching');
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [honeyColors, setHoneyColors] = useState<HoneyColor[]>(INITIAL_HONEY_COLORS);
  const [unlockedSlotAnim, setUnlockedSlotAnim] = useState<string | null>(null);

  const [danceInfo, setDanceInfo] = useState<DanceInfo | null>(null);
  const [queenDances, setQueenDances] = useState<QueenDance[]>([]);
  const [isQueenChallenge, setIsQueenChallenge] = useState(false);
  const [correctGridX, setCorrectGridX] = useState(-1);
  const [correctGridY, setCorrectGridY] = useState(-1);
  const [queenCorrectIndex, setQueenCorrectIndex] = useState(-1);

  const [nectarSources, setNectarSources] = useState<NectarSource[]>([]);
  const [correctCount, setCorrectCount] = useState(0);

  const [countdown, setCountdown] = useState(15);
  const countdownRef = useRef<number | null>(null);

  const [feedbackCell, setFeedbackCell] = useState<{
    gridX: number;
    gridY: number;
    correct: boolean;
  } | null>(null);

  const [flyingTarget, setFlyingTarget] = useState<{ x: number; y: number } | null>(null);

  const [totemPieces, setTotemPieces] = useState(0);
  const [showTotemComplete, setShowTotemComplete] = useState(false);

  const startNewRound = useCallback(() => {
    const shouldQueenChallenge = correctCount > 0 && correctCount % 10 === 0;

    if (shouldQueenChallenge) {
      const queenData = generateQueenDances();
      setQueenDances(queenData.queenDances);
      setCorrectGridX(queenData.correctGridX);
      setCorrectGridY(queenData.correctGridY);
      setQueenCorrectIndex(queenData.correctDanceIndex);
      setIsQueenChallenge(true);
      setDanceInfo(null);
      setCountdown(20);
    } else {
      const data = generateDanceInfo();
      setDanceInfo(data.danceInfo);
      setCorrectGridX(data.correctGridX);
      setCorrectGridY(data.correctGridY);
      setQueenDances([]);
      setQueenCorrectIndex(-1);
      setIsQueenChallenge(false);
      setCountdown(15);
    }

    setPhase('watching');
    setFeedbackCell(null);
  }, [correctCount]);

  useEffect(() => {
    startNewRound();
  }, []);

  const checkHoneyColorUnlocks = useCallback(
    (newScore: number) => {
      setHoneyColors((prev) => {
        const updated = prev.map((c) => {
          if (!c.unlocked && newScore >= c.unlockScore) {
            setUnlockedSlotAnim(c.id);
            setTimeout(() => setUnlockedSlotAnim(null), 600);
            return { ...c, unlocked: true };
          }
          return c;
        });
        return updated;
      });
    },
    []
  );

  const handleDanceEnd = useCallback(() => {
    setPhase('guessing');
  }, []);

  useEffect(() => {
    if (phase === 'guessing') {
      countdownRef.current = window.setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (countdownRef.current) {
              clearInterval(countdownRef.current);
              countdownRef.current = null;
            }
            setPhase('transition');
            setTimeout(() => startNewRound(), 600);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [phase, startNewRound]);

  const handleCellClick = useCallback(
    (gridX: number, gridY: number, pixelX: number, pixelY: number) => {
      if (phase !== 'guessing') return;
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }

      const isCorrect = gridX === correctGridX && gridY === correctGridY;
      setFeedbackCell({ gridX, gridY, correct: isCorrect });

      const scaleX = 240 / 400;
      const scaleY = 200 / 400;
      setFlyingTarget({
        x: 240 / 2 + (pixelX - 200) * scaleX,
        y: 200 / 2 + (pixelY - 200) * scaleY,
      });

      if (isCorrect) {
        setPhase('result');
        const pointsGain = isQueenChallenge ? 30 : 10;
        setScore((prev) => {
          const newScore = prev + pointsGain;
          const newLevel = Math.floor(newScore / 30) + 1;
          setLevel(newLevel);
          checkHoneyColorUnlocks(newScore);
          return newScore;
        });

        setCorrectCount((prev) => prev + 1);
        setNectarSources((prev) => [
          ...prev,
          {
            id: uuidv4(),
            gridX,
            gridY,
            pixelX,
            pixelY,
            unlocked: true,
          },
        ]);

        if (isQueenChallenge) {
          setTotemPieces((prev) => {
            const next = Math.min(prev + 1, 4);
            if (next === 4 && prev < 4) {
              setTimeout(() => setShowTotemComplete(true), 2500);
            }
            return next;
          });
        }
      }
    },
    [phase, correctGridX, correctGridY, isQueenChallenge, checkHoneyColorUnlocks]
  );

  const handleFlyComplete = useCallback(() => {
    setFlyingTarget(null);
  }, []);

  const handleFeedbackComplete = useCallback(() => {
    setFeedbackCell(null);
    if (phase === 'result' || feedbackCell?.correct === false) {
      setPhase('transition');
      setTimeout(() => startNewRound(), 600);
    }
  }, [phase, feedbackCell, startNewRound]);

  const currentCountdownLimit = isQueenChallenge ? 20 : 15;
  const isTimerWarning = countdown <= 5 && phase === 'guessing';

  return (
    <div className="app-container">
      <div className="status-bar">
        <div className="score-section">
          <span className="score-label">得分</span>
          <span className="score-value">{score}</span>
          <span className="level-badge">Lv.{level}</span>
        </div>

        <div className="honey-slots">
          <span className="slot-label">蜂蜜颜色</span>
          {honeyColors.map((c) => (
            <div
              key={c.id}
              className={`honey-slot ${c.unlocked ? 'unlocked' : ''} ${
                unlockedSlotAnim === c.id ? 'unlocked' : ''
              }`}
              style={
                c.unlocked
                  ? {
                      backgroundColor: c.color,
                      color: c.id === 'buckwheat' ? '#fff' : '#6b4226',
                    }
                  : {}
              }
              title={c.unlocked ? c.name : `${c.name} (${c.unlockScore}分解锁)`}
            >
              {c.unlocked ? c.name.charAt(0) : '?'}
            </div>
          ))}

          {totemPieces > 0 && (
            <div className="totem-section">
              {TOTEM_ICONS.map((icon, idx) => (
                <div
                  key={idx}
                  className={`totem-piece ${idx < totemPieces ? 'collected' : ''}`}
                >
                  {idx < totemPieces ? icon : '?'}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="game-area">
        {isQueenChallenge && (
          <div className="queen-challenge-banner">
            👑 蜂后考验！20秒内识别真实蜜源路径 👑
          </div>
        )}

        <div className="dance-section">
          <div className="dance-container">
            <BeeDance
              phase={phase}
              danceInfo={danceInfo}
              queenDances={queenDances}
              isQueenChallenge={isQueenChallenge}
              onDanceEnd={handleDanceEnd}
              flyingTarget={flyingTarget}
              onFlyComplete={handleFlyComplete}
            />
          </div>

          <div
            className={`timer-display ${isTimerWarning ? 'warning' : ''}`}
          >
            {phase === 'guessing' ? countdown : phase === 'watching' ? '👀' : '...'}
          </div>
        </div>

        <div className="hint-text">
          {phase === 'watching'
            ? isQueenChallenge
              ? '观察两条舞蹈路径，金黄色#ffcc00和淡绿色#aaff44，判断哪条指向真实蜜源...'
              : '观察蜜蜂的舞蹈：圆舞/8字舞路径、摆尾角度（方向）、舞步频率（距离）...'
            : phase === 'guessing'
            ? '请在地图上点击你认为的蜜源位置！'
            : '准备下一轮...'}
        </div>

        <div className="map-section">
          <div className="map-info">
            {isQueenChallenge ? '蜂后考验：识别正确路径对应位置' : '户外草地蜜源地图 · 6×6网格'}
          </div>
          <HoneyMap
            nectarSources={nectarSources}
            canClick={phase === 'guessing'}
            correctGridX={correctGridX}
            correctGridY={correctGridY}
            onCellClick={handleCellClick}
            feedbackCell={feedbackCell}
            onFeedbackComplete={handleFeedbackComplete}
          />
        </div>

        {showTotemComplete && (
          <div className="totem-complete">
            <h2>🏆 蜂巢图腾已集齐！🏆</h2>
            <div className="totem-display">
              🐝 🍯 🌸 👑
            </div>
            <p style={{ color: '#6b4226', fontSize: '14px' }}>
              你已成为真正的蜂语大师！
            </p>
            <button
              onClick={() => setShowTotemComplete(false)}
              style={{
                marginTop: '12px',
                padding: '8px 24px',
                background: '#c78a2c',
                color: '#fff',
                border: '2px solid #6b4226',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '14px',
              }}
            >
              继续游戏
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
