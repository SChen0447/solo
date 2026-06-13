import { useRef, useEffect, useState, useCallback } from 'react';
import * as Tone from 'tone';
import type { WaveformType } from '../App';

interface ControlPanelProps {
  waveform: WaveformType;
  frequency: number;
  cutoff: number;
  isPlaying: boolean;
  onWaveformChange: (w: WaveformType) => void;
  onFrequencyChange: (f: number) => void;
  onCutoffChange: (c: number) => void;
  onPlayingChange: (playing: boolean) => void;
}

const WAVEFORM_OPTIONS: WaveformType[] = ['sine', 'sawtooth', 'square'];
const WAVEFORM_LABELS: Record<WaveformType, string> = {
  sine: 'SINE',
  sawtooth: 'SAW',
  square: 'SQUARE'
};

function ControlPanel({
  waveform,
  frequency,
  cutoff,
  isPlaying,
  onWaveformChange,
  onFrequencyChange,
  onCutoffChange,
  onPlayingChange
}: ControlPanelProps) {
  const synthRef = useRef<Tone.Synth | null>(null);
  const filterRef = useRef<Tone.Filter | null>(null);
  const [waveformRotation, setWaveformRotation] = useState(0);
  const [cutoffRotation, setCutoffRotation] = useState(-135);
  const [isDraggingWaveform, setIsDraggingWaveform] = useState(false);
  const [isDraggingCutoff, setIsDraggingCutoff] = useState(false);
  const waveformKnobRef = useRef<HTMLDivElement>(null);
  const cutoffKnobRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const filter = new Tone.Filter(5000, 'lowpass').toDestination();
    const synth = new Tone.Synth({
      oscillator: {
        type: 'sine'
      },
      envelope: {
        attack: 0.02,
        decay: 0.1,
        sustain: 0.8,
        release: 0.3
      }
    }).connect(filter);

    synthRef.current = synth;
    filterRef.current = filter;

    return () => {
      synth.dispose();
      filter.dispose();
    };
  }, []);

  useEffect(() => {
    if (synthRef.current) {
      synthRef.current.oscillator.type = waveform;
    }
  }, [waveform]);

  useEffect(() => {
    if (synthRef.current && Tone.Transport.state === 'started') {
      synthRef.current.frequency.set({ value: frequency, rampTo: 0.01 });
    }
  }, [frequency]);

  useEffect(() => {
    if (filterRef.current) {
      filterRef.current.frequency.set({ value: cutoff, rampTo: 0.02 });
    }
  }, [cutoff]);

  const startAudio = useCallback(async () => {
    if (Tone.context.state !== 'running') {
      await Tone.start();
    }
    if (synthRef.current && !isPlaying) {
      synthRef.current.triggerAttack(frequency);
      onPlayingChange(true);
    }
  }, [frequency, isPlaying, onPlayingChange]);

  const stopAudio = useCallback(() => {
    if (synthRef.current && isPlaying) {
      synthRef.current.triggerRelease();
      onPlayingChange(false);
    }
  }, [isPlaying, onPlayingChange]);

  useEffect(() => {
    const idx = WAVEFORM_OPTIONS.indexOf(waveform);
    const rotation = -135 + idx * 135;
    setWaveformRotation(rotation);
  }, [waveform]);

  useEffect(() => {
    const minRot = -135;
    const maxRot = 135;
    const normalized = (cutoff - 20) / (20000 - 20);
    const rotation = minRot + normalized * (maxRot - minRot);
    setCutoffRotation(rotation);
  }, [cutoff]);

  const handleWaveformKnobDrag = useCallback((clientY: number, rect: DOMRect) => {
    const centerY = rect.top + rect.height / 2;
    const delta = centerY - clientY;
    const step = 40;
    const currentIdx = WAVEFORM_OPTIONS.indexOf(waveform);
    let newIdx = currentIdx;

    if (delta > step && currentIdx < WAVEFORM_OPTIONS.length - 1) {
      newIdx = currentIdx + 1;
    } else if (delta < -step && currentIdx > 0) {
      newIdx = currentIdx - 1;
    }

    if (newIdx !== currentIdx) {
      onWaveformChange(WAVEFORM_OPTIONS[newIdx]);
    }
  }, [waveform, onWaveformChange]);

  const handleCutoffKnobDrag = useCallback((clientY: number, rect: DOMRect) => {
    const centerY = rect.top + rect.height / 2;
    const delta = centerY - clientY;
    const sensitivity = 10;
    const change = delta * sensitivity;
    const newCutoff = Math.max(20, Math.min(20000, cutoff + change));
    onCutoffChange(newCutoff);
  }, [cutoff, onCutoffChange]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingWaveform && waveformKnobRef.current) {
        const rect = waveformKnobRef.current.getBoundingClientRect();
        handleWaveformKnobDrag(e.clientY, rect);
      }
      if (isDraggingCutoff && cutoffKnobRef.current) {
        const rect = cutoffKnobRef.current.getBoundingClientRect();
        handleCutoffKnobDrag(e.clientY, rect);
      }
    };

    const handleMouseUp = () => {
      setIsDraggingWaveform(false);
      setIsDraggingCutoff(false);
    };

    if (isDraggingWaveform || isDraggingCutoff) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingWaveform, isDraggingCutoff, handleWaveformKnobDrag, handleCutoffKnobDrag]);

  const drawArc = (progress: number, active: boolean) => {
    const cx = 50;
    const cy = 50;
    const r = 42;
    const startAngle = -135 * (Math.PI / 180);
    const endAngle = startAngle + progress * 270 * (Math.PI / 180);

    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);

    const largeArc = progress > 0.5 ? 1 : 0;

    return (
      <path
        d={`M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`}
        fill="none"
        stroke={active ? '#00d2ff' : 'rgba(0, 210, 255, 0.3)'}
        strokeWidth="3"
        strokeLinecap="round"
        style={{
          filter: active ? 'drop-shadow(0 0 6px #00d2ff)' : 'none',
          transition: 'all 0.1s ease-out'
        }}
      />
    );
  };

  const waveformProgress = WAVEFORM_OPTIONS.indexOf(waveform) / (WAVEFORM_OPTIONS.length - 1);
  const cutoffProgress = (cutoff - 20) / (20000 - 20);

  return (
    <div style={styles.container}>
      <div style={styles.controlsRow}>
        <div style={styles.knobWrapper}>
          <div style={styles.knobLabel}>WAVEFORM</div>
          <div
            ref={waveformKnobRef}
            style={{
              ...styles.knobContainer,
              cursor: 'grab'
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              setIsDraggingWaveform(true);
            }}
          >
            <svg width="100" height="100" viewBox="0 0 100 100" style={styles.knobSvg}>
              <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
              {drawArc(waveformProgress, isDraggingWaveform)}
              <g style={{ transform: `rotate(${waveformRotation}deg)`, transformOrigin: '50px 50px', transition: 'transform 0.2s ease-out' }}>
                <circle cx="50" cy="50" r="32" fill="rgba(30,30,50,0.9)" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
                <div />
                <line
                  x1="50"
                  y1="50"
                  x2="50"
                  y2="24"
                  stroke={isDraggingWaveform ? '#00d2ff' : 'rgba(255,255,255,0.6)'}
                  strokeWidth="2"
                  strokeLinecap="round"
                  style={{
                    filter: isDraggingWaveform ? 'drop-shadow(0 0 4px #00d2ff)' : 'none',
                    transition: 'all 0.2s ease-out'
                  }}
                />
              </g>
            </svg>
            <div style={styles.knobValue}>{WAVEFORM_LABELS[waveform]}</div>
          </div>
        </div>

        <div style={styles.sliderWrapper}>
          <div style={styles.sliderLabel}>
            <span style={styles.labelText}>FREQUENCY</span>
            <span style={styles.valueText}>{frequency.toFixed(0)} Hz</span>
          </div>
          <div style={styles.sliderTrack}>
            <div
              style={{
                ...styles.sliderFill,
                width: `${((frequency - 20) / (2000 - 20)) * 100}%`
              }}
            />
            <input
              type="range"
              min={20}
              max={2000}
              step={1}
              value={frequency}
              onChange={(e) => onFrequencyChange(Number(e.target.value))}
              style={styles.sliderInput}
            />
          </div>
          <div style={styles.sliderMarks}>
            <span style={styles.markText}>20</span>
            <span style={styles.markText}>1000</span>
            <span style={styles.markText}>2000</span>
          </div>
        </div>

        <div style={styles.knobWrapper}>
          <div style={styles.knobLabel}>CUTOFF</div>
          <div
            ref={cutoffKnobRef}
            style={{
              ...styles.knobContainer,
              cursor: 'grab'
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              setIsDraggingCutoff(true);
            }}
          >
            <svg width="100" height="100" viewBox="0 0 100 100" style={styles.knobSvg}>
              <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
              {drawArc(cutoffProgress, isDraggingCutoff)}
              <g style={{ transform: `rotate(${cutoffRotation}deg)`, transformOrigin: '50px 50px', transition: 'transform 0.05s linear' }}>
                <circle cx="50" cy="50" r="32" fill="rgba(30,30,50,0.9)" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
                <line
                  x1="50"
                  y1="50"
                  x2="50"
                  y2="24"
                  stroke={isDraggingCutoff ? '#00d2ff' : 'rgba(255,255,255,0.6)'}
                  strokeWidth="2"
                  strokeLinecap="round"
                  style={{
                    filter: isDraggingCutoff ? 'drop-shadow(0 0 4px #00d2ff)' : 'none',
                    transition: 'all 0.05s linear'
                  }}
                />
              </g>
            </svg>
            <div style={styles.knobValue}>{cutoff.toFixed(0)} Hz</div>
          </div>
        </div>
      </div>

      <div style={styles.playButtonWrapper}>
        <button
          style={{
            ...styles.playButton,
            background: isPlaying ? 'rgba(255, 80, 100, 0.2)' : 'rgba(0, 210, 255, 0.2)',
            borderColor: isPlaying ? '#ff5064' : '#00d2ff',
            color: isPlaying ? '#ff5064' : '#00d2ff'
          }}
          onClick={isPlaying ? stopAudio : startAudio}
        >
          {isPlaying ? '■ STOP' : '▶ PLAY'}
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    padding: '32px',
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    minWidth: '420px'
  },
  controlsRow: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '24px'
  },
  knobWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px'
  },
  knobLabel: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: 300,
    fontSize: '12px',
    letterSpacing: '2px'
  },
  knobContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    userSelect: 'none'
  },
  knobSvg: {
    display: 'block'
  },
  knobValue: {
    color: '#00d2ff',
    fontWeight: 300,
    fontSize: '13px',
    letterSpacing: '1px',
    minWidth: '60px',
    textAlign: 'center'
  },
  sliderWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    flex: 1,
    maxWidth: '200px'
  },
  sliderLabel: {
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
  },
  sliderTrack: {
    position: 'relative',
    height: '4px',
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '2px'
  },
  sliderFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    background: 'linear-gradient(90deg, #00d2ff, #928dab)',
    borderRadius: '2px',
    boxShadow: '0 0 8px rgba(0, 210, 255, 0.5)',
    transition: 'width 0.05s linear'
  },
  sliderInput: {
    position: 'absolute',
    top: '50%',
    left: 0,
    width: '100%',
    height: '20px',
    transform: 'translateY(-50%)',
    opacity: 0,
    cursor: 'pointer',
    margin: 0
  },
  sliderMarks: {
    display: 'flex',
    justifyContent: 'space-between'
  },
  markText: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontWeight: 300,
    fontSize: '10px'
  },
  playButtonWrapper: {
    display: 'flex',
    justifyContent: 'center',
    paddingTop: '8px'
  },
  playButton: {
    padding: '12px 48px',
    fontSize: '14px',
    fontWeight: 300,
    letterSpacing: '3px',
    border: '1px solid',
    borderRadius: '8px',
    cursor: 'pointer',
    background: 'transparent',
    transition: 'all 0.2s ease'
  }
};

export default ControlPanel;
