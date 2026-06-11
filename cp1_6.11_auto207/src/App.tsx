import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import Astrolabe from './components/Astrolabe';
import ConstellationPuzzle from './components/ConstellationPuzzle';
import constellations from './data/stars';

interface UnlockedRecord {
  id: number;
  latin: string;
  chinese: string;
  timestamp: string;
}

function playSuccessSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.setValueAtTime(550, ctx.currentTime + 0.1);
    osc.frequency.setValueAtTime(660, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch {}
}

function playFailSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);
  } catch {}
}

function playVictoryCelebration() {
  try {
    confetti({
      particleCount: 200,
      spread: 360,
      origin: { x: 0.5, y: 0.5 },
      colors: ['#c9a96e', '#a8d8ea', '#fff', '#7b9e6b', '#ffd700'],
      startVelocity: 30,
      gravity: 0.5,
      ticks: 180,
    });
  } catch {}
}

export default function App() {
  const [currentConstellation, setCurrentConstellation] = useState(0);
  const [outerAngle, setOuterAngle] = useState(0);
  const [flashSign, setFlashSign] = useState<number | null>(null);
  const [failFlash, setFailFlash] = useState(false);
  const [highlightedStars, setHighlightedStars] = useState<number[] | null>(null);
  const [showStars, setShowStars] = useState(false);
  const [particleActive, setParticleActive] = useState(false);
  const [constellationReveal, setConstellationReveal] = useState<UnlockedRecord | null>(null);
  const [unlocked, setUnlocked] = useState<UnlockedRecord[]>([]);
  const [showStarmap, setShowStarmap] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [compassSize, setCompassSize] = useState(400);

  const failCountRef = useRef(0);
  const lastAngleRef = useRef(outerAngle);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      setCompassSize(w < 768 ? 300 : 400);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleOuterAngleChange = useCallback(
    (angle: number) => {
      setOuterAngle(angle);
      isDraggingRef.current = true;
    },
    []
  );

  useEffect(() => {
    const handleUp = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;

      if (gameComplete) return;

      const target = constellations[currentConstellation].targetAngle;
      let diff = ((outerAngle - target) % 360 + 360) % 360;
      if (diff > 180) diff = 360 - diff;

      if (diff > 2) {
        failCountRef.current += 1;
        if (failCountRef.current >= 3) {
          setFailFlash(true);
          playFailSound();
          setTimeout(() => setFailFlash(false), 400);
          setTimeout(() => {
            setFailFlash(true);
            setTimeout(() => setFailFlash(false), 200);
          }, 200);
          failCountRef.current = 0;
        }
      }
    };

    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchend', handleUp);
    return () => {
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchend', handleUp);
    };
  }, [outerAngle, currentConstellation, gameComplete]);

  const handleSolved = useCallback(
    (id: number) => {
      const c = constellations[id];
      const record: UnlockedRecord = {
        id: c.id,
        latin: c.latin,
        chinese: c.chinese,
        timestamp: new Date().toLocaleString(),
      };

      setFlashSign(id);
      setHighlightedStars(c.stars.map((_, i) => i));
      setShowStars(true);
      setConstellationReveal(record);
      playSuccessSound();
      failCountRef.current = 0;

      setTimeout(() => {
        setParticleActive(true);
      }, 800);

      setTimeout(() => {
        setParticleActive(false);
        setShowStars(false);
        setHighlightedStars(null);
        setFlashSign(null);
        setConstellationReveal(null);

        setUnlocked((prev) => [...prev, record]);

        if (id < 11) {
          setCurrentConstellation(id + 1);
        } else {
          setGameComplete(true);
          setTimeout(() => {
            playVictoryCelebration();
          }, 300);
        }
      }, 2300);
    },
    []
  );

  const handleFail = useCallback(() => {}, []);

  const handleReset = useCallback(() => {
    setCurrentConstellation(0);
    setOuterAngle(0);
    setFlashSign(null);
    setFailFlash(false);
    setHighlightedStars(null);
    setShowStars(false);
    setParticleActive(false);
    setConstellationReveal(null);
    setUnlocked([]);
    setGameComplete(false);
    failCountRef.current = 0;
  }, []);

  const currentTarget = constellations[currentConstellation].targetAngle;
  let displayAngle = ((outerAngle - currentTarget) % 360 + 360) % 360;
  if (displayAngle > 180) displayAngle = displayAngle - 360;

  const progress = unlocked.length;
  const total = 12;

  return (
    <div className="game-container">
      <div className="left-panel">
        <div className="panel-card">
          <h3>当前星座</h3>
          <div className="value">{constellations[currentConstellation].latin}</div>
          <div className="sub">{constellations[currentConstellation].chinese}</div>
        </div>
        <div className="panel-card">
          <h3>进度</h3>
          <div className="value">
            {progress} / {total}
          </div>
          <div className="progress-bar">
            <div
              className="progress-bar-fill"
              style={{ width: `${(progress / total) * 100}%` }}
            />
          </div>
        </div>
        <div className="panel-card">
          <h3>角度偏差</h3>
          <div className="value" style={{ fontSize: '16px' }}>
            {displayAngle.toFixed(1)}°
          </div>
          <div className="sub">
            目标: {constellations[currentConstellation].abbr} @ {currentTarget}°
          </div>
        </div>
      </div>

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Astrolabe
          outerAngle={outerAngle}
          onOuterAngleChange={handleOuterAngleChange}
          size={compassSize}
          flashSign={flashSign}
          failFlash={failFlash}
          highlightedStars={highlightedStars}
          constellationId={currentConstellation}
        />
        <ConstellationPuzzle
          outerAngle={outerAngle}
          currentConstellation={currentConstellation}
          onSolved={handleSolved}
          onFail={handleFail}
          showStars={showStars}
          particleActive={particleActive}
        />
      </div>

      <div className="right-panel">
        <button className="btn" onClick={handleReset}>
          ✦ 重置
        </button>
        <button className="btn" onClick={() => setShowStarmap(true)}>
          ✦ 星图
        </button>
      </div>

      <AnimatePresence>
        {constellationReveal && (
          <motion.div
            className="constellation-reveal"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            <div className="latin">{constellationReveal.latin}</div>
            <div className="chinese">{constellationReveal.chinese}</div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showStarmap && (
          <motion.div
            className="starmap-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowStarmap(false)}
          >
            <motion.div
              className="starmap-content"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2>✦ 星图记录 ✦</h2>
              {unlocked.length === 0 ? (
                <div className="starmap-empty">尚未解锁任何星座</div>
              ) : (
                unlocked.map((r) => (
                  <div className="starmap-item" key={r.id}>
                    <div>
                      <span className="name">{r.chinese}</span>
                      <span className="name-en">{r.latin}</span>
                    </div>
                    <span className="time">{r.timestamp}</span>
                  </div>
                ))
              )}
              <div style={{ marginTop: 20, textAlign: 'center' }}>
                <button className="btn" onClick={() => setShowStarmap(false)}>
                  关闭
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {gameComplete && (
          <motion.div
            className="victory-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="victory-text"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 100, damping: 15 }}
            >
              星盘归位，预言显现
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
