import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MelodyParams } from '../types';
import { audioEngine } from '../utils/audioEngine';

interface RecordPlayerProps {
  presets: MelodyParams[];
  selectedMelody: MelodyParams | null;
  onSelectMelody: (melody: MelodyParams) => void;
}

const WARM_COLORS = ['#ff6b6b', '#ffa94d', '#ffd43b', '#ff922b', '#ff8787', '#ffa8a8'];

const RecordPlayer: React.FC<RecordPlayerProps> = ({ presets, selectedMelody, onSelectMelody }) => {
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const [centerColor] = useState<string>(() => WARM_COLORS[Math.floor(Math.random() * WARM_COLORS.length)]);
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePresetClick = useCallback((melody: MelodyParams) => {
    onSelectMelody(melody);
    audioEngine.playMelody(melody);
    setIsPlaying(true);
    setTimeout(() => setIsPlaying(false), melody.totalDuration * 1000);
  }, [onSelectMelody]);

  useEffect(() => {
    const canvas = waveformCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawWaveform = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (isPlaying) {
        const dataArray = audioEngine.getFrequencyData();
        const barCount = dataArray.length;
        const barWidth = canvas.width / barCount;

        for (let i = 0; i < barCount; i++) {
          const barHeight = (dataArray[i] / 255) * (canvas.height * 0.8);
          const gradient = ctx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height);
          gradient.addColorStop(0, '#ff66cc');
          gradient.addColorStop(1, '#66ffcc');
          ctx.fillStyle = gradient;
          ctx.fillRect(i * barWidth, canvas.height - barHeight, barWidth - 1, barHeight);
        }
      } else {
        const time = Date.now() / 1000;
        for (let i = 0; i < canvas.width; i += 4) {
          const y = canvas.height / 2 + Math.sin((i + time * 60) * 0.05) * 10;
          const gradient = ctx.createLinearGradient(0, y - 2, 0, y + 2);
          gradient.addColorStop(0, '#ff66cc80');
          gradient.addColorStop(1, '#66ffcc80');
          ctx.fillStyle = gradient;
          ctx.fillRect(i, y - 1, 3, 2);
        }
      }

      animFrameRef.current = requestAnimationFrame(drawWaveform);
    };

    drawWaveform();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying]);

  return (
    <div style={styles.container}>
      <div style={styles.presetsColumn}>
        <h3 style={styles.presetTitle}>预设旋律</h3>
        {presets.map((melody, idx) => (
          <button
            key={idx}
            onClick={() => handlePresetClick(melody)}
            style={{
              ...styles.presetButton,
              ...(selectedMelody === melody ? styles.presetButtonActive : {})
            }}
          >
            <span style={styles.presetIcon}>♪</span>
            <span style={styles.presetName}>旋律 {idx + 1}</span>
            <span style={styles.presetDuration}>{melody.totalDuration.toFixed(1)}s</span>
          </button>
        ))}
      </div>

      <div style={styles.playerArea}>
        <div style={styles.recordContainer}>
          <div
            style={{
              ...styles.record,
              animation: `spin 2s linear infinite`,
              animationPlayState: isPlaying ? 'running' : 'running'
            }}
          >
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                style={{
                  ...styles.recordRing,
                  width: `${260 - (i + 1) * 28}px`,
                  height: `${260 - (i + 1) * 28}px`
                }}
              />
            ))}
            <div style={{ ...styles.recordLabel, backgroundColor: centerColor }}>
              <span style={styles.recordLabelText}>♫</span>
            </div>
          </div>

          <canvas
            ref={waveformCanvasRef}
            width={260}
            height={80}
            style={styles.waveformCanvas}
          />
        </div>

        <div style={styles.playerInfo}>
          <p style={styles.statusText}>
            {isPlaying ? '♪ 正在播放...' : '点击左侧旋律试听'}
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    gap: '32px',
    padding: '24px',
    backgroundColor: '#1a1a1acc',
    borderRadius: '12px',
    alignItems: 'flex-start',
    flexWrap: 'wrap'
  },
  presetsColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    minWidth: '160px'
  },
  presetTitle: {
    fontSize: '14px',
    color: '#66ccff',
    marginBottom: '8px',
    letterSpacing: '1px'
  },
  presetButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 14px',
    backgroundColor: '#2a2a4a',
    borderRadius: '8px',
    color: '#ccccdd',
    fontSize: '13px',
    border: '1px solid transparent',
    transition: 'all 0.3s ease-out'
  },
  presetButtonActive: {
    borderColor: '#ff66cc',
    boxShadow: '0 0 12px #ff66cc55',
    backgroundColor: '#3a2a4a'
  },
  presetIcon: {
    color: '#ff66cc',
    fontSize: '16px'
  },
  presetName: {
    flex: 1,
    textAlign: 'left'
  },
  presetDuration: {
    fontSize: '11px',
    color: '#8888aa'
  },
  playerArea: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    flex: 1
  },
  recordContainer: {
    position: 'relative',
    width: '260px',
    height: '260px'
  },
  record: {
    width: '260px',
    height: '260px',
    borderRadius: '50%',
    backgroundColor: '#1a1a1a',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 40px #000000aa, inset 0 0 30px #00000066'
  },
  recordRing: {
    position: 'absolute',
    borderRadius: '50%',
    border: '1px solid #333333',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)'
  },
  recordLabel: {
    width: '70px',
    height: '70px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 10px rgba(0,0,0,0.5)',
    zIndex: 1
  },
  recordLabelText: {
    color: '#1a1a1a',
    fontSize: '28px',
    fontWeight: 'bold'
  },
  waveformCanvas: {
    position: 'absolute',
    bottom: '-40px',
    left: '0',
    pointerEvents: 'none'
  },
  playerInfo: {
    marginTop: '50px',
    textAlign: 'center'
  },
  statusText: {
    fontSize: '13px',
    color: '#8888aa',
    letterSpacing: '1px'
  }
};

export default RecordPlayer;
