import { useMemo } from 'react';
import type { LightSource, MixedColorResult } from '../types';
import { wavelengthToRgb } from '../utils/wavelengthToRgb';

interface MixingCanvasProps {
  sources: LightSource[];
  mixedColor: MixedColorResult;
}

export function MixingCanvas({ sources, mixedColor }: MixingCanvasProps) {
  const beams = useMemo(() => {
    return sources
      .filter((s) => s.enabled && s.intensity > 0)
      .map((source, idx, arr) => {
        const rgb = wavelengthToRgb(source.wavelength);
        const opacity = (source.intensity / 100) * 0.7;
        const baseColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
        const glowColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity * 0.4})`;

        const total = arr.length;
        const spread = Math.min(total - 1, 5);
        const offset = spread === 0 ? 0 : (idx - spread / 2) * 60;

        return {
          id: source.id,
          baseColor,
          glowColor,
          offset,
          color: `rgb(${rgb.r},${rgb.g},${rgb.b})`,
          intensity: source.intensity,
        };
      });
  }, [sources]);

  const mixedBgColor = `rgba(${mixedColor.r}, ${mixedColor.g}, ${mixedColor.b}, 1)`;
  const mixedGlow = `0 0 60px rgba(${mixedColor.r}, ${mixedColor.g}, ${mixedColor.b}, 0.5), 0 0 120px rgba(${mixedColor.r}, ${mixedColor.g}, ${mixedColor.b}, 0.25)`;

  return (
    <div className="mixing-canvas-wrapper">
      <div className="mixing-canvas">
        <div className="beams-container">
          {beams.map((beam) => (
            <div
              key={beam.id}
              className="light-beam"
              style={{
                left: `calc(50% + ${beam.offset}px)`,
                background: `linear-gradient(to bottom, ${beam.baseColor} 0%, ${beam.glowColor} 60%, transparent 100%)`,
                filter: `blur(8px) drop-shadow(0 0 20px ${beam.color})`,
              }}
            />
          ))}
        </div>

        <div
          className="mixed-center"
          style={{
            backgroundColor: mixedBgColor,
            boxShadow:
              mixedColor.r + mixedColor.g + mixedColor.b > 20
                ? mixedGlow
                : 'inset 0 0 30px rgba(0,0,0,0.8)',
          }}
        >
          <div className="mixed-inner-ring" />
        </div>

        <div className="canvas-frame-corner top-left" />
        <div className="canvas-frame-corner top-right" />
        <div className="canvas-frame-corner bottom-left" />
        <div className="canvas-frame-corner bottom-right" />
      </div>

      <div className="color-info-panel">
        <div className="color-info-row">
          <span className="info-label">HEX</span>
          <span className="info-value mono-font" style={{ color: mixedColor.hex }}>
            {mixedColor.hex.toUpperCase()}
          </span>
        </div>
        <div className="color-info-row">
          <span className="info-label">RGB</span>
          <span className="info-value mono-font">
            <span style={{ color: '#ff6b6b' }}>R{mixedColor.r}</span>
            <span style={{ color: '#51cf66' }}> G{mixedColor.g}</span>
            <span style={{ color: '#339af0' }}> B{mixedColor.b}</span>
          </span>
        </div>
        <div className="color-info-row">
          <span className="info-label">HSL</span>
          <span className="info-value mono-font">
            <span style={{ color: mixedColor.hex }}>{mixedColor.hsl.h}°</span>
            <span> {mixedColor.hsl.s}%</span>
            <span> {mixedColor.hsl.l}%</span>
          </span>
        </div>
        <div className="color-info-row">
          <span className="info-label">色温</span>
          <span className="info-value mono-font" style={{ color: mixedColor.hex }}>
            {mixedColor.colorTemperature}
          </span>
        </div>
      </div>
    </div>
  );
}
