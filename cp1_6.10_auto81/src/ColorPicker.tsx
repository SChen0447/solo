import React from 'react';
import { HslaColorPicker } from 'react-colorful';
import { HSLColor, hslToHex, hslToString } from './utils';
import 'react-colorful/dist/index.css';

interface ColorPickerProps {
  color: HSLColor;
  onChange: (color: HSLColor) => void;
  onClose: () => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ color, onChange, onClose }) => {
  const handleChange = (c: { h: number; s: number; l: number; a?: number }) => {
    onChange({ h: Math.round(c.h), s: Math.round(c.s), l: Math.round(c.l) });
  };

  const hex = hslToHex(color.h, color.s, color.l);

  return (
    <div
      style={{
        position: 'fixed',
        zIndex: 1000,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#2a2a4a',
          padding: 20,
          borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
          <HslaColorPicker
            color={{ h: color.h, s: color.s, l: color.l, a: 1 }}
            onChange={handleChange}
            style={{ width: 220, height: 220 }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 6,
                backgroundColor: hslToString(color),
                border: '1.5px solid rgba(255,255,255,0.3)',
              }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: '#aaa', marginBottom: 2 }}>Hex</div>
              <div style={{ fontSize: 14, fontFamily: 'monospace', color: '#e0e0e0', textTransform: 'uppercase' }}>
                {hex}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: '#aaa', marginBottom: 2 }}>HSL</div>
              <div style={{ fontSize: 13, fontFamily: 'monospace', color: '#e0e0e0' }}>
                {color.h}° {color.s}% {color.l}%
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '100%',
              padding: '8px 16px',
              borderRadius: 6,
              border: 'none',
              backgroundColor: '#4a4a8a',
              color: '#e0e0e0',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
};

export default ColorPicker;
