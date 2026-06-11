import React, { useReducer, useRef, useCallback } from 'react';
import Workshop from './Workshop';
import RaceTrack, { RaceTrackHandle } from './RaceTrack';
import ScorePanel from './ScorePanel';
import {
  Part,
  SelectedParts,
  PartType,
  GamePhase,
  ScoreData,
  calculateScore,
  playClickSound,
  calculateAircraftStats
} from './utils';
import { saveAs } from 'file-saver';

interface GameState {
  phase: GamePhase;
  selectedParts: SelectedParts;
  scoreData: ScoreData | null;
  currentDurability: number;
}

type GameAction =
  | { type: 'SELECT_PART'; part: Part }
  | { type: 'REMOVE_PART'; partType: PartType }
  | { type: 'START_RACE' }
  | { type: 'END_RACE'; time: number; collisions: number; durability: number }
  | { type: 'RESTART' }
  | { type: 'UPDATE_DURABILITY'; durability: number };

const initialParts: SelectedParts = {
  engine: null,
  wing: null,
  propeller: null,
  cockpit: null
};

const initialState: GameState = {
  phase: 'assembly',
  selectedParts: initialParts,
  scoreData: null,
  currentDurability: 100
};

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SELECT_PART': {
      const newParts = {
        ...state.selectedParts,
        [action.part.type]: action.part
      };
      const stats = calculateAircraftStats(newParts);
      return {
        ...state,
        selectedParts: newParts,
        currentDurability: stats.durability
      };
    }
    case 'REMOVE_PART': {
      const newParts = {
        ...state.selectedParts,
        [action.partType]: null
      };
      const stats = calculateAircraftStats(newParts);
      return {
        ...state,
        selectedParts: newParts,
        currentDurability: stats.durability
      };
    }
    case 'START_RACE':
      return {
        ...state,
        phase: 'racing',
        scoreData: null
      };
    case 'END_RACE': {
      const totalScore = calculateScore(
        action.time,
        action.collisions,
        action.durability
      );
      return {
        ...state,
        phase: 'finished',
        scoreData: {
          totalTime: action.time,
          collisions: action.collisions,
          durability: action.durability,
          totalScore
        }
      };
    }
    case 'RESTART':
      return {
        ...initialState,
        selectedParts: { ...state.selectedParts }
      };
    case 'UPDATE_DURABILITY':
      return {
        ...state,
        currentDurability: action.durability
      };
    default:
      return state;
  }
}

