import { useMemo } from 'react';
import type { LightSource } from '../types';
import { wavelengthToRgb, createWavelengthGradient } from '../utils/wavelengthToRgb';

interface SpectrumSourceProps {
  source: LightSource;
  index: number;
  onChange: (id: string, updates: Partial<LightSource>) => void;
}

export function SpectrumSource({ source, index, onChange }: SpectrumSourceProps) {
  const pureColor = useMemo(() => wavelengthToRgb(source.wavelength), [source.wavelength]);
  const wavelengthGradient = useMemo(() => createWavelengthGradient(), []);

  const previewOpacity = source.enabled ? Math.max(0.15, source.intensity / 100) : 0.08;
  const previewScale = source.enabled ? 1 : 0.8;

  const handleWavelengthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(source.id, { wavelength: Number(e.target.value) });
  };

  const handleIntensityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(source.id, { intensity: Number(e.target.value) });
  };

  const handleToggle = () => {
    onChange(source.id, { enabled: !source.enabled });
  };

  const previewColor = `rgb(${pureColor.r}, ${pureColor.g}, ${pureColor.b})`;

  return (
    <div className="spectrum-source" style={{ opacity: source.enabled ? 1 : 0.55 }}>
      <button
        className="preview-circle"
        onClick={handleToggle}
        style={{
          backgroundColor: previewColor,
          opacity: previewOpacity,
          transform: `scale(${previewScale})`,
          boxShadow: source.enabled
            ? `0 0 20px ${previewColor}, 0 0 40px ${previewColor}40`
            : 'none',
        }}
        title={source.enabled ? '点击关闭光源' : '点击开启光源'}
      />

      <div className="source-controls">
        <div className="source-header">
          <span className="source-label">光源 {index + 1}</span>
          <span className="source-status" style={{ color: source.enabled ? previewColor : '#666' }}>
            {source.enabled ? '● ON' : '○ OFF'}
          </span>
        </div>

        <div className="slider-row">
          <div className="slider-wrapper">
            <div className="slider-label">
              <span>波长</span>
              <span className="slider-value" style={{ color: previewColor }}>
                {source.wavelength}nm
              </span>
            </div>
            <input
              type="range"
              className="wavelength-slider"
              min={380}
              max={780}
              step={10}
              value={source.wavelength}
              onChange={handleWavelengthChange}
              style={{ background: wavelengthGradient }}
              disabled={!source.enabled}
            />
          </div>
        </div>

        <div className="slider-row">
          <div className="slider-wrapper">
            <div className="slider-label">
              <span>强度</span>
              <span className="slider-value">{source.intensity}%</span>
            </div>
            <input
              type="range"
              className="intensity-slider"
              min={0}
              max={100}
              step={1}
              value={source.intensity}
              onChange={handleIntensityChange}
              disabled={!source.enabled}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
