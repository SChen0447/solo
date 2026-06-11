import { useState, useEffect, useCallback, useRef } from 'react';
import { SimulationCanvas } from './components/SimulationCanvas';
import { ControlPanel } from './components/ControlPanel';
import { StatusPanel } from './components/StatusPanel';
import { useSimulation } from './hooks/useSimulation';
import { EnvironmentParams, ENV_DEFAULTS, COLORS } from './utils/constants';

function App() {
  const [canvasSize, setCanvasSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [envParams, setEnvParams] = useState<EnvironmentParams>(ENV_DEFAULTS);
  const [bacteriaColors, setBacteriaColors] = useState<{ color: string; count: number }[]>([]);
  const statsUpdateRef = useRef<number | null>(null);

  const { stats, getState, toggleMarkShrimp } = useSimulation(
    canvasSize.width,
    canvasSize.height,
    envParams
  );

  useEffect(() => {
    const handleResize = () => {
      setCanvasSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const updateBacteriaColors = useCallback(() => {
    const state = getState();
    if (!state) return;

    const colorMap = new Map<string, number>();
    
    for (const shrimp of state.shrimps) {
      if (shrimp.hasBacteria && shrimp.bacteriaColor) {
        const color = shrimp.bacteriaColor;
        colorMap.set(color, (colorMap.get(color) || 0) + 1);
      }
    }

    const colors = Array.from(colorMap.entries()).map(([color, count]) => ({
      color,
      count,
    }));

    setBacteriaColors(colors);
  }, [getState]);

  useEffect(() => {
    const interval = setInterval(() => {
      updateBacteriaColors();
    }, 500);

    return () => clearInterval(interval);
  }, [updateBacteriaColors]);

  const handleShrimpClick = useCallback((shrimpId: string) => {
    toggleMarkShrimp(shrimpId);
  }, [toggleMarkShrimp]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        backgroundColor: COLORS.deepSeaBlack,
      }}
    >
      <SimulationCanvas
        width={canvasSize.width}
        height={canvasSize.height}
        getState={getState}
        onShrimpClick={handleShrimpClick}
      />

      <ControlPanel params={envParams} onChange={setEnvParams} />

      <StatusPanel stats={stats} bacteriaColors={bacteriaColors} />

      <div
        style={{
          position: 'absolute',
          top: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10,
          pointerEvents: 'none',
        }}
      >
        <h1
          style={{
            color: COLORS.glowCyan,
            fontSize: 24,
            fontFamily: "'Courier New', monospace",
            fontWeight: 'normal',
            letterSpacing: 4,
            textShadow: `0 0 20px ${COLORS.glowCyan}, 0 0 40px ${COLORS.glowCyan}40`,
            margin: 0,
            textAlign: 'center',
          }}
        >
          深海热液盲虾共生模拟
        </h1>
        <p
          style={{
            color: COLORS.textGray,
            fontSize: 12,
            fontFamily: "'Courier New', monospace",
            marginTop: 8,
            textAlign: 'center',
            opacity: 0.7,
            letterSpacing: 2,
          }}
        >
          DEEP SEA VENT SHRIMP SYMBIOSIS SIMULATOR
        </p>
      </div>
    </div>
  );
}

export default App;
