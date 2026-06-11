import { useState, useEffect, useCallback } from 'react';
import type { LightSource, Preset } from './types';
import { v4 as uuidv4 } from 'uuid';
import { useLightMix } from './hooks/useLightMix';
import { SpectrumSource } from './components/SpectrumSource';
import { MixingCanvas } from './components/MixingCanvas';
import { PresetManager } from './components/PresetManager';

const STORAGE_KEY = 'spectrum-lab-presets';

const createInitialSources = (): LightSource[] => [
  { id: uuidv4(), wavelength: 450, intensity: 80, enabled: true },
  { id: uuidv4(), wavelength: 530, intensity: 70, enabled: true },
  { id: uuidv4(), wavelength: 650, intensity: 75, enabled: true },
  { id: uuidv4(), wavelength: 400, intensity: 50, enabled: false },
  { id: uuidv4(), wavelength: 580, intensity: 60, enabled: false },
  { id: uuidv4(), wavelength: 700, intensity: 50, enabled: false },
];

export default function App() {
  const [sources, setSources] = useState<LightSource[]>(createInitialSources);
  const [presets, setPresets] = useState<Preset[]>([]);

  const mixedColor = useLightMix(sources);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setPresets(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load presets:', e);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
    } catch (e) {
      console.error('Failed to save presets:', e);
    }
  }, [presets]);

  const handleSourceChange = useCallback((id: string, updates: Partial<LightSource>) => {
    setSources((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  }, []);

  const handleLoadPreset = useCallback((presetSources: LightSource[]) => {
    setSources(presetSources);
  }, []);

  const handleSavePreset = useCallback((preset: Preset) => {
    setPresets((prev) => [...prev, preset]);
  }, []);

  const handleDeletePreset = useCallback((presetId: string) => {
    setPresets((prev) => prev.filter((p) => p.id !== presetId));
  }, []);

  return (
    <div className="lab-container">
      <header className="lab-header">
        <div className="header-title">
          <span className="header-icon">🔬</span>
          <h1>虚拟光谱实验室</h1>
          <span className="header-subtitle">Spectrum Lab</span>
        </div>
        <div className="header-tagline">
          调节单色光波长与强度，探索加色混合的奥秘
        </div>
      </header>

      <main className="lab-main">
        <MixingCanvas sources={sources} mixedColor={mixedColor} />

        <section className="control-panel">
          <div className="panel-header">
            <h2>
              <span className="panel-icon">💡</span>
              光谱光源控制
            </h2>
            <div className="panel-hint">
              <span className="hint-dot" /> 点击色圆开关光源
            </div>
          </div>

          <div className="sources-grid">
            {sources.map((source, index) => (
              <SpectrumSource
                key={source.id}
                source={source}
                index={index}
                onChange={handleSourceChange}
              />
            ))}
          </div>
        </section>

        <PresetManager
          presets={presets}
          currentSources={sources}
          mixedColor={mixedColor}
          onLoad={handleLoadPreset}
          onSave={handleSavePreset}
          onDelete={handleDeletePreset}
        />
      </main>

      <footer className="lab-footer">
        <div className="footer-spectral-bar" />
        <p>
          加色混合原理：光的三原色（红R、绿G、蓝B）以不同强度叠加产生各种色光，
          等量叠加形成白光
        </p>
      </footer>
    </div>
  );
}
