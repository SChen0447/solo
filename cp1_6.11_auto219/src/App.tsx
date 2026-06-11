import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CrystalBall } from './crystalBall';
import { SpiritSystem, Constellation, CONSTELLATIONS } from './spiritSystem';
import { v4 as uuidv4 } from 'uuid';

interface UnlockedSpirit {
  id: string;
  constellationId: string;
  name: string;
  color: string;
  divination: string;
  unlockedAt: number;
}

type GamePhase = 'idle' | 'gathering' | 'summoning' | 'revealing';

function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const crystalBallRef = useRef<CrystalBall | null>(null);
  const spiritSystemRef = useRef<SpiritSystem | null>(null);
  const energyIntervalRef = useRef<number | null>(null);
  const [energy, setEnergy] = useState(100);
  const [unlockedSpirits, setUnlockedSpirits] = useState<UnlockedSpirit[]>([]);
  const [currentDivination, setCurrentDivination] = useState<string | null>(null);
  const [currentSpirit, setCurrentSpirit] = useState<Constellation | null>(null);
  const [gamePhase, setGamePhase] = useState<GamePhase>('idle');
  const [isMobile, setIsMobile] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const spiritSystem = new SpiritSystem();
    spiritSystemRef.current = spiritSystem;

    const crystalBall = new CrystalBall({
      container: containerRef.current,
      spiritSystem
    });
    crystalBallRef.current = crystalBall;

    spiritSystem.setOnSummonCallback((constellation) => {
      handleSummon(constellation);
    });

    crystalBall.setOnClickCallback(() => {
      handleBallClick();
    });

    crystalBall.start();

    setTimeout(() => {
      setIsLoading(false);
      const loadingScreen = document.getElementById('loading');
      if (loadingScreen) {
        loadingScreen.classList.add('hidden');
        setTimeout(() => {
          if (loadingScreen.parentNode) {
            loadingScreen.parentNode.removeChild(loadingScreen);
          }
        }, 800);
      }
    }, 1000);

    return () => {
      crystalBall.dispose();
    };
  }, []);

  useEffect(() => {
    energyIntervalRef.current = window.setInterval(() => {
      setEnergy((prev) => {
        const recoveryRate = crystalBallRef.current?.isFastSpinning() ? 1 : 0.5;
        return Math.min(100, prev + recoveryRate);
      });
    }, 1000);

    return () => {
      if (energyIntervalRef.current) {
        clearInterval(energyIntervalRef.current);
      }
    };
  }, []);

  const handleSummon = useCallback((constellation: Constellation) => {
    if (energy < 20) return;

    setEnergy((prev) => prev - 20);
    setGamePhase('summoning');
    setCurrentSpirit(constellation);

    const divination = spiritSystemRef.current?.getRandomDivination(constellation) || '';
    setCurrentDivination(divination);

    const alreadyUnlocked = unlockedSpirits.some(
      (s) => s.constellationId === constellation.id
    );

    if (!alreadyUnlocked) {
      const newSpirit: UnlockedSpirit = {
        id: uuidv4(),
        constellationId: constellation.id,
        name: constellation.name,
        color: constellation.color,
        divination,
        unlockedAt: Date.now()
      };
      setUnlockedSpirits((prev) => [...prev.slice(0, 5), newSpirit]);
    }

    setTimeout(() => {
      setGamePhase('revealing');
    }, 1500);

    setTimeout(() => {
      setGamePhase('idle');
      setCurrentDivination(null);
      setCurrentSpirit(null);
    }, 6500);
  }, [energy, unlockedSpirits]);

  const handleBallClick = useCallback(() => {
    if (energy < 20) return;
    setGamePhase('gathering');
  }, [energy]);

  const handleSpiritClick = useCallback((spirit: UnlockedSpirit) => {
    const constellation = CONSTELLATIONS.find(
      (c) => c.id === spirit.constellationId
    );
    if (constellation && crystalBallRef.current) {
      crystalBallRef.current.replayConstellation(constellation);
    }
  }, []);

  const renderEnergyBar = () => {
    const circumference = 2 * Math.PI * 50;
    const strokeDashoffset = circumference - (energy / 100) * circumference;

    return (
      <motion.div
        className="energy-bar-container"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
      >
        <svg width="120" height="120" viewBox="0 0 120 120">
          <defs>
            <linearGradient id="energyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4a0e4e" />
              <stop offset="100%" stopColor="#b84dff" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <circle
            cx="60"
            cy="60"
            r="50"
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="8"
            transform="rotate(-90 60 60)"
          />
          <circle
            cx="60"
            cy="60"
            r="50"
            fill="none"
            stroke="url(#energyGradient)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            filter="url(#glow)"
            transform="rotate(-90 60 60)"
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
          <text
            x="60"
            y="65"
            textAnchor="middle"
            fill="#e6d5a8"
            fontSize="16"
            fontFamily="'Cinzel', serif"
          >
            {Math.round(energy)}%
          </text>
        </svg>
        <div className="energy-label">星尘能量</div>
      </motion.div>
    );
  };

  const renderCollectionPanel = () => {
    return (
      <motion.div
        className={`collection-panel ${isMobile ? 'mobile-drawer' : ''}`}
        initial={isMobile ? { y: '100%' } : { x: -100, opacity: 0 }}
        animate={isMobile ? (showDrawer ? { y: 0 } : { y: '100%' }) : { x: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      >
        <div className="panel-header">
          <span className="panel-title">星灵图鉴</span>
          <span className="panel-count">{unlockedSpirits.length}/6</span>
        </div>
        <div className="spirits-grid">
          {CONSTELLATIONS.map((constellation) => {
            const unlocked = unlockedSpirits.find(
              (s) => s.constellationId === constellation.id
            );
            return (
              <motion.div
                key={constellation.id}
                className={`spirit-badge ${unlocked ? 'unlocked' : 'locked'}`}
                whileHover={unlocked ? { scale: 1.1 } : {}}
                whileTap={unlocked ? { scale: 0.95 } : {}}
                onClick={() => unlocked && handleSpiritClick(unlocked)}
                style={unlocked ? { '--spirit-color': constellation.color } as React.CSSProperties : {}}
              >
                {unlocked ? (
                  <div className="badge-glow" />
                ) : (
                  <div className="badge-lock">?</div>
                )}
                <span className="badge-name">
                  {unlocked ? constellation.name : '???'}
                </span>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    );
  };

  const renderDivination = () => {
    return (
      <AnimatePresence>
        {currentDivination && currentSpirit && (
          <motion.div
            className="divination-container"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.5 }}
          >
            <div className="divination-spirit-name" style={{ color: currentSpirit.color }}>
              {currentSpirit.name}
            </div>
            <div className="divination-text">
              「{currentDivination}」
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  };

  const renderFloorGlow = () => {
    return (
      <div className="floor-glow" />
    );
  };

  return (
    <div className="app-container">
      <div className="crystal-ball-wrapper">
        {renderFloorGlow()}
        <div
          ref={containerRef}
          className={`crystal-ball-container ${isMobile ? 'mobile' : ''}`}
        />
      </div>

      {renderCollectionPanel()}

      <div className="energy-bar-wrapper">
        {renderEnergyBar()}
      </div>

      {renderDivination()}

      {isMobile && (
        <motion.button
          className="drawer-toggle"
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowDrawer(!showDrawer)}
        >
          {showDrawer ? '收起图鉴' : '星灵图鉴'}
        </motion.button>
      )}

      <div className="hint-text">
        拖拽旋转水晶球 · 点击加速 · 停止后星尘会聚集形成星座
      </div>

      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        .app-container {
          width: 100%;
          height: 100vh;
          position: relative;
          overflow: hidden;
          background: radial-gradient(ellipse at center, #1a0a3e 0%, #0a0a2e 70%, #050515 100%);
          font-family: 'Cinzel', serif;
        }

        .crystal-ball-wrapper {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .crystal-ball-container {
          width: 100%;
          height: 100%;
          cursor: grab;
        }

        .crystal-ball-container:active {
          cursor: grabbing;
        }

        .crystal-ball-container.mobile {
          width: 80%;
          height: 60%;
        }

        .floor-glow {
          position: absolute;
          bottom: 10%;
          left: 50%;
          transform: translateX(-50%);
          width: 600px;
          height: 300px;
          background: radial-gradient(ellipse at center, rgba(160, 216, 241, 0.15) 0%, transparent 70%);
          pointer-events: none;
          filter: blur(20px);
        }

        .collection-panel {
          position: fixed;
          left: 20px;
          top: 50%;
          transform: translateY(-50%);
          width: 200px;
          padding: 20px;
          background: rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          z-index: 50;
        }

        .collection-panel.mobile-drawer {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          top: auto;
          transform: none;
          width: 100%;
          border-radius: 20px 20px 0 0;
          padding: 20px;
          max-height: 60vh;
          overflow-y: auto;
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .panel-title {
          color: #e6d5a8;
          font-size: 16px;
          font-weight: 600;
          letter-spacing: 2px;
        }

        .panel-count {
          color: rgba(230, 213, 168, 0.6);
          font-size: 12px;
        }

        .spirits-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        .spirit-badge {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          cursor: pointer;
        }

        .spirit-badge.unlocked {
          animation: float 3s ease-in-out infinite;
        }

        .spirit-badge:nth-child(2) { animation-delay: 0.5s; }
        .spirit-badge:nth-child(3) { animation-delay: 1s; }
        .spirit-badge:nth-child(4) { animation-delay: 1.5s; }
        .spirit-badge:nth-child(5) { animation-delay: 2s; }
        .spirit-badge:nth-child(6) { animation-delay: 2.5s; }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }

        .badge-glow {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: var(--spirit-color);
          box-shadow: 0 0 15px var(--spirit-color), 0 0 30px var(--spirit-color);
          position: relative;
        }

        .badge-glow::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255,255,255,0.5) 0%, transparent 70%);
        }

        .badge-lock {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.1);
          border: 2px solid rgba(255, 255, 255, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255, 255, 255, 0.4);
          font-size: 18px;
          font-weight: bold;
        }

        .badge-name {
          font-size: 11px;
          color: rgba(230, 213, 168, 0.8);
          text-align: center;
        }

        .spirit-badge.locked {
          cursor: default;
          opacity: 0.6;
        }

        .energy-bar-wrapper {
          position: fixed;
          right: 20px;
          bottom: 20px;
          z-index: 50;
        }

        .energy-bar-container {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .energy-label {
          font-size: 12px;
          color: rgba(230, 213, 168, 0.8);
          letter-spacing: 2px;
        }

        .divination-container {
          position: fixed;
          bottom: 80px;
          left: 50%;
          transform: translateX(-50%);
          text-align: center;
          max-width: 80%;
          z-index: 40;
        }

        .divination-spirit-name {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 12px;
          letter-spacing: 4px;
          text-shadow: 0 0 20px currentColor;
        }

        .divination-text {
          font-size: 16px;
          color: #e6d5a8;
          line-height: 1.8;
          letter-spacing: 1px;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
        }

        .hint-text {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 12px;
          color: rgba(230, 213, 168, 0.5);
          letter-spacing: 2px;
          pointer-events: none;
          z-index: 10;
        }

        .drawer-toggle {
          position: fixed;
          bottom: 20px;
          left: 20px;
          padding: 10px 20px;
          background: rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 20px;
          color: #e6d5a8;
          font-family: 'Cinzel', serif;
          font-size: 12px;
          cursor: pointer;
          z-index: 60;
          letter-spacing: 1px;
        }

        @media (max-width: 768px) {
          .energy-bar-wrapper {
            right: 10px;
            bottom: 70px;
            transform: scale(0.8);
            transform-origin: bottom right;
          }

          .hint-text {
            display: none;
          }

          .divination-container {
            bottom: 100px;
          }

          .divination-spirit-name {
            font-size: 20px;
          }

          .divination-text {
            font-size: 14px;
          }
        }
      `}</style>
    </div>
  );
}

export default App;
