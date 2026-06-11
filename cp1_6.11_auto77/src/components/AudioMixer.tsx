import React, { useState, useRef, useEffect, useCallback } from 'react';
import { EffectType, OscillatorType } from '../utils/audioEngine';

interface AudioMixerProps {
  effectStates: Record<EffectType, { volume: number; enabled: boolean; pitch: number }>;
  oscillatorState: { type: OscillatorType; frequency: number; volume: number; enabled: boolean };
  onEffectVolumeChange: (type: EffectType, volume: number) => void;
  onEffectToggle: (type: EffectType, enabled: boolean) => void;
  onEffectPitchChange: (type: EffectType, pitch: number) => void;
  onOscillatorChange: (type: OscillatorType, frequency: number, volume: number) => void;
  onOscillatorToggle: (enabled: boolean) => void;
  onFileUpload: (file: File) => void;
  onFileVolumeChange: (volume: number) => void;
  fileVolume: number;
  hasFile: boolean;
  onPresetChange: (preset: string) => void;
}

const effectConfig: Record<EffectType, { name: string; color: string; icon: string }> = {
  rain: { name: '雨声', color: '#64b5f6', icon: '🌧️' },
  wind: { name: '风鸣', color: '#00e5ff', icon: '🌬️' },
  insects: { name: '虫鸣', color: '#cddc39', icon: '🦗' },
  heartbeat: { name: '心跳', color: '#ff80ab', icon: '💓' },
};

const presets = [
  { id: 'forest', name: '森林清晨', description: '雨+虫鸣+风' },
  { id: 'storm', name: '雷雨夜', description: '雨+心跳+风' },
  { id: 'space', name: '寂静宇宙', description: '虫鸣+风+方波' },
];