const App: React.FC = () => {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const raceTrackRef = useRef<RaceTrackHandle>(null);

  const isAssemblyComplete =
    state.selectedParts.engine !== null &&
    state.selectedParts.wing !== null &&
    state.selectedParts.propeller !== null &&
    state.selectedParts.cockpit !== null;

  const handlePartSelect = useCallback((part: Part) => {
    dispatch({ type: 'SELECT_PART', part });
  }, []);

  const handlePartRemove = useCallback((type: PartType) => {
    dispatch({ type: 'REMOVE_PART', partType: type });
  }, []);

  const handleStartRace = useCallback(() => {
    if (!isAssemblyComplete) return;
    playClickSound();
    dispatch({ type: 'START_RACE' });
    setTimeout(() => {
      raceTrackRef.current?.startRace();
    }, 100);
  }, [isAssemblyComplete]);

  const handleRaceEnd = useCallback((data: { time: number; collisions: number; durability: number }) => {
    dispatch({
      type: 'END_RACE',
      time: data.time,
      collisions: data.collisions,
      durability: data.durability
    });
  }, []);

  const handleDurabilityChange = useCallback((durability: number) => {
    dispatch({ type: 'UPDATE_DURABILITY', durability });
  }, []);

  const handleRestart = useCallback(() => {
    playClickSound();
    dispatch({ type: 'RESTART' });
    raceTrackRef.current?.resetRace();
  }, []);

  const handleSaveScreenshot = useCallback(() => {
    playClickSound();
    if (raceTrackRef.current) {
      const dataUrl = raceTrackRef.current.getCanvasDataURL();
      if (dataUrl) {
        fetch(dataUrl)
          .then(res => res.blob())
          .then(blob => {
            saveAs(blob, 'steampunk-aircraft-race.png');
          });
      }
    }
  }, []);

  const stats = calculateAircraftStats(state.selectedParts);

  return (
    <div className="app-container">
      <style>{`
        * {
          box-sizing: border-box;
        }

        .app-container {
          width: 100%;
          height: 100%;
          background: radial-gradient(ellipse at center, #5a3a2a 0%, #3b2b1a 100%);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          position: relative;
        }

        .app-container::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image: 
            radial-gradient(circle at 20% 30%, rgba(184, 115, 51, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(122, 58, 42, 0.1) 0%, transparent 50%);
          pointer-events: none;
        }

        .app-header {
          text-align: center;
          padding: 15px 20px;
          border-bottom: 3px solid #7a3a2a;
          background: linear-gradient(180deg, rgba(59, 43, 26, 0.9) 0%, rgba(90, 58, 42, 0.7) 100%);
          position: relative;
          z-index: 10;
        }

        .app-title {
          color: #f5deb3;
          font-size: 28px;
          font-weight: bold;
          text-shadow: 
            2px 2px 4px rgba(0, 0, 0, 0.5),
            0 0 20px rgba(184, 115, 51, 0.3);
          letter-spacing: 4px;
          margin: 0;
        }

        .app-subtitle {
          color: #d4a574;
          font-size: 12px;
          margin-top: 5px;
          letter-spacing: 2px;
          opacity: 0.8;
        }

        .main-content {
          flex: 1;
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: center;
          gap: 30px;
          padding: 20px;
          overflow: auto;
          position: relative;
          z-index: 1;
        }

        .left-panel {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 15px;
        }

        .right-panel {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 15px;
        }

        .stats-panel {
          background: linear-gradient(145deg, #5a3a2a, #3b2b1a);
          border: 2px solid #7a3a2a;
          border-radius: 8px;
          padding: 15px 20px;
          min-width: 200px;
        }

        .stats-title {
          color: #f5deb3;
          font-size: 14px;
          font-weight: bold;
          text-align: center;
          margin-bottom: 10px;
          border-bottom: 1px solid #7a3a2a;
          padding-bottom: 8px;
        }

        .stat-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 5px 0;
        }

        .stat-label {
          color: #d4a574;
          font-size: 12px;
        }

        .stat-value {
          color: #f5deb3;
          font-size: 13px;
          font-weight: bold;
          font-family: 'Courier New', monospace;
        }

        .durability-bar {
          width: 100%;
          height: 8px;
          background: #3b2b1a;
          border-radius: 4px;
          overflow: hidden;
          margin-top: 5px;
          border: 1px solid #7a3a2a;
        }

        .durability-fill {
          height: 100%;
          transition: width 0.3s ease, background 0.3s ease;
          border-radius: 3px;
        }

        .start-btn {
          padding: 15px 40px;
          font-size: 18px;
          font-weight: bold;
          border: 3px solid #b87333;
          border-radius: 10px;
          background: linear-gradient(145deg, #b87333, #7a3a2a);
          color: #f5deb3;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 
            0 6px 12px rgba(0, 0, 0, 0.4),
            inset 0 2px 4px rgba(255, 255, 255, 0.15);
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
          letter-spacing: 3px;
          font-family: 'Georgia', serif;
          position: relative;
          overflow: hidden;
        }

        .start-btn::before {
          content: '';
          position: absolute;
          top: 3px;
          left: 8px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #d4a574;
          box-shadow: 
            inset 0 1px 2px rgba(255, 255, 255, 0.5),
            0 1px 2px rgba(0, 0, 0, 0.3);
        }

        .start-btn::after {
          content: '';
          position: absolute;
          top: 3px;
          right: 8px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #d4a574;
          box-shadow: 
            inset 0 1px 2px rgba(255, 255, 255, 0.5),
            0 1px 2px rgba(0, 0, 0, 0.3);
        }

        .start-btn:hover:not(:disabled) {
          background: linear-gradient(145deg, #c88343, #8a4a3a);
          border-color: #d4a574;
          transform: translateY(-2px);
          box-shadow: 
            0 8px 16px rgba(0, 0, 0, 0.5),
            inset 0 2px 4px rgba(255, 255, 255, 0.2);
        }

        .start-btn:active:not(:disabled) {
          transform: translateY(0);
          box-shadow: 
            0 3px 6px rgba(0, 0, 0, 0.4),
            inset 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .start-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          filter: grayscale(0.5);
        }

        .phase-indicator {
          color: #d4a574;
          font-size: 12px;
          text-align: center;
          margin-bottom: 10px;
          letter-spacing: 2px;
        }

        @media (max-width: 768px) {
          .main-content {
            flex-direction: column;
            gap: 15px;
            padding: 10px;
          }

          .app-title {
            font-size: 20px;
            letter-spacing: 2px;
          }

          .app-subtitle {
            font-size: 10px;
          }

          .start-btn {
            padding: 12px 30px;
            font-size: 16px;
          }

          .stats-panel {
            min-width: 150px;
            padding: 10px 15px;
          }

          .left-panel,
          .right-panel {
            gap: 10px;
          }
        }
      `}</style>

      <header className="app-header">
        <h1 className="app-title">◆ 蒸汽朋克飞行器竞速 ◆</h1>
        <p className="app-subtitle">STEAMPUNK AIRCRAFT RACING</p>
      </header>

      <div className="main-content">
        <div className="left-panel">
          <div className="phase-indicator">
            {state.phase === 'assembly' && '【 组装阶段 】'}
            {state.phase === 'racing' && '【 竞速中... 】'}
            {state.phase === 'finished' && '【 竞速结束 】'}
          </div>

          <Workshop
            selectedParts={state.selectedParts}
            onPartSelect={handlePartSelect}
            onPartRemove={handlePartRemove}
            disabled={state.phase !== 'assembly'}
          />

          <button
            className="start-btn"
            onClick={handleStartRace}
            disabled={!isAssemblyComplete || state.phase === 'racing'}
          >
            {state.phase === 'racing' ? '竞速中...' : '启动引擎'}
          </button>
        </div>

        <div className="right-panel">
          <div className="stats-panel">
            <div className="stats-title">◆ 飞行器属性 ◆</div>
            <div className="stat-row">
              <span className="stat-label">速度</span>
              <span className="stat-value">{Math.round(stats.speed)} px/s</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">稳定性</span>
              <span className="stat-value">{Math.round(stats.stability)}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">耐久度</span>
              <span className="stat-value">{Math.round(state.currentDurability)}%</span>
            </div>
            <div className="durability-bar">
              <div
                className="durability-fill"
                style={{
                  width: `${Math.max(0, Math.min(100, state.currentDurability))}%`,
                  background: state.currentDurability > 50
                    ? 'linear-gradient(90deg, #7cb342, #9ccc65)'
                    : state.currentDurability > 30
                    ? 'linear-gradient(90deg, #ff9800, #ffb74d)'
                    : 'linear-gradient(90deg, #f44336, #ef5350)'
                }}
              />
            </div>
          </div>

          <RaceTrack
            ref={raceTrackRef}
            selectedParts={state.selectedParts}
            isRacing={state.phase === 'racing'}
            onRaceEnd={handleRaceEnd}
            onDurabilityChange={handleDurabilityChange}
          />
        </div>
      </div>

      <ScorePanel
        scoreData={state.scoreData}
        onRestart={handleRestart}
        onSaveScreenshot={handleSaveScreenshot}
      />
    </div>
  );
};

export default App;
