import React, { useState } from 'react';
import { ColorSwatch } from '../utils/constants';

interface PalettePanelProps {
  palette: ColorSwatch[];
  panelBg: string;
  panelText: string;
}

const GROUP_LABELS: Record<string, string> = {
  neutral: '中性色',
  vibrant: '鲜艳色',
  dark: '深色',
};

export const PalettePanel: React.FC<PalettePanelProps> = ({ palette, panelBg, panelText }) => {
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const groupedPalette = palette.reduce<Record<string, ColorSwatch[]>>((acc, swatch) => {
    if (!acc[swatch.group]) {
      acc[swatch.group] = [];
    }
    acc[swatch.group].push(swatch);
    return acc;
  }, {});

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, swatch: ColorSwatch) => {
    e.dataTransfer.setData('text/plain', swatch.color);
    e.dataTransfer.effectAllowed = 'copy';
    setDraggingId(swatch.id);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
  };

  return (
    <div
      className="palette-panel"
      style={{
        backgroundColor: panelBg,
        color: panelText,
        padding: '20px',
        height: '100%',
        overflowY: 'auto',
        boxSizing: 'border-box',
        backgroundImage: `
          linear-gradient(${panelText}08 1px, transparent 1px),
          linear-gradient(90deg, ${panelText}08 1px, transparent 1px)
        `,
        backgroundSize: '20px 20px',
      }}
    >
      <h2 style={{ marginTop: 0, marginBottom: '20px', fontSize: '18px', fontWeight: 600 }}>
        预设色板
      </h2>
      
      {Object.entries(groupedPalette).map(([group, swatches]) => (
        <div key={group} style={{ marginBottom: '24px' }}>
          <h3 style={{ 
            fontSize: '14px', 
            fontWeight: 500, 
            marginBottom: '12px',
            opacity: 0.8 
          }}>
            {GROUP_LABELS[group] || group}
          </h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(4, 1fr)', 
            gap: '10px' 
          }}>
            {swatches.map(swatch => (
              <div
                key={swatch.id}
                draggable
                onDragStart={(e) => handleDragStart(e, swatch)}
                onDragEnd={handleDragEnd}
                title={swatch.name}
                style={{
                  width: '100%',
                  aspectRatio: '1',
                  backgroundColor: swatch.color,
                  borderRadius: '4px',
                  border: `1px solid ${panelText}20`,
                  cursor: 'grab',
                  opacity: draggingId === swatch.id ? 0.4 : 1,
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  position: 'relative',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}
                onMouseEnter={(e) => {
                  if (draggingId !== swatch.id) {
                    e.currentTarget.style.transform = 'scale(1.08)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                }}
              >
                {draggingId === swatch.id && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: '4px',
                      border: '2px dashed #aaa',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      color: '#999',
                      backgroundColor: 'rgba(255,255,255,0.5)',
                    }}
                  >
                    拖放此处
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      
      <p style={{ fontSize: '12px', opacity: 0.5, marginTop: '16px' }}>
        提示：拖动色块到左侧组件上应用颜色
      </p>
    </div>
  );
};
