import { useRef, useEffect } from 'react';
import type { WaveformType } from '../App';

interface WaveformDisplayProps {
  waveform: WaveformType;
  frequency: number;
}

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 200;

function WaveformDisplay({ waveform, frequency }: WaveformDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const wipeProgressRef = useRef<number>(1);
  const prevWaveformRef = useRef<WaveformType>(waveform);
  const targetWaveformRef = useRef<WaveformType>(waveform);

  useEffect(() => {
    if (prevWaveformRef.current !== waveform) {
      wipeProgressRef.current = 0;
      targetWaveformRef.current = waveform;
    }
  }, [waveform]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const getWaveValue = (t: number, type: WaveformType): number => {
      switch (type) {
        case 'sine':
          return Math.sin(t);
        case 'sawtooth':
          return 2 * ((t / (2 * Math.PI)) % 1) - 1;
        case 'square':
          return Math.sign(Math.sin(t));
        default:
          return 0;
      }
    };

    const drawGrid = () => {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;

      const gridSizeX = CANVAS_WIDTH / 10;
      const gridSizeY = CANVAS_HEIGHT / 8;

      for (let x = 0; x <= CANVAS_WIDTH; x += gridSizeX) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_HEIGHT);
        ctx.stroke();
      }

      for (let y = 0; y <= CANVAS_HEIGHT; y += gridSizeY) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_WIDTH, y);
        ctx.stroke();
      }
    };

    const drawCenterLine = () => {
      ctx.strokeStyle = 'rgba(0, 210, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, CANVAS_HEIGHT / 2);
      ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT / 2);
      ctx.stroke();
    };

    const drawWaveform = (wipe: number) => {
      const gradient = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, 0);
      gradient.addColorStop(0, '#00d2ff');
      gradient.addColorStop(1, '#928dab');

      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.shadowColor = '#00d2ff';
      ctx.shadowBlur = 8;

      const centerY = CANVAS_HEIGHT / 2;
      const amplitude = CANVAS_HEIGHT * 0.35;
      const visibleWidth = CANVAS_WIDTH * wipe;

      const displayCycles = Math.max(1, Math.min(8, frequency / 100));

      ctx.beginPath();
      for (let x = 0; x <= visibleWidth; x++) {
        const t = (x / CANVAS_WIDTH) * 2 * Math.PI * displayCycles;
        let y: number;

        if (wipe < 1 && x > visibleWidth - 2) {
          y = centerY;
        } else {
          const val = getWaveValue(t, targetWaveformRef.current);
          y = centerY - val * amplitude;
        }

        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    };

    const render = () => {
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      drawGrid();
      drawCenterLine();

      if (wipeProgressRef.current < 1) {
        wipeProgressRef.current = Math.min(1, wipeProgressRef.current + 0.04);
        if (wipeProgressRef.current >= 1) {
          prevWaveformRef.current = targetWaveformRef.current;
        }
      }

      drawWaveform(wipeProgressRef.current);

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [frequency]);

  return (
    <div style={styles.container}>
      <div style={styles.label}>
        <span style={styles.labelText}>WAVEFORM</span>
        <span style={styles.valueText}>{waveform.toUpperCase()}</span>
      </div>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        style={styles.canvas}
      />
      <div style={styles.freqLabel}>
        <span style={styles.labelText}>FREQUENCY</span>
        <span style={styles.valueText}>{frequency.toFixed(0)} Hz</span>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '24px',
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.08)'
  },
  canvas: {
    borderRadius: '8px',
    display: 'block'
  },
  label: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  freqLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  labelText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: 300,
    fontSize: '12px',
    letterSpacing: '2px'
  },
  valueText: {
    color: '#00d2ff',
    fontWeight: 300,
    fontSize: '14px',
    letterSpacing: '1px'
  }
};

export default WaveformDisplay;
