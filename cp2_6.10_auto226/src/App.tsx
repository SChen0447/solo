import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  SynthEngine,
  calculateWaveform,
  defaultPresets,
  SynthParams,
  Preset,
  WaveformType,
} from './SynthEngine';
import PresetPanel from './PresetPanel';
import WaveformView from './WaveformView';
import cloneDeep from 'lodash/cloneDeep';

const CONTROL_PANEL_STYLE: React.CSSProperties = {
  backgroundColor: 'rgba(30, 30, 46, 0.7)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  borderRadius: 12,
  padding: 20,
  position: 'relative',
  overflow: 'hidden',
};

const SECTION_LABEL: React.CSSProperties = {
  fontSize: 12,
  color: '#9090a8',
  textTransform: 'uppercase',
  letterSpacing: 1,
  marginBottom: 12,
};

const App: React.FC = () => {
  const [params, setParams] = useState<SynthParams>(cloneDeep(defaultPresets[0].params));
  const [presets, setPresets] = useState<Preset[]>(cloneDeep(defaultPresets));
  const [activePresetId, setActivePresetId] = useState<string | null>(defaultPresets[0].id);
  const [playing, setPlaying] = useState(false);
  const [fps, setFps] = useState(60);
  const [renderTime, setRenderTime] = useState(0);
  const [perfWarning, setPerfWarning] = useState(false);
  const [activeSlider, setActiveSlider] = useState<string | null>(null);
  const [lfoClickRing, setLfoClickRing] = useState<{ key: string; time: number } | null>(null);

  const synthRef = useRef<SynthEngine>(new SynthEngine(params));
  const playTimeoutRef = useRef<number | null>(null);
  const frameCountRef = useRef(0);
  const lastFpsTimeRef = useRef(performance.now());
  const fpsRafRef = useRef<number>(0);
  const [glowPos, setGlowPos] = useState<{ x: number; y: number; key: string } | null>(null);

  const waveform = useMemo(() => {
    try {
      return calculateWaveform(params, 500, 8820);
    } catch {
      return null;
    }
  }, [params]);

  useEffect(() => {
    synthRef.current.setParams(params);
  }, [params]);

  useEffect(() => {
    const tick = () => {
      frameCountRef.current++;
      const now = performance.now();
      if (now - lastFpsTimeRef.current >= 1000) {
        setFps(frameCountRef.current);
        frameCountRef.current = 0;
        lastFpsTimeRef.current = now;
      }
      fpsRafRef.current = requestAnimationFrame(tick);
    };
    fpsRafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(fpsRafRef.current);
  }, []);

  useEffect(() => {
    if (fps < 50) {
      setPerfWarning(true);
      const t = setTimeout(() => setPerfWarning(false), 500);
      return () => clearTimeout(t);
    }
  }, [fps]);

  const triggerPlay = useCallback(() => {
    if (playTimeoutRef.current) {
      window.clearTimeout(playTimeoutRef.current);
    }
    setPlaying(true);
    synthRef.current.playTestTone(500);
    playTimeoutRef.current = window.setTimeout(() => setPlaying(false), 500);
  }, []);

  const updateParam = useCallback((updater: (prev: SynthParams) => SynthParams) => {
    setParams((prev) => updater(prev));
    setActivePresetId(null);
    triggerPlay();
  }, [triggerPlay]);

  const handleSliderInteraction = (key: string, e: React.MouseEvent | React.TouchEvent) => {
    setActiveSlider(key);
    let clientX = 0;
    let clientY = 0;
    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setGlowPos({ x: clientX - rect.left, y: clientY - rect.top, key });
  };

  const handleSliderRelease = () => {
    setActiveSlider(null);
    setTimeout(() => setGlowPos(null), 200);
  };

  const handleLfoKnobClick = (key: string) => {
    setLfoClickRing({ key, time: Date.now() });
    setTimeout(() => setLfoClickRing(null), 600);
    triggerPlay();
  };

  const handleLoadPreset = (preset: Preset) => {
    setParams(cloneDeep(preset.params));
    setActivePresetId(preset.id);
    triggerPlay();
  };

  const handleSavePreset = (preset: Preset) => {
    setPresets((prev) => [...prev, preset]);
    setActivePresetId(preset.id);
  };

  const handleRandomize = () => {
    const waveforms: WaveformType[] = ['sine', 'square', 'sawtooth', 'triangle'];
    const randomParams: SynthParams = {
      oscillator: { waveform: waveforms[Math.floor(Math.random() * waveforms.length)] },
      filter: {
        cutoff: Math.floor(200 + Math.random() * 14800),
        resonance: Math.floor(Math.random() * 100),
      },
      envelope: {
        attack: Math.floor(50 + Math.random() * 450),
        decay: Math.floor(50 + Math.random() * 450),
        sustain: Math.random(),
        release: Math.floor(50 + Math.random() * 450),
      },
      lfo: {
        rate: parseFloat((0.1 + Math.random() * 9.9).toFixed(2)),
        depth: parseFloat(Math.random().toFixed(2)),
      },
    };
    setParams(randomParams);
    setActivePresetId(null);
    triggerPlay();
  };

  const sliderStyle = (key: string): React.CSSProperties => ({
    position: 'relative',
    width: '100%',
    height: 36,
    display: 'flex',
    alignItems: 'center',
  });

  const inputRangeStyle: React.CSSProperties = {
    width: '100%',
    height: 6,
    appearance: 'none',
    WebkitAppearance: 'none',
    background: '#3a3a5a',
    borderRadius: 3,
    outline: 'none',
    cursor: 'pointer',
  };

  const renderSlider = (
    key: string,
    label: string,
    value: number,
    min: number,
    max: number,
    step: number,
    unit: string,
    onChange: (v: number) => void,
    showTicks: boolean = false
  ) => (
    <div key={key} style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12, color: '#a0a0b8' }}>
        <span>{label}</span>
        <span style={{ color: '#d4bfff' }}>
          {typeof value === 'number' && !Number.isInteger(value) ? value.toFixed(2) : value}
          {unit}
        </span>
      </div>
      <div
        style={sliderStyle(key)}
        onMouseDown={(e) => handleSliderInteraction(key, e)}
        onMouseUp={handleSliderRelease}
        onMouseLeave={handleSliderRelease}
        onTouchStart={(e) => handleSliderInteraction(key, e)}
        onTouchEnd={handleSliderRelease}
      >
        {showTicks && (
          <div
            style={{
              position: 'absolute',
              top: 15,
              left: 4,
              right: 4,
              height: 6,
              display: 'flex',
              justifyContent: 'space-between',
              pointerEvents: 'none',
            }}
          >
            {[...Array(5)].map((_, i) => (
              <div key={i} style={{ width: 2, height: 6, backgroundColor: '#4a4a6a', borderRadius: 1 }} />
            ))}
          </div>
        )}
        {activeSlider === key && glowPos && glowPos.key === key && (
          <div
            style={{
              position: 'absolute',
              left: glowPos.x,
              top: glowPos.y,
              width: 60,
              height: 60,
              marginLeft: -30,
              marginTop: -30,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(212,191,255,0.35) 0%, rgba(124,92,191,0) 70%)',
              pointerEvents: 'none',
              animation: 'glowFade 0.2s ease-out forwards',
            }}
          />
        )}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={inputRangeStyle}
          onMouseDown={(e) => e.stopPropagation()}
        />
      </div>
      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #d4bfff;
          cursor: pointer;
          box-shadow: 0 0 6px rgba(212, 191, 255, 0.5);
          transition: box-shadow 0.15s ease;
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          box-shadow: 0 0 12px rgba(212, 191, 255, 0.8);
        }
        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #d4bfff;
          cursor: pointer;
          border: none;
          box-shadow: 0 0 6px rgba(212, 191, 255, 0.5);
        }
        @keyframes glowFade {
          from { opacity: 1; transform: scale(0.8); }
          to { opacity: 0; transform: scale(1.4); }
        }
        @keyframes pulseRing {
          0% { transform: scale(0.5); opacity: 0.9; }
          100% { transform: scale(2.5); opacity: 0; }
        }
      `}</style>
    </div>
  );

  const renderKnob = (
    key: string,
    label: string,
    value: number,
    min: number,
    max: number,
    unit: string,
    onChange: (v: number) => void
  ) => {
    const percent = ((value - min) / (max - min)) * 100;
    const angle = (percent / 100) * 270 - 135;
    return (
      <div key={key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <div style={{ fontSize: 12, color: '#a0a0b8' }}>{label}</div>
        <div
          onClick={() => handleLfoKnobClick(key)}
          style={{
            position: 'relative',
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'conic-gradient(from 225deg, #7c5cbf 0%, #b39ddb ' + percent + '%, #3a3a5a ' + percent + '%, #3a3a5a 100%)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'inset 0 0 10px rgba(0,0,0,0.4)',
          }}
          onWheel={(e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -1 : 1;
            const step = (max - min) / 100;
            const newValue = Math.min(max, Math.max(min, value + delta * step));
            onChange(parseFloat(newValue.toFixed(2)));
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: '#1e1e2e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                width: 2,
                height: 18,
                background: '#d4bfff',
                top: 6,
                transformOrigin: 'center 18px',
                transform: `rotate(${angle}deg)`,
                borderRadius: 1,
              }}
            />
          </div>
          {lfoClickRing && lfoClickRing.key === key && (
            <div
              key={lfoClickRing.time}
              style={{
                position: 'absolute',
                width: 64,
                height: 64,
                borderRadius: '50%',
                border: '2px solid rgba(212, 191, 255, 0.6)',
                animation: 'pulseRing 0.6s ease-out forwards',
                pointerEvents: 'none',
              }}
            />
          )}
        </div>
        <div style={{ fontSize: 12, color: '#d4bfff' }}>
          {value.toFixed(2)}{unit}
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        width: '100%',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0d0d1a 0%, #1a1a2e 100%)',
        fontFamily: 'Consolas, "JetBrains Mono", "Courier New", monospace',
        fontSize: 14,
        color: '#c4c4d4',
        padding: '40px 0',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          maxWidth: 1400,
          margin: '0 auto',
          padding: '0 40px',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
        }}
      >
        <h1
          style={{
            textAlign: 'center',
            margin: 0,
            fontSize: 24,
            color: '#d4bfff',
            letterSpacing: 3,
            fontWeight: 600,
          }}
        >
          音色工坊
        </h1>

        <PresetPanel
          presets={presets}
          activePresetId={activePresetId}
          onLoadPreset={handleLoadPreset}
          onSavePreset={handleSavePreset}
          getCurrentParams={() => params}
        />

        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={CONTROL_PANEL_STYLE}>
              <div style={SECTION_LABEL}>振荡器 Oscillator</div>
              <div>
                <div style={{ fontSize: 12, color: '#a0a0b8', marginBottom: 8 }}>波形 Waveform</div>
                <select
                  value={params.oscillator.waveform}
                  onChange={(e) =>
                    updateParam((p) => ({
                      ...p,
                      oscillator: { waveform: e.target.value as WaveformType },
                    }))
                  }
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: '#1e1e2e',
                    border: '1px solid #4a4a6a',
                    borderRadius: 8,
                    color: '#c4c4d4',
                    fontFamily: 'Consolas, monospace',
                    fontSize: 14,
                    outline: 'none',
                    cursor: 'pointer',
                    appearance: 'none',
                  }}
                >
                  <option value="sine">正弦波 Sine</option>
                  <option value="square">方波 Square</option>
                  <option value="sawtooth">锯齿波 Sawtooth</option>
                  <option value="triangle">三角波 Triangle</option>
                </select>
              </div>
            </div>

            <div style={CONTROL_PANEL_STYLE}>
              <div style={SECTION_LABEL}>滤波器 Filter</div>
              {renderSlider(
                'cutoff',
                '截止频率 Cutoff',
                params.filter.cutoff,
                20,
                20000,
                1,
                'Hz',
                (v) => updateParam((p) => ({ ...p, filter: { ...p.filter, cutoff: v } }))
              )}
              {renderSlider(
                'resonance',
                '共振 Resonance',
                params.filter.resonance,
                0,
                100,
                1,
                '%',
                (v) => updateParam((p) => ({ ...p, filter: { ...p.filter, resonance: v } }))
              )}
            </div>

            <div style={CONTROL_PANEL_STYLE}>
              <div style={SECTION_LABEL}>包络 Envelope (ADSR)</div>
              {renderSlider(
                'attack',
                'Attack',
                params.envelope.attack,
                0,
                2000,
                1,
                'ms',
                (v) => updateParam((p) => ({ ...p, envelope: { ...p.envelope, attack: v } })),
                true
              )}
              {renderSlider(
                'decay',
                'Decay',
                params.envelope.decay,
                0,
                2000,
                1,
                'ms',
                (v) => updateParam((p) => ({ ...p, envelope: { ...p.envelope, decay: v } })),
                true
              )}
              {renderSlider(
                'sustain',
                'Sustain',
                parseFloat(params.envelope.sustain.toFixed(2)),
                0,
                1,
                0.01,
                '',
                (v) => updateParam((p) => ({ ...p, envelope: { ...p.envelope, sustain: v } })),
                true
              )}
              {renderSlider(
                'release',
                'Release',
                params.envelope.release,
                0,
                3000,
                1,
                'ms',
                (v) => updateParam((p) => ({ ...p, envelope: { ...p.envelope, release: v } })),
                true
              )}
            </div>

            <div style={CONTROL_PANEL_STYLE}>
              <div style={SECTION_LABEL}>低频振荡器 LFO</div>
              <div style={{ display: 'flex', justifyContent: 'space-around', padding: '10px 0' }}>
                {renderKnob(
                  'lfo-rate',
                  '速率 Rate',
                  params.lfo.rate,
                  0.1,
                  20,
                  'Hz',
                  (v) => updateParam((p) => ({ ...p, lfo: { ...p.lfo, rate: v } }))
                )}
                {renderKnob(
                  'lfo-depth',
                  '深度 Depth',
                  params.lfo.depth,
                  0,
                  1,
                  '',
                  (v) => updateParam((p) => ({ ...p, lfo: { ...p.lfo, depth: v } }))
                )}
              </div>
            </div>
          </div>

          <div style={{ width: 400, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <WaveformView waveform={waveform} playing={playing} onRenderTime={setRenderTime} />

            <button
              onClick={handleRandomize}
              onMouseDown={(e) => {
                e.currentTarget.style.backgroundColor = '#ff4d4d';
                e.currentTarget.style.transform = 'scale(0.97)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.backgroundColor = '#ff6b6b';
                e.currentTarget.style.transform = 'scale(1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#ff6b6b';
                e.currentTarget.style.transform = 'scale(1)';
              }}
              style={{
                width: '100%',
                padding: '16px 0',
                backgroundColor: '#ff6b6b',
                color: '#ffffff',
                border: 'none',
                borderRadius: 6,
                fontSize: 14,
                fontFamily: 'Consolas, monospace',
                letterSpacing: 2,
                cursor: 'pointer',
                transition: 'transform 0.15s ease, background-color 0.15s ease',
                boxShadow: '0 4px 14px rgba(255, 107, 107, 0.35)',
              }}
            >
              ✦ 随机探索 Randomize
            </button>
          </div>
        </div>
      </div>

      <div
        style={{
          position: 'fixed',
          left: 20,
          bottom: 20,
          width: 180,
          height: 40,
          backgroundColor: 'rgba(30, 30, 46, 0.8)',
          borderRadius: 8,
          color: '#b0b0c4',
          fontSize: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          padding: '0 12px',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          border: perfWarning ? '2px solid #ff4d4d' : '1px solid #3a3a5a',
          transition: 'border-color 0.3s ease',
          boxShadow: perfWarning ? '0 0 12px rgba(255, 77, 77, 0.5)' : 'none',
          animation: perfWarning ? 'warnBlink 0.5s ease-in-out' : 'none',
        }}
      >
        <span>
          FPS: <span style={{ color: fps >= 50 ? '#a0e8a0' : '#ff8080', fontWeight: 600 }}>{fps}</span>
        </span>
        <span style={{ width: 1, height: 18, backgroundColor: '#3a3a5a' }} />
        <span>
          Render: <span style={{ color: renderTime < 16 ? '#a0e8a0' : '#ff8080', fontWeight: 600 }}>{renderTime.toFixed(1)}ms</span>
        </span>
        <style>{`
          @keyframes warnBlink {
            0%, 100% { box-shadow: 0 0 0 rgba(255,77,77,0); }
            50% { box-shadow: 0 0 18px rgba(255,77,77,0.7); }
          }
        `}</style>
      </div>
    </div>
  );
};

export default App;
