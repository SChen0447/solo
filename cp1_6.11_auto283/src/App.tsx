import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import MeasurementStation from './components/MeasurementStation';
import EntanglementPath from './components/EntanglementPath';
import StatsPanel from './components/StatsPanel';
import { generateSpinResult } from './utils/quantumLogic';
import type { MeasurementRecord, CHSHOptions } from './utils/quantumLogic';
import './App.css';

type PresetMode = 'classic' | 'maxViolation' | 'custom';

export default function App() {
  const [aliceAngle, setAliceAngle] = useState(0);
  const [bobAngle, setBobAngle] = useState(45);
  const [aliceResult, setAliceResult] = useState<number | null>(null);
  const [bobResult, setBobResult] = useState<number | null>(null);
  const [resultKey, setResultKey] = useState(0);
  const [records, setRecords] = useState<MeasurementRecord[]>([]);
  const [rippleTrigger, setRippleTrigger] = useState(0);
  const [presetMode, setPresetMode] = useState<PresetMode>('custom');
  const [isAutoRunning, setIsAutoRunning] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  const chshOptions: CHSHOptions = {
    a: 0,
    aPrime: 45,
    b: 22.5,
    bPrime: 67.5,
  };

  const playClickSound = useCallback((frequency: number = 800) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.1);
    } catch {
    }
  }, []);

  const performMeasurement = useCallback(() => {
    const { alice, bob } = generateSpinResult(aliceAngle, bobAngle);
    const newRecord: MeasurementRecord = {
      id: uuidv4(),
      aliceAngle,
      bobAngle,
      aliceResult: alice,
      bobResult: bob,
      timestamp: Date.now(),
    };

    setAliceResult(alice);
    setBobResult(bob);
    setResultKey((k) => k + 1);
    setRecords((prev) => [...prev.slice(-1999), newRecord]);
    setRippleTrigger((prev) => prev + 1);
    playClickSound(600);
  }, [aliceAngle, bobAngle, playClickSound]);

  const runAutoMeasurements = useCallback(
    async (count: number, mode: 'classic' | 'maxViolation') => {
      setIsAutoRunning(true);
      setRecords([]);
      setAliceResult(null);
      setBobResult(null);

      const angles =
        mode === 'classic'
          ? [
              { a: 0, b: 45 },
            ]
          : [
              { a: 0, b: 22.5 },
              { a: 0, b: 67.5 },
              { a: 45, b: 22.5 },
              { a: 45, b: 67.5 },
            ];

      const measurementsPerAngle = Math.ceil(count / angles.length);

      for (let i = 0; i < measurementsPerAngle; i++) {
        for (const anglePair of angles) {
          setAliceAngle(anglePair.a);
          setBobAngle(anglePair.b);

          await new Promise<void>((resolve) => {
            setTimeout(() => {
              const { alice, bob } = generateSpinResult(anglePair.a, anglePair.b);
              const newRecord: MeasurementRecord = {
                id: uuidv4(),
                aliceAngle: anglePair.a,
                bobAngle: anglePair.b,
                aliceResult: alice,
                bobResult: bob,
                timestamp: Date.now(),
              };

              setAliceResult(alice);
              setBobResult(bob);
              setResultKey((k) => k + 1);
              setRecords((prev) => [...prev.slice(-1999), newRecord]);
              setRippleTrigger((prev) => prev + 1);
              resolve();
            }, 50);
          });
        }
      }

      setIsAutoRunning(false);
    },
    []
  );

  const handlePresetClick = (mode: PresetMode) => {
    setPresetMode(mode);
    playClickSound(1000);

    if (mode === 'classic') {
      setAliceAngle(0);
      setBobAngle(45);
      runAutoMeasurements(30, 'classic');
    } else if (mode === 'maxViolation') {
      runAutoMeasurements(100, 'maxViolation');
    } else {
      setIsAutoRunning(false);
    }
  };

  const angleDiff = Math.abs(aliceAngle - bobAngle);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">量子纠缠态自旋测量模拟器</h1>
        <p className="app-subtitle">Quantum Entanglement Spin Measurement Simulator</p>
      </header>

      <main className="main-content">
        <div className="left-section">
          <MeasurementStation
            label="Alice"
            angle={aliceAngle}
            onAngleChange={setAliceAngle}
            spinResult={aliceResult}
            resultKey={resultKey}
          />
        </div>

        <div className="center-section">
          <EntanglementPath
            angleDiff={angleDiff}
            rippleTrigger={rippleTrigger}
            records={records}
          />

          <motion.button
            className="measure-button"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={performMeasurement}
            disabled={isAutoRunning}
            animate={
              rippleTrigger > 0
                ? {
                    scale: [1, 1.2, 1],
                    boxShadow: [
                      '0 0 20px rgba(255, 235, 59, 0.5)',
                      '0 0 40px rgba(255, 235, 59, 0.8)',
                      '0 0 20px rgba(255, 235, 59, 0.5)',
                    ],
                  }
                : {}
            }
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <svg viewBox="0 0 100 100" className="measure-button-icon">
              <circle cx="50" cy="50" r="45" fill="none" stroke="#ffeb3b" strokeWidth="3" />
              <path
                d="M55 30 L35 55 L50 55 L45 70 L65 45 L50 45 Z"
                fill="#ffeb3b"
              />
            </svg>
            <span className="measure-button-text">测量</span>
          </motion.button>
        </div>

        <div className="right-section">
          <MeasurementStation
            label="Bob"
            angle={bobAngle}
            onAngleChange={setBobAngle}
            spinResult={bobResult}
            resultKey={resultKey}
          />
        </div>

        <div className="stats-section">
          <StatsPanel records={records} chshOptions={chshOptions} />
        </div>
      </main>

      <footer className="preset-buttons">
        <motion.button
          className={`preset-button classic ${presetMode === 'classic' ? 'active' : ''}`}
          whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(244, 67, 54, 0.6)' }}
          whileTap={{ scale: 0.95 }}
          onClick={() => handlePresetClick('classic')}
          disabled={isAutoRunning}
        >
          <span className="preset-button-icon">🎯</span>
          <span className="preset-button-title">经典极限测试</span>
          <span className="preset-button-desc">0° / 45°，30次测量</span>
        </motion.button>

        <motion.button
          className={`preset-button max-violation ${presetMode === 'maxViolation' ? 'active' : ''}`}
          whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(76, 175, 80, 0.6)' }}
          whileTap={{ scale: 0.95 }}
          onClick={() => handlePresetClick('maxViolation')}
          disabled={isAutoRunning}
        >
          <span className="preset-button-icon">⚡</span>
          <span className="preset-button-title">最大违反测试</span>
          <span className="preset-button-desc">0°/45° / 22.5°/67.5°，100次</span>
        </motion.button>

        <motion.button
          className={`preset-button custom ${presetMode === 'custom' ? 'active' : ''}`}
          whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(33, 150, 243, 0.6)' }}
          whileTap={{ scale: 0.95 }}
          onClick={() => handlePresetClick('custom')}
        >
          <span className="preset-button-icon">🔬</span>
          <span className="preset-button-title">自定义自由模式</span>
          <span className="preset-button-desc">自由调节角度</span>
        </motion.button>
      </footer>

      <AnimatePresence>
        {isAutoRunning && (
          <motion.div
            className="auto-running-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="auto-running-content">
              <div className="loading-spinner"></div>
              <p>正在进行自动测量实验...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
