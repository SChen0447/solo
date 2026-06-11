import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ControlPanel from '@/components/ControlPanel';
import SnowflakeCanvas, { SnowflakeCanvasRef } from '@/components/SnowflakeCanvas';
import type { EnvironmentParams } from '@/utils/snowflakeAlgorithm';

const DEFAULT_PARAMS: EnvironmentParams = {
  temperature: -15,
  humidity: 60,
  windSpeed: 1,
};

interface GrowthData {
  currentLayer: number;
  totalBranches: number;
  symmetry: number;
}

export default function App() {
  const [params, setParams] = useState<EnvironmentParams>(DEFAULT_PARAMS);
  const [isGrowing, setIsGrowing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [growthData, setGrowthData] = useState<GrowthData>({
    currentLayer: 0,
    totalBranches: 0,
    symmetry: 0,
  });
  const canvasRef = useRef<SnowflakeCanvasRef>(null);

  const handleGrowthStart = useCallback(() => {
    if (!isGrowing && !isComplete) {
      setIsGrowing(true);
      setIsComplete(false);
    }
  }, [isGrowing, isComplete]);

  const handleGrowthComplete = useCallback(() => {
    setIsGrowing(false);
    setIsComplete(true);
  }, []);

  const handleGrowthUpdate = useCallback((data: GrowthData) => {
    setGrowthData(data);
  }, []);

  const handleFreeze = useCallback(() => {
    if (canvasRef.current && (isComplete || isGrowing)) {
      canvasRef.current.exportSVG();
    }
  }, [isComplete, isGrowing]);

  const handleMelt = useCallback(() => {
    setIsGrowing(false);
    setIsComplete(false);
    setGrowthData({
      currentLayer: 0,
      totalBranches: 0,
      symmetry: 0,
    });
    if (canvasRef.current) {
      canvasRef.current.reset();
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleGrowthStart();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleGrowthStart]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        background: 'linear-gradient(180deg, #0a0a2e 0%, #1a1a4e 100%)',
        minWidth: '1280px',
      }}
    >
      <header
        style={{
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: '1px solid rgba(176, 224, 230, 0.1)',
          flexShrink: 0,
        }}
      >
        <h1
          style={{
            fontSize: '18px',
            fontFamily: 'Consolas, Monaco, monospace',
            color: '#b0e0e6',
            fontWeight: '300',
            letterSpacing: '4px',
            textShadow: '0 0 20px rgba(176, 224, 230, 0.5)',
          }}
        >
          ❄ 冰晶工作室
        </h1>
      </header>

      <div
        style={{
          display: 'flex',
          flex: 1,
          minHeight: 0,
        }}
      >
        <ControlPanel
          params={params}
          onChange={setParams}
          disabled={isGrowing}
        />

        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
            position: 'relative',
          }}
        >
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 0,
            }}
          >
            <SnowflakeCanvas
              ref={canvasRef}
              params={params}
              isGrowing={isGrowing}
              onGrowthStart={handleGrowthStart}
              onGrowthComplete={handleGrowthComplete}
              onGrowthUpdate={handleGrowthUpdate}
            />
          </div>

          <AnimatePresence>
            {(isGrowing || isComplete) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.3 }}
                style={{
                  position: 'absolute',
                  bottom: '100px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  padding: '12px 32px',
                  background: 'rgba(26, 26, 62, 0.8)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '8px',
                  border: '1px solid rgba(176, 224, 230, 0.2)',
                  display: 'flex',
                  gap: '48px',
                  fontFamily: 'Consolas, Monaco, monospace',
                  color: '#a0d8ef',
                  fontSize: '13px',
                  letterSpacing: '1px',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '10px', opacity: 0.6, marginBottom: '4px' }}>
                    当前层数
                  </span>
                  <span style={{ fontSize: '18px', color: '#e8f8ff' }}>
                    {growthData.currentLayer}
                    <span style={{ fontSize: '12px', opacity: 0.6 }}>/6</span>
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '10px', opacity: 0.6, marginBottom: '4px' }}>
                    总分支数
                  </span>
                  <span style={{ fontSize: '18px', color: '#e8f8ff' }}>
                    {growthData.totalBranches}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '10px', opacity: 0.6, marginBottom: '4px' }}>
                    对称度
                  </span>
                  <span style={{ fontSize: '18px', color: '#e8f8ff' }}>
                    {growthData.symmetry}
                    <span style={{ fontSize: '12px', opacity: 0.6 }}>%</span>
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <footer
        style={{
          height: '80px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '24px',
          borderTop: '1px solid rgba(176, 224, 230, 0.1)',
          flexShrink: 0,
          background: 'rgba(10, 10, 46, 0.5)',
        }}
      >
        <motion.button
          whileHover={isComplete || isGrowing ? { scale: 1.05, rotate: 15 } : {}}
          whileTap={isComplete || isGrowing ? { scale: 0.95 } : {}}
          transition={{ duration: 0.2 }}
          onClick={handleFreeze}
          disabled={!isComplete && !isGrowing}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 28px',
            background:
              isComplete || isGrowing
                ? 'linear-gradient(135deg, #4a90d9, #b0e0e6)'
                : 'rgba(74, 144, 217, 0.3)',
            borderRadius: '8px',
            fontFamily: 'Consolas, Monaco, monospace',
            fontSize: '14px',
            color: isComplete || isGrowing ? '#fff' : 'rgba(232, 248, 255, 0.5)',
            letterSpacing: '2px',
            boxShadow:
              isComplete || isGrowing
                ? '0 4px 20px rgba(74, 144, 217, 0.4)'
                : 'none',
            transition: 'all 0.2s ease',
            cursor: isComplete || isGrowing ? 'pointer' : 'not-allowed',
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="2" x2="12" y2="22" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
            <line x1="19.07" y1="4.93" x2="4.93" y2="19.07" />
            <line x1="12" y1="2" x2="9" y2="6" />
            <line x1="12" y1="2" x2="15" y2="6" />
            <line x1="12" y1="22" x2="9" y2="18" />
            <line x1="12" y1="22" x2="15" y2="18" />
            <line x1="2" y1="12" x2="6" y2="9" />
            <line x1="2" y1="12" x2="6" y2="15" />
            <line x1="22" y1="12" x2="18" y2="9" />
            <line x1="22" y1="12" x2="18" y2="15" />
            <line x1="4.93" y1="4.93" x2="9.17" y2="7.83" />
            <line x1="19.07" y1="4.93" x2="14.83" y2="7.83" />
            <line x1="4.93" y1="19.07" x2="9.17" y2="16.17" />
            <line x1="19.07" y1="19.07" x2="14.83" y2="16.17" />
          </svg>
          冻结
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ duration: 0.2 }}
          onClick={handleMelt}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 28px',
            background: 'linear-gradient(135deg, #4a90d9, #b0e0e6)',
            borderRadius: '8px',
            fontFamily: 'Consolas, Monaco, monospace',
            fontSize: '14px',
            color: '#fff',
            letterSpacing: '2px',
            boxShadow: '0 4px 20px rgba(74, 144, 217, 0.4)',
            transition: 'all 0.2s ease',
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2v20" />
            <path d="M2 12h20" />
            <circle cx="12" cy="12" r="4" />
          </svg>
          融化
        </motion.button>
      </footer>
    </div>
  );
}
