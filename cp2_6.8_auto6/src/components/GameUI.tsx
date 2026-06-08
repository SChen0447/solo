import React from 'react';
import { GameState, TrackInfo } from '../types';

interface GameUIProps {
  gameState: GameState;
  score: number;
  combo: number;
  lives: number;
  tracks: TrackInfo[];
  currentTrackId: string;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onRestart: () => void;
  onTrackChange: (trackId: string) => void;
  obstaclesPassed: number;
  maxCombo: number;
  isNarrow: boolean;
}

const GameUI: React.FC<GameUIProps> = ({
  gameState,
  score,
  combo,
  lives,
  tracks,
  currentTrackId,
  onStart,
  onPause,
  onResume,
  onRestart,
  onTrackChange,
  obstaclesPassed,
  maxCombo,
  isNarrow,
}) => {
  const fontSize = isNarrow ? '0.8em' : '1em';

  const comboMultiplier = combo >= 10 ? 2 : combo >= 5 ? 1.5 : 1;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        fontFamily: "'Arial', sans-serif",
        fontSize,
        zIndex: 10,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: isNarrow ? '10px' : '20px',
          left: isNarrow ? '10px' : '20px',
          color: '#ffffff',
          textShadow: '0 0 10px #00ffff, 0 0 20px #00ffff',
          animation: 'fadeIn 0.3s ease-out',
        }}
      >
        <div style={{ fontSize: isNarrow ? '20px' : '28px', fontWeight: 'bold' }}>
          SCORE: {score.toLocaleString()}
        </div>
        <div
          style={{
            fontSize: isNarrow ? '14px' : '18px',
            marginTop: isNarrow ? '4px' : '8px',
            color: comboMultiplier > 1 ? '#ffaa00' : '#aaaaff',
            textShadow:
              comboMultiplier > 1 ? '0 0 10px #ffaa00' : '0 0 5px #aaaaff',
          }}
        >
          COMBO: {combo} {comboMultiplier > 1 && `(x${comboMultiplier})`}
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          top: isNarrow ? '10px' : '20px',
          right: isNarrow ? '10px' : '20px',
          display: 'flex',
          gap: isNarrow ? '6px' : '10px',
          animation: 'fadeIn 0.3s ease-out',
        }}
      >
        {Array.from({ length: 3 }).map((_, i) => (
          <Heart key={i} filled={i < lives} isNarrow={isNarrow} />
        ))}
      </div>

      {gameState === 'menu' && (
        <MenuOverlay
          tracks={tracks}
          currentTrackId={currentTrackId}
          onStart={onStart}
          onTrackChange={onTrackChange}
          isNarrow={isNarrow}
        />
      )}

      {gameState === 'gameover' && (
        <GameOverOverlay
          score={score}
          obstaclesPassed={obstaclesPassed}
          maxCombo={maxCombo}
          onRestart={onRestart}
          isNarrow={isNarrow}
        />
      )}

      {(gameState === 'playing' || gameState === 'paused') && (
        <button
          onClick={gameState === 'playing' ? onPause : onResume}
          style={{
            position: 'absolute',
            bottom: isNarrow ? '15px' : '25px',
            right: isNarrow ? '15px' : '25px',
            width: isNarrow ? '45px' : '55px',
            height: isNarrow ? '45px' : '55px',
            borderRadius: '50%',
            backgroundColor: 'rgba(0, 255, 255, 0.2)',
            border: '2px solid rgba(0, 255, 255, 0.6)',
            color: '#00ffff',
            fontSize: isNarrow ? '18px' : '22px',
            cursor: 'pointer',
            pointerEvents: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease',
            boxShadow: '0 0 15px rgba(0, 255, 255, 0.3)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow = '0 0 25px rgba(255, 0, 255, 0.6)';
            e.currentTarget.style.borderColor = 'rgba(255, 0, 255, 0.8)';
            e.currentTarget.style.color = '#ff00ff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 255, 255, 0.3)';
            e.currentTarget.style.borderColor = 'rgba(0, 255, 255, 0.6)';
            e.currentTarget.style.color = '#00ffff';
          }}
        >
          {gameState === 'playing' ? '⏸' : '▶'}
        </button>
      )}

      {gameState === 'paused' && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: '#ffffff',
            fontSize: isNarrow ? '32px' : '48px',
            fontWeight: 'bold',
            textShadow: '0 0 20px #ff00ff, 0 0 40px #ff00ff',
            animation: 'fadeIn 0.3s ease-out',
          }}
        >
          PAUSED
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        @keyframes heartBreak {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); }
          100% { transform: scale(0.8); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

const Heart: React.FC<{ filled: boolean; isNarrow: boolean }> = ({ filled, isNarrow }) => {
  const size = isNarrow ? 24 : 32;

  return (
    <div
      style={{
        width: size,
        height: size,
        position: 'relative',
        filter: filled
          ? 'drop-shadow(0 0 8px #ff66aa) drop-shadow(0 0 15px #ff0088)'
          : 'none',
        transition: 'all 0.3s ease',
      }}
    >
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        style={{
          fill: filled ? '#ff66aa' : 'rgba(100, 100, 100, 0.3)',
          stroke: filled ? '#ff88cc' : 'rgba(100, 100, 100, 0.5)',
          strokeWidth: 1,
        }}
      >
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
    </div>
  );
};

const MenuOverlay: React.FC<{
  tracks: TrackInfo[];
  currentTrackId: string;
  onStart: () => void;
  onTrackChange: (trackId: string) => void;
  isNarrow: boolean;
}> = ({ tracks, currentTrackId, onStart, onTrackChange, isNarrow }) => {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(10, 10, 30, 0.85)',
        pointerEvents: 'auto',
        animation: 'fadeIn 0.3s ease-out',
        gap: isNarrow ? '15px' : '25px',
      }}
    >
      <h1
        style={{
          fontSize: isNarrow ? '32px' : '56px',
          fontWeight: 'bold',
          color: '#ffffff',
          textShadow:
            '0 0 20px #ff00ff, 0 0 40px #ff00ff, 0 0 60px #00ffff',
          margin: 0,
          letterSpacing: '3px',
        }}
      >
        NEON RHYTHM
      </h1>
      <p
        style={{
          fontSize: isNarrow ? '14px' : '20px',
          color: '#aaccff',
          textShadow: '0 0 10px #00ffff',
          margin: 0,
        }}
      >
        Jump, Slide, Survive the Beat
      </p>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: isNarrow ? '8px' : '12px',
          marginTop: isNarrow ? '10px' : '20px',
          alignItems: 'center',
        }}
      >
        <label
          style={{
            color: '#00ffff',
            fontSize: isNarrow ? '13px' : '16px',
            textShadow: '0 0 5px #00ffff',
          }}
        >
          SELECT TRACK:
        </label>
        <select
          value={currentTrackId}
          onChange={(e) => onTrackChange(e.target.value)}
          style={{
            padding: isNarrow ? '8px 16px' : '10px 20px',
            fontSize: isNarrow ? '13px' : '16px',
            backgroundColor: 'rgba(0, 255, 255, 0.1)',
            border: '2px solid #00ffff',
            color: '#00ffff',
            borderRadius: '5px',
            cursor: 'pointer',
            outline: 'none',
            minWidth: isNarrow ? '200px' : '280px',
            boxShadow: '0 0 15px rgba(0, 255, 255, 0.3)',
            transition: 'all 0.3s ease',
          }}
          onFocus={(e) => {
            e.currentTarget.style.boxShadow =
              '0 0 25px rgba(255, 0, 255, 0.6)';
            e.currentTarget.style.borderColor = '#ff00ff';
          }}
          onBlur={(e) => {
            e.currentTarget.style.boxShadow =
              '0 0 15px rgba(0, 255, 255, 0.3)';
            e.currentTarget.style.borderColor = '#00ffff';
          }}
        >
          {tracks.map((track) => (
            <option
              key={track.id}
              value={track.id}
              style={{ backgroundColor: '#1a1a3a', color: '#ffffff' }}
            >
              {track.name}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={onStart}
        style={{
          marginTop: isNarrow ? '10px' : '20px',
          padding: isNarrow ? '12px 40px' : '15px 60px',
          fontSize: isNarrow ? '16px' : '22px',
          fontWeight: 'bold',
          backgroundColor: 'rgba(255, 0, 255, 0.2)',
          border: '3px solid #ff00ff',
          color: '#ff00ff',
          borderRadius: '8px',
          cursor: 'pointer',
          textShadow: '0 0 10px #ff00ff',
          boxShadow: '0 0 20px rgba(255, 0, 255, 0.4)',
          transition: 'all 0.3s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.boxShadow =
            '0 0 35px rgba(255, 0, 255, 0.8)';
          e.currentTarget.style.backgroundColor = 'rgba(255, 0, 255, 0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 0 20px rgba(255, 0, 255, 0.4)';
          e.currentTarget.style.backgroundColor = 'rgba(255, 0, 255, 0.2)';
        }}
      >
        START GAME
      </button>

      <div
        style={{
          marginTop: isNarrow ? '15px' : '30px',
          color: '#8888aa',
          fontSize: isNarrow ? '11px' : '14px',
          textAlign: 'center',
          lineHeight: isNarrow ? '1.4' : '1.6',
        }}
      >
        <p style={{ margin: '4px 0', color: '#aaccff' }}>CONTROLS:</p>
        <p style={{ margin: '2px 0' }}>← →  Switch Lanes</p>
        <p style={{ margin: '2px 0' }}>↑  Jump (avoid bars & moving targets)</p>
        <p style={{ margin: '2px 0' }}>↓  Slide (avoid spikes & moving targets)</p>
      </div>
    </div>
  );
};

const GameOverOverlay: React.FC<{
  score: number;
  obstaclesPassed: number;
  maxCombo: number;
  onRestart: () => void;
  isNarrow: boolean;
}> = ({ score, obstaclesPassed, maxCombo, onRestart, isNarrow }) => {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(10, 10, 30, 0.9)',
        pointerEvents: 'auto',
        animation: 'fadeIn 0.3s ease-out',
        gap: isNarrow ? '12px' : '20px',
      }}
    >
      <h2
        style={{
          fontSize: isNarrow ? '28px' : '48px',
          fontWeight: 'bold',
          color: '#ff4444',
          textShadow: '0 0 20px #ff0000, 0 0 40px #ff0000',
          margin: 0,
        }}
      >
        GAME OVER
      </h2>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: isNarrow ? '8px' : '12px',
          margin: isNarrow ? '10px 0' : '20px 0',
        }}
      >
        <div
          style={{
            fontSize: isNarrow ? '20px' : '32px',
            color: '#ffffff',
            textShadow: '0 0 15px #00ffff',
          }}
        >
          Final Score: <span style={{ color: '#ffaa00' }}>{score.toLocaleString()}</span>
        </div>
        <div
          style={{
            fontSize: isNarrow ? '14px' : '20px',
            color: '#aaccff',
          }}
        >
          Obstacles Dodged: {obstaclesPassed}
        </div>
        <div
          style={{
            fontSize: isNarrow ? '14px' : '20px',
            color: '#ff88ff',
            textShadow: '0 0 10px #ff00ff',
          }}
        >
          Max Combo: {maxCombo}x
        </div>
      </div>

      <button
        onClick={onRestart}
        style={{
          marginTop: isNarrow ? '10px' : '20px',
          padding: isNarrow ? '10px 40px' : '12px 50px',
          fontSize: isNarrow ? '16px' : '20px',
          fontWeight: 'bold',
          backgroundColor: 'rgba(0, 255, 255, 0.2)',
          border: '3px solid #00ffff',
          color: '#00ffff',
          borderRadius: '8px',
          cursor: 'pointer',
          textShadow: '0 0 10px #00ffff',
          boxShadow: '0 0 20px rgba(0, 255, 255, 0.4)',
          transition: 'all 0.3s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.boxShadow = '0 0 35px rgba(0, 255, 255, 0.8)';
          e.currentTarget.style.backgroundColor = 'rgba(0, 255, 255, 0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 255, 255, 0.4)';
          e.currentTarget.style.backgroundColor = 'rgba(0, 255, 255, 0.2)';
        }}
      >
        PLAY AGAIN
      </button>
    </div>
  );
};

export default GameUI;