const AudioMixer: React.FC<AudioMixerProps> = ({
  effectStates,
  oscillatorState,
  onEffectVolumeChange,
  onEffectToggle,
  onEffectPitchChange,
  onOscillatorChange,
  onOscillatorToggle,
  onFileUpload,
  onFileVolumeChange,
  fileVolume,
  hasFile,
  onPresetChange,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeSlider, setActiveSlider] = useState<EffectType | null>(null);
  const [sliderValue, setSliderValue] = useState<number>(0);
  const [knobDragging, setKnobDragging] = useState<EffectType | null>(null);
  const knobStartY = useRef<number>(0);
  const knobStartPitch = useRef<number>(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };

  const handleSliderMouseDown = (type: EffectType, e: React.MouseEvent) => {
    const slider = (e.currentTarget as HTMLElement).closest('.effect-slider');
    if (!slider) return;
    const rect = slider.getBoundingClientRect();
    const percent = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    setActiveSlider(type);
    setSliderValue(percent);
    onEffectVolumeChange(type, percent);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const rect2 = slider.getBoundingClientRect();
      const pct = Math.max(0, Math.min(100, ((moveEvent.clientX - rect2.left) / rect2.width) * 100));
      setSliderValue(pct);
      onEffectVolumeChange(type, pct);
    };
    const handleMouseUp = () => {
      setActiveSlider(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleKnobMouseDown = useCallback((type: EffectType, e: React.MouseEvent) => {
    e.preventDefault();
    setKnobDragging(type);
    knobStartY.current = e.clientY;
    knobStartPitch.current = effectStates[type].pitch;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = knobStartY.current - moveEvent.clientY;
      const pitchChange = deltaY / 2;
      const newPitch = Math.max(-12, Math.min(12, knobStartPitch.current + pitchChange));
      onEffectPitchChange(type, Math.round(newPitch));
    };

    const handleMouseUp = () => {
      setKnobDragging(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [effectStates, onEffectPitchChange]);

  useEffect(() => {
    if (knobDragging) {
      document.body.style.cursor = 'ns-resize';
    } else {
      document.body.style.cursor = 'default';
    }
    return () => {
      document.body.style.cursor = 'default';
    };
  }, [knobDragging]);

  const renderKnob = (type: EffectType, pitch: number) => {
    const rotation = (pitch / 12) * 120;
    const color = effectConfig[type].color;

    return (
      <div className="knob-container" style={{ textAlign: 'center' }}>
        <div
          style={{
            fontSize: '12px',
            color: '#a0a0a0',
            marginBottom: '4px',
            height: '16px',
          }}
        >
          {pitch > 0 ? `+${pitch}` : pitch}
        </div>
        <div
          onMouseDown={(e) => handleKnobMouseDown(type, e)}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: `radial-gradient(circle at 30% 30%, #2a3a5a, #1a2a4a)`,
            border: `2px solid ${color}`,
            cursor: knobDragging === type ? 'ns-resize' : 'grab',
            position: 'relative',
            boxShadow: `0 0 10px ${color}40`,
            display: 'inline-block',
            transition: 'box-shadow 0.2s',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '4px',
              left: '50%',
              width: '3px',
              height: '10px',
              background: color,
              borderRadius: '2px',
              transform: `translateX(-50%) rotate(${rotation}deg)`,
              transformOrigin: 'bottom center',
              transition: knobDragging === type ? 'none' : 'transform 0.1s',
            }}
          />
        </div>
        <div style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>音高</div>
      </div>
    );
  };

  return (
    <div
      style={{
        height: '100%',
        overflowY: 'auto',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      <div style={{ color: '#fff', fontSize: '18px', fontWeight: 'bold', marginBottom: '4px' }}>
        🎵 音效调色板
      </div>

      <div
        style={{
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '12px',
          padding: '16px',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <div style={{ color: '#ccc', fontSize: '14px', marginBottom: '12px', fontWeight: 500 }}>
          📁 音频文件
        </div>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #7c4dff, #00e5ff)',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
              transition: 'transform 0.1s, box-shadow 0.2s',
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            {hasFile ? '🔄 更换文件' : '📤 上传音频'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/mp3,audio/wav,audio/mpeg"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </div>
        {hasFile && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#888', marginBottom: '6px' }}>
              <span>音量</span>
              <span>{Math.round(fileVolume)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={fileVolume}
              onChange={(e) => onFileVolumeChange(Number(e.target.value))}
              style={{
                width: '100%',
                height: '6px',
                borderRadius: '3px',
                background: 'rgba(255,255,255,0.1)',
                outline: 'none',
                appearance: 'none',
                cursor: 'pointer',
              }}
            />
          </div>
        )}
      </div>

      <div
        style={{
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '12px',
          padding: '16px',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <div style={{ color: '#ccc', fontSize: '14px', marginBottom: '12px', fontWeight: 500 }}>
          🎛️ 振荡器
        </div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          {(['sine', 'sawtooth', 'square'] as OscillatorType[]).map((type) => (
            <button
              key={type}
              onClick={() => {
                onOscillatorChange(type, oscillatorState.frequency, oscillatorState.volume);
                if (!oscillatorState.enabled) onOscillatorToggle(true);
              }}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '8px',
                border: oscillatorState.type === type && oscillatorState.enabled ? '2px solid #00e5ff' : '2px solid transparent',
                background: oscillatorState.type === type && oscillatorState.enabled
                  ? 'rgba(0,229,255,0.2)'
                  : 'rgba(255,255,255,0.08)',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '12px',
                transition: 'all 0.1s',
              }}
              onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
              onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              {type === 'sine' ? '正弦波' : type === 'sawtooth' ? '锯齿波' : '方波'}
            </button>
          ))}
        </div>
        <div style={{ marginBottom: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#888', marginBottom: '6px' }}>
            <span>频率</span>
            <span>{oscillatorState.frequency} Hz</span>
          </div>
          <input
            type="range"
            min="20"
            max="2000"
            value={oscillatorState.frequency}
            onChange={(e) => onOscillatorChange(oscillatorState.type, Number(e.target.value), oscillatorState.volume)}
            style={{
              width: '100%',
              height: '6px',
              borderRadius: '3px',
              background: 'rgba(255,255,255,0.1)',
              outline: 'none',
              appearance: 'none',
              cursor: 'pointer',
            }}
          />
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#888', marginBottom: '6px' }}>
            <span>音量</span>
            <span>{Math.round(oscillatorState.volume)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={oscillatorState.volume}
            onChange={(e) => {
              const vol = Number(e.target.value);
              onOscillatorChange(oscillatorState.type, oscillatorState.frequency, vol);
              if (vol > 0 && !oscillatorState.enabled) onOscillatorToggle(true);
              if (vol === 0 && oscillatorState.enabled) onOscillatorToggle(false);
            }}
            style={{
              width: '100%',
              height: '6px',
              borderRadius: '3px',
              background: 'rgba(255,255,255,0.1)',
              outline: 'none',
              appearance: 'none',
              cursor: 'pointer',
            }}
          />
        </div>
      </div>

      <div
        style={{
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '12px',
          padding: '16px',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <div style={{ color: '#ccc', fontSize: '14px', marginBottom: '12px', fontWeight: 500 }}>
          🎨 场景预设
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {presets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => onPresetChange(preset.id)}
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.05)',
                color: '#fff',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '13px',
                transition: 'all 0.2s',
              }}
              onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.97)')}
              onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0,229,255,0.1)';
                e.currentTarget.style.borderColor = 'rgba(0,229,255,0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
              }}
            >
              <div style={{ fontWeight: 500 }}>{preset.name}</div>
              <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{preset.description}</div>
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '12px',
          padding: '16px',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <div style={{ color: '#ccc', fontSize: '14px', marginBottom: '12px', fontWeight: 500 }}>
          🔊 音效通道
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {(Object.keys(effectConfig) as EffectType[]).map((type) => {
            const config = effectConfig[type];
            const state = effectStates[type];
            const isActive = state.enabled && state.volume > 0;

            return (
              <div
                key={type}
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  background: isActive
                    ? `${config.color}15`
                    : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${isActive ? config.color + '40' : 'rgba(255,255,255,0.08)'}`,
                  transition: 'all 0.3s',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '20px' }}>{config.icon}</span>
                    <span style={{ color: '#fff', fontSize: '14px', fontWeight: 500 }}>
                      {config.name}
                    </span>
                  </div>
                  <button
                    onClick={() => onEffectToggle(type, !state.enabled)}
                    style={{
                      width: '44px',
                      height: '24px',
                      borderRadius: '12px',
                      border: 'none',
                      background: state.enabled ? config.color : 'rgba(255,255,255,0.2)',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'background 0.3s',
                    }}
                    onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
                    onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        top: '2px',
                        left: state.enabled ? '22px' : '2px',
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: '#fff',
                        transition: 'left 0.3s',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                      }}
                    />
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <div
                      className="effect-slider"
                      onMouseDown={(e) => handleSliderMouseDown(type, e)}
                      style={{
                        position: 'relative',
                        height: '8px',
                        borderRadius: '4px',
                        background: 'rgba(255,255,255,0.1)',
                        cursor: 'pointer',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          borderRadius: '4px',
                          background: `linear-gradient(90deg, ${config.color}80, ${config.color})`,
                          width: `${state.volume}%`,
                          transition: activeSlider === type ? 'none' : 'width 0.1s',
                        }}
                      />
                      {activeSlider === type && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '-24px',
                            left: `${sliderValue}%`,
                            transform: 'translateX(-50%)',
                            background: config.color,
                            color: '#000',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                          }}
                        >
                          {Math.round(sliderValue)}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#666', marginTop: '6px' }}>
                      <span>0</span>
                      <span>{Math.round(state.volume)}%</span>
                      <span>100</span>
                    </div>
                  </div>
                  {renderKnob(type, state.pitch)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #00e5ff;
          cursor: pointer;
          box-shadow: 0 0 8px rgba(0,229,255,0.5);
        }
        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #00e5ff;
          cursor: pointer;
          border: none;
          box-shadow: 0 0 8px rgba(0,229,255,0.5);
        }
      `}</style>
    </div>
  );
};

export default AudioMixer;
