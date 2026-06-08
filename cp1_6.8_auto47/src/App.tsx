import React, { useState, useEffect, useCallback, useRef } from 'react';
import AudioUploader from './components/AudioUploader';
import Visualizer from './components/Visualizer';
import LeftPanel from './components/LeftPanel';
import RightPanel from './components/RightPanel';
import NavBar from './components/NavBar';
import MobileDrawer from './components/MobileDrawer';
import {
  WaveformType,
  FilterType,
  ParticleConfig,
  Keyframe,
  AudioMetadata,
} from './types';
import { defaultParticleConfig, templates } from './utils';

const App: React.FC = () => {
  const [audioMetadata, setAudioMetadata] = useState<AudioMetadata | null>(null);
  const [waveformType, setWaveformType] = useState<WaveformType>('bar');
  const [filterType, setFilterType] = useState<FilterType>('none');
  const [particleConfig, setParticleConfig] = useState<ParticleConfig>(defaultParticleConfig);
  const [keyframes, setKeyframes] = useState<Keyframe[]>([]);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [mobileDrawerTab, setMobileDrawerTab] = useState<'waveform' | 'particles'>('waveform');
  const [isMobile, setIsMobile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const waveform = params.get('waveform') as WaveformType;
    if (waveform && ['bar', 'curve', 'circular'].includes(waveform)) {
      setWaveformType(waveform);
    }

    const filter = params.get('filter') as FilterType;
    if (filter && ['none', 'neon', 'vintage', 'watercolor', 'liquid', 'pixel'].includes(filter)) {
      setFilterType(filter);
    }

    const particlesStr = params.get('particles');
    if (particlesStr) {
      try {
        const particles = JSON.parse(particlesStr);
        if (particles.count && particles.size && particles.speed) {
          setParticleConfig(particles);
        }
      } catch (e) {
        console.error('Failed to parse particles params');
      }
    }

    const keyframesStr = params.get('keyframes');
    if (keyframesStr) {
      try {
        const kfs = JSON.parse(keyframesStr);
        if (Array.isArray(kfs)) {
          setKeyframes(kfs);
        }
      } catch (e) {
        console.error('Failed to parse keyframes params');
      }
    }

    const templateId = params.get('template');
    if (templateId) {
      const template = templates.find(t => t.id === templateId);
      if (template) {
        setWaveformType(template.waveformType);
        setFilterType(template.filterType);
        setParticleConfig(template.particleConfig);
      }
    }
  }, []);

  const handleUploadComplete = useCallback((metadata: AudioMetadata) => {
    setAudioMetadata(metadata);
  }, []);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    // 文件选择由 AudioUploader 组件处理
  };

  const handleReset = () => {
    setAudioMetadata(null);
    setWaveformType('bar');
    setFilterType('none');
    setParticleConfig(defaultParticleConfig);
    setKeyframes([]);
  };

  const handleExport = () => {
    // 导出功能在 Visualizer 组件内部实现
  };

  const openMobileDrawer = (tab: 'waveform' | 'particles') => {
    setMobileDrawerTab(tab);
    setMobileDrawerOpen(true);
  };

  return (
    <div className="app">
      <NavBar
        onUploadClick={handleUploadClick}
        onExportClick={handleExport}
        onResetClick={handleReset}
        hasAudio={!!audioMetadata}
      />

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="audio/mpeg,audio/mp3,.mp3"
        style={{ display: 'none' }}
      />

      <div className="main-content">
        {!audioMetadata ? (
          <div className="upload-section">
            <div className="upload-wrapper">
              <AudioUploader onUploadComplete={handleUploadComplete} />
            </div>
          </div>
        ) : (
          <div className="visualizer-layout">
            <LeftPanel
              isOpen={leftPanelOpen}
              onToggle={() => setLeftPanelOpen(!leftPanelOpen)}
              waveformType={waveformType}
              filterType={filterType}
              onWaveformTypeChange={setWaveformType}
              onFilterTypeChange={setFilterType}
            />

            <div className="visualizer-main">
              {isMobile && (
                <div className="mobile-toolbar">
                  <button
                    className="mobile-tool-btn"
                    onClick={() => openMobileDrawer('waveform')}
                  >
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                    </svg>
                    <span>波形</span>
                  </button>
                  <button
                    className="mobile-tool-btn"
                    onClick={() => openMobileDrawer('particles')}
                  >
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="3" />
                      <circle cx="19" cy="7" r="2" />
                      <circle cx="5" cy="17" r="2" />
                      <circle cx="19" cy="17" r="1" />
                    </svg>
                    <span>粒子</span>
                  </button>
                </div>
              )}

              <Visualizer
                audioMetadata={audioMetadata}
                waveformType={waveformType}
                filterType={filterType}
                particleConfig={particleConfig}
                keyframes={keyframes}
                onWaveformTypeChange={setWaveformType}
                onFilterTypeChange={setFilterType}
                onParticleConfigChange={setParticleConfig}
                onKeyframesChange={setKeyframes}
                leftPanelOpen={leftPanelOpen}
                rightPanelOpen={rightPanelOpen}
              />
            </div>

            <RightPanel
              isOpen={rightPanelOpen}
              onToggle={() => setRightPanelOpen(!rightPanelOpen)}
              particleConfig={particleConfig}
              onParticleConfigChange={setParticleConfig}
            />
          </div>
        )}
      </div>

      <MobileDrawer
        isOpen={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        activeTab={mobileDrawerTab}
        waveformType={waveformType}
        filterType={filterType}
        particleConfig={particleConfig}
        onWaveformTypeChange={setWaveformType}
        onFilterTypeChange={setFilterType}
        onParticleConfigChange={setParticleConfig}
      />

      <style>{`
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        html, body, #root {
          height: 100%;
          width: 100%;
          overflow: hidden;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
            'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
            sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          background: #0a0a0f;
          color: #fff;
        }

        .app {
          display: flex;
          flex-direction: column;
          height: 100vh;
          width: 100vw;
          background: #0a0a0f;
        }

        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding-top: 56px;
          overflow: hidden;
        }

        .upload-section {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
        }

        .upload-wrapper {
          width: 100%;
          max-width: 600px;
        }

        .visualizer-layout {
          display: flex;
          flex: 1;
          min-height: 0;
        }

        .visualizer-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
          position: relative;
        }

        .mobile-toolbar {
          display: none;
        }

        @media (max-width: 768px) {
          .main-content {
            padding-top: 56px;
          }

          .visualizer-main {
            width: 100%;
          }

          .mobile-toolbar {
            display: flex;
            gap: 12px;
            padding: 10px 16px;
            background: rgba(26, 26, 46, 0.9);
            border-bottom: 1px solid #333;
          }

          .mobile-tool-btn {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            padding: 10px;
            background: #2a2a4e;
            border: 1px solid #333;
            border-radius: 8px;
            color: #aaa;
            cursor: pointer;
            font-size: 13px;
            transition: all 0.2s ease;
          }

          .mobile-tool-btn:active {
            transform: scale(0.98);
          }

          .mobile-tool-btn svg {
            color: #00ffaa;
          }
        }
      `}</style>
    </div>
  );
};

export default App;
