import React, { useState, useEffect, useRef, useCallback } from 'react';
import WaveVisualizer from './components/WaveVisualizer';
import AudioMixer from './components/AudioMixer';
import { audioEngine, AudioAnalysisData, EffectType, OscillatorType } from './utils/audioEngine';

const App: React.FC = () => {
  const [analysisData, setAnalysisData] = useState<AudioAnalysisData | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasFile, setHasFile] = useState(false);
  const [fileVolume, setFileVolume] = useState(80);
  const [oscillatorState, setOscillatorState] = useState({
    type: 'sine' as OscillatorType,
    frequency: 440,
    volume: 0,
    enabled: false,
  });
  const [effectStates, setEffectStates] = useState<Record<EffectType, { volume: number; enabled: boolean; pitch: number }>>({
    rain: { volume: 50, enabled: false, pitch: 0 },
    wind: { volume: 50, enabled: false, pitch: 0 },
    insects: { volume: 50, enabled: false, pitch: 0 },
    heartbeat: { volume: 50, enabled: false, pitch: 0 },
  });
  const [isMobile, setIsMobile] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    audioEngine.setOnAnalysisCallback((data) => {
      setAnalysisData(data);
    });

    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  useEffect(() => {
    setIsPlaying(audioEngine.isAudioPlaying());
  }, [analysisData]);

  const handlePlayPause = useCallback(() => {
    audioEngine.togglePlayPause();
    setIsPlaying(audioEngine.isAudioPlaying());
  }, []);

  const handleReset = useCallback(() => {
    audioEngine.resetAll();
    setFileVolume(0);
    setOscillatorState({ type: 'sine', frequency: 440, volume: 0, enabled: false });
    setEffectStates({
      rain: { volume: 0, enabled: false, pitch: 0 },
      wind: { volume: 0, enabled: false, pitch: 0 },
      insects: { volume: 0, enabled: false, pitch: 0 },
      heartbeat: { volume: 0, enabled: false, pitch: 0 },
    });
    setIsPlaying(false);
  }, []);

  const handleDownloadSnapshot = useCallback(() => {
    if (canvasRef.current) {
      const link = document.createElement('a');
      link.download = 'waveform-snapshot.png';
      link.href = canvasRef.current.toDataURL('image/png');
      link.click();
    }
  }, []);

  const handleFileUpload = useCallback(async (file: File) => {
    try {
      await audioEngine.loadAudioFile(file);
      setHasFile(true);
      setIsPlaying(true);
      setFileVolume(80);
      audioEngine.setFileVolume(80);
    } catch (error) {
      console.error('Error loading audio file:', error);
    }
  }, []);

  const handleFileVolumeChange = useCallback((volume: number) => {
    setFileVolume(volume);
    audioEngine.setFileVolume(volume);
  }, []);

  const handleOscillatorChange = useCallback((type: OscillatorType, frequency: number, volume: number) => {
    setOscillatorState((prev) => ({ ...prev, type, frequency, volume }));
    audioEngine.setOscillator(type, frequency, volume);
  }, []);

  const handleOscillatorToggle = useCallback((enabled: boolean) => {
    setOscillatorState((prev) => ({ ...prev, enabled }));
    audioEngine.toggleOscillator(enabled);
  }, []);

  const handleEffectVolumeChange = useCallback((type: EffectType, volume: number) => {
    setEffectStates((prev) => ({
      ...prev,
      [type]: { ...prev[type], volume },
    }));
    audioEngine.setEffectVolume(type, volume);
  }, []);

  const handleEffectToggle = useCallback((type: EffectType, enabled: boolean) => {
    setEffectStates((prev) => ({
      ...prev,
      [type]: { ...prev[type], enabled },
    }));
    audioEngine.toggleEffect(type, enabled);
  }, []);

  const handleEffectPitchChange = useCallback((type: EffectType, pitch: number) => {
    setEffectStates((prev) => ({
      ...prev,
      [type]: { ...prev[type], pitch },
    }));
    audioEngine.setEffectPitch(type, pitch);
  }, []);

  const handlePresetChange = useCallback((preset: string) => {
    const duration = 500;
    const startTime = performance.now();

    const startStates = { ...effectStates };
    const startOsc = { ...oscillatorState };

    let targetStates: Record<EffectType, { volume: number; enabled: boolean; pitch: number }>;
    let targetOsc: { type: OscillatorType; frequency: number; volume: number; enabled: boolean };

    switch (preset) {
      case 'forest':
        targetStates = {
          rain: { volume: 60, enabled: true, pitch: 0 },
          wind: { volume: 20, enabled: true, pitch: 0 },
          insects: { volume: 40, enabled: true, pitch: 0 },
          heartbeat: { volume: 0, enabled: false, pitch: 0 },
        };
        targetOsc = { type: 'sine', frequency: 440, volume: 0, enabled: false };
        break;
      case 'storm':
        targetStates = {
          rain: { volume: 80, enabled: true, pitch: 0 },
          wind: { volume: 20, enabled: true, pitch: 0 },
          insects: { volume: 0, enabled: false, pitch: 0 },
          heartbeat: { volume: 60, enabled: true, pitch: 0 },
        };
        targetOsc = { type: 'sine', frequency: 440, volume: 0, enabled: false };
        break;
      case 'space':
        targetStates = {
          rain: { volume: 0, enabled: false, pitch: 0 },
          wind: { volume: 40, enabled: true, pitch: 0 },
          insects: { volume: 40, enabled: true, pitch: 0 },
          heartbeat: { volume: 0, enabled: false, pitch: 0 },
        };
        targetOsc = { type: 'square', frequency: 220, volume: 20, enabled: true };
        break;
      default:
        return;
    }

    const easeInOut = (t: number) => {
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    };

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeInOut(progress);

      const newStates = { ...effectStates };
      (Object.keys(newStates) as EffectType[]).forEach((type) => {
        newStates[type] = {
          volume: startStates[type].volume + (targetStates[type].volume - startStates[type].volume) * eased,
          enabled: targetStates[type].enabled,
          pitch: startStates[type].pitch + (targetStates[type].pitch - startStates[type].pitch) * eased,
        };
        audioEngine.setEffectVolume(type, newStates[type].volume);
        audioEngine.setEffectPitch(type, newStates[type].pitch);
        if (targetStates[type].enabled && !startStates[type].enabled) {
          audioEngine.toggleEffect(type, true);
        }
        if (!targetStates[type].enabled && targetStates[type].volume === 0 && progress > 0.5) {
          audioEngine.toggleEffect(type, false);
        }
      });
      setEffectStates(newStates);

      const newOscVolume = startOsc.volume + (targetOsc.volume - startOsc.volume) * eased;
      if (targetOsc.enabled && !startOsc.enabled) {
        audioEngine.toggleOscillator(true);
        setOscillatorState((prev) => ({ ...prev, enabled: true }));
      }
      audioEngine.setOscillator(targetOsc.type, targetOsc.frequency, newOscVolume);
      setOscillatorState((prev) => ({
        ...prev,
        type: targetOsc.type,
        frequency: targetOsc.frequency,
        volume: newOscVolume,
      }));
      if (!targetOsc.enabled && targetOsc.volume === 0 && progress > 0.5) {
        audioEngine.toggleOscillator(false);
        setOscillatorState((prev) => ({ ...prev, enabled: false }));
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [effectStates, oscillatorState]);

  const toolbarStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: '60px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '20px',
    zIndex: 100,
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    background: 'rgba(13, 27, 42, 0.6)',
    borderBottom: '1px solid rgba(0, 229, 255, 0.2)',
  };

  const toolbarButtonStyle: React.CSSProperties = {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(255,255,255,0.05)',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  };

  const dividerStyle: React.CSSProperties = isMobile
    ? {
        width: '100%',
        height: '2px',
        background: 'linear-gradient(90deg, transparent, #00e5ff, transparent)',
        opacity: 0.6,
        boxShadow: '0 0 10px #00e5ff',
      }
    : {
        width: '2px',
        height: '100%',
        background: 'linear-gradient(180deg, transparent, #00e5ff, transparent)',
        opacity: 0.6,
        boxShadow: '0 0 10px #00e5ff',
      };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        paddingTop: '60px',
      }}
    >
      <div style={toolbarStyle}>
        <button
          onClick={handlePlayPause}
          style={{
            ...toolbarButtonStyle,
            transform: isPlaying ? 'rotate(0deg)' : 'rotate(180deg)',
            transition: 'transform 0.3s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 0 15px #ffe0b2';
            e.currentTarget.style.borderColor = '#ffe0b2';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = 'none';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          title={isPlaying ? '暂停' : '继续'}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button
          onClick={handleReset}
          style={toolbarButtonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 0 15px #ffe0b2';
            e.currentTarget.style.borderColor = '#ffe0b2';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = 'none';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          title="重置"
        >
          ↺
        </button>
        <button
          onClick={handleDownloadSnapshot}
          style={toolbarButtonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 0 15px #ffe0b2';
            e.currentTarget.style.borderColor = '#ffe0b2';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = 'none';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          title="下载快照"
        >
          📷
        </button>
        <div style={{ color: '#fff', fontSize: '14px', marginLeft: '20px', fontWeight: 500 }}>
          波形可视化 & 音效调色板
        </div>
      </div>

      <div
        style={{
          width: isMobile ? '100%' : '60%',
          height: isMobile ? '50%' : '100%',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <WaveVisualizer analysisData={analysisData} canvasRef={canvasRef} />
      </div>

      <div style={dividerStyle} />

      <div
        style={{
          width: isMobile ? '100%' : '38%',
          height: isMobile ? '50%' : '100%',
          overflow: 'auto',
        }}
      >
        <AudioMixer
          effectStates={effectStates}
          oscillatorState={oscillatorState}
          onEffectVolumeChange={handleEffectVolumeChange}
          onEffectToggle={handleEffectToggle}
          onEffectPitchChange={handleEffectPitchChange}
          onOscillatorChange={handleOscillatorChange}
          onOscillatorToggle={handleOscillatorToggle}
          onFileUpload={handleFileUpload}
          onFileVolumeChange={handleFileVolumeChange}
          fileVolume={fileVolume}
          hasFile={hasFile}
          onPresetChange={handlePresetChange}
        />
      </div>
    </div>
  );
};

export default App;
