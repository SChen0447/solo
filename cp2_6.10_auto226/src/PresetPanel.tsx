import React, { useState } from 'react';
import { Preset } from './SynthEngine';
import { v4 as uuidv4 } from 'uuid';
import cloneDeep from 'lodash/cloneDeep';

interface PresetPanelProps {
  presets: Preset[];
  activePresetId: string | null;
  onLoadPreset: (preset: Preset) => void;
  onSavePreset: (preset: Preset) => void;
  getCurrentParams: () => Preset['params'];
}

const PresetPanel: React.FC<PresetPanelProps> = ({
  presets,
  activePresetId,
  onLoadPreset,
  onSavePreset,
  getCurrentParams,
}) => {
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => setSaving(false), 300);
    const params = cloneDeep(getCurrentParams());
    const newPreset: Preset = {
      id: uuidv4(),
      name: `Preset ${presets.length + 1}`,
      params,
    };
    onSavePreset(newPreset);
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        flexWrap: 'nowrap',
        overflowX: 'auto',
        paddingBottom: 8,
      }}
    >
      {presets.map((preset) => (
        <div
          key={preset.id}
          onClick={() => onLoadPreset(preset)}
          title={preset.name}
          style={{
            flex: '0 0 auto',
            width: 140,
            height: 60,
            backgroundColor: '#2a2a3e',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#c4c4d4',
            fontSize: 13,
            cursor: 'pointer',
            userSelect: 'none',
            border: activePresetId === preset.id ? '2px solid #7c5cbf' : '2px solid transparent',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
            boxShadow: 'none',
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget;
            el.style.transform = 'scale(1.05)';
            el.style.boxShadow = '0 0 16px rgba(124, 92, 191, 0.5)';
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget;
            el.style.transform = 'scale(1)';
            el.style.boxShadow = 'none';
          }}
        >
          {preset.name}
        </div>
      ))}
      <button
        onClick={handleSave}
        style={{
          flex: '0 0 auto',
          height: 60,
          padding: '0 20px',
          backgroundColor: '#7c5cbf',
          color: '#ffffff',
          border: 'none',
          borderRadius: 6,
          fontSize: 13,
          fontFamily: 'Consolas, monospace',
          cursor: 'pointer',
          transform: saving ? 'scale(0.95)' : 'scale(1)',
          transition: 'transform 0.2s ease, background-color 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#9070d4';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#7c5cbf';
        }}
      >
        保存当前预设
      </button>
    </div>
  );
};

export default PresetPanel;
