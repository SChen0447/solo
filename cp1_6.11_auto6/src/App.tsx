import { useState, useEffect, useRef, useCallback } from 'react';
import PlantScene from './components/PlantScene';
import ControlPanel from './components/ControlPanel';
import type {
  PlantState,
  OperationType,
  EnvironmentParams,
} from './utils/plantSimulator';
import {
  createInitialState,
  calculateGrowth,
  decayHealth,
  interpolateState,
  getReplayStates,
} from './utils/plantSimulator';

const App = () => {
  const [plantState, setPlantState] = useState<PlantState>(createInitialState());
  const [displayState, setDisplayState] = useState<PlantState>(createInitialState());
  const [environment, setEnvironment] = useState<EnvironmentParams>({
    temperature: 25,
    humidity: 50,
    lightIntensity: 5,
  });
  const [isReplaying, setIsReplaying] = useState(false);
  const [isReplayPaused, setIsReplayPaused] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const healthDecayRef = useRef<number>(0);
  const transitionRef = useRef<{
    from: PlantState;
    to: PlantState;
    startTime: number;
    duration: number;
  } | null>(null);
  const replayRef = useRef<{
    states: { state: PlantState }[];
    currentIndex: number;
    progress: number;
    startTime: number;
    segmentStartTime: number;
  } | null>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const startTransition = useCallback((from: PlantState, to: PlantState, duration: number = 800) => {
    transitionRef.current = {
      from,
      to,
      startTime: performance.now(),
      duration,
    };
  }, []);

  const handleOperation = useCallback((type: OperationType) => {
    if (isReplaying) return;

    setPlantState((prev) => {
      const newState = calculateGrowth(prev, type, environment);
      startTransition(prev, newState, 800);
      return newState;
    });
  }, [environment, isReplaying, startTransition]);

  const handleEnvironmentChange = useCallback((env: Partial<EnvironmentParams>) => {
    setEnvironment((prev) => ({ ...prev, ...env }));
  }, []);

  const handleReplay = useCallback(() => {
    const replayStates = getReplayStates(plantState, plantState.operations, environment);
    if (replayStates.length < 2) return;

    replayRef.current = {
      states: replayStates,
      currentIndex: 0,
      progress: 0,
      startTime: performance.now(),
      segmentStartTime: performance.now(),
    };

    setIsReplaying(true);
    setIsReplayPaused(false);
    setDisplayState(replayStates[0].state);
  }, [plantState, environment]);

  const handlePauseReplay = useCallback(() => {
    setIsReplayPaused(true);
  }, []);

  const handleResumeReplay = useCallback(() => {
    setIsReplayPaused(false);
    if (replayRef.current) {
      replayRef.current.segmentStartTime = performance.now();
    }
  }, []);

  const stopReplay = useCallback(() => {
    setIsReplaying(false);
    setIsReplayPaused(false);
    replayRef.current = null;
    setDisplayState(plantState);
  }, [plantState]);

  useEffect(() => {
    const animate = (currentTime: number) => {
      const deltaTime = currentTime - lastTimeRef.current;
      lastTimeRef.current = currentTime;

      if (isReplaying && !isReplayPaused && replayRef.current) {
        const replay = replayRef.current;
        const segmentDuration = 600;
        const segmentProgress = Math.min(1, (currentTime - replay.segmentStartTime) / segmentDuration);

        if (segmentProgress >= 1) {
          replay.currentIndex++;
          replay.segmentStartTime = currentTime;

          if (replay.currentIndex >= replay.states.length - 1) {
            stopReplay();
          } else {
            const from = replay.states[replay.currentIndex].state;
            const to = replay.states[replay.currentIndex + 1].state;
            const interpolated = interpolateState(from, to, 0);
            setDisplayState(interpolated);
          }
        } else {
          const from = replay.states[replay.currentIndex].state;
          const to = replay.states[replay.currentIndex + 1]?.state || from;
          const interpolated = interpolateState(from, to, segmentProgress);
          setDisplayState(interpolated);
        }
      } else if (!isReplaying && transitionRef.current) {
        const transition = transitionRef.current;
        const transitionProgress = Math.min(1, (currentTime - transition.startTime) / transition.duration);
        const interpolated = interpolateState(transition.from, transition.to, transitionProgress);
        setDisplayState(interpolated);

        if (transitionProgress >= 1) {
          transitionRef.current = null;
        }
      } else if (!isReplaying && !transitionRef.current) {
        healthDecayRef.current += deltaTime;
        if (healthDecayRef.current >= 3000) {
          healthDecayRef.current = 0;
          setPlantState((prev) => {
            if (prev.health <= 0) return prev;
            const newState = decayHealth(prev);
            setDisplayState(newState);
            return newState;
          });
        }
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    lastTimeRef.current = performance.now();
    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isReplaying, isReplayPaused, stopReplay]);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      button:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3) !important;
      }
      button:active:not(:disabled) {
        transform: translateY(0);
      }
      button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #8BC34A;
        cursor: pointer;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
        transition: transform 0.2s ease;
      }
      input[type="range"]::-webkit-slider-thumb:hover {
        transform: scale(1.2);
      }
      input[type="range"]::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #8BC34A;
        cursor: pointer;
        border: none;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
      }
      ::-webkit-scrollbar {
        width: 6px;
      }
      ::-webkit-scrollbar-track {
        background: transparent;
      }
      ::-webkit-scrollbar-thumb {
        background: rgba(139, 195, 74, 0.5);
        border-radius: 3px;
      }
      ::-webkit-scrollbar-thumb:hover {
        background: rgba(139, 195, 74, 0.7);
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const sceneState = isReplaying ? displayState : (displayState || plantState);

  return (
    <div style={styles.app}>
      <ControlPanel
        plantState={sceneState}
        environment={environment}
        onOperation={handleOperation}
        onEnvironmentChange={handleEnvironmentChange}
        onReplay={handleReplay}
        onPauseReplay={handlePauseReplay}
        onResumeReplay={handleResumeReplay}
        isReplaying={isReplaying}
        isReplayPaused={isReplayPaused}
        isMobile={isMobile}
      />
      <div style={styles.sceneContainer}>
        <PlantScene
          plantState={sceneState}
          environment={environment}
          isReplaying={isReplaying}
        />
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  app: {
    width: '100%',
    height: '100%',
    display: 'flex',
    position: 'relative',
    overflow: 'hidden',
  },
  sceneContainer: {
    flex: 1,
    height: '100%',
    position: 'relative',
  },
};

export default App;
