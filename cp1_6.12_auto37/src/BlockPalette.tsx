import React from 'react';
import { BLOCK_TEMPLATES, LEGO_COLORS, BlockTemplate } from './types';

interface BlockPaletteProps {
  selectedTemplate: BlockTemplate | null;
  selectedColor: string;
  onSelectTemplate: (template: BlockTemplate) => void;
  onSelectColor: (color: string) => void;
}

export const BlockPalette: React.FC<BlockPaletteProps> = ({
  selectedTemplate,
  selectedColor,
  onSelectTemplate,
  onSelectColor,
}) => {
  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <h3 style={styles.title}>积木块</h3>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>颜色</div>
        <div style={styles.colorGrid}>
          {LEGO_COLORS.map((color) => (
            <div
              key={color}
              style={{
                ...styles.colorSwatch,
                backgroundColor: color,
                border: selectedColor === color ? '2px solid #2979ff' : '2px solid transparent',
                boxShadow: selectedColor === color ? '0 0 0 2px rgba(41, 121, 255, 0.3)' : 'none',
              }}
              onClick={() => onSelectColor(color)}
            />
          ))}
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>尺寸</div>
        <div style={styles.templateGrid}>
          {BLOCK_TEMPLATES.map((template) => {
            const isSelected =
              selectedTemplate?.size.x === template.size.x &&
              selectedTemplate?.size.z === template.size.z;
            return (
              <div
                key={template.label}
                style={{
                  ...styles.card,
                  transform: isSelected ? 'translateY(-3px)' : 'none',
                  boxShadow: isSelected
                    ? '0 4px 12px rgba(41, 121, 255, 0.3)'
                    : '0 2px 6px rgba(0, 0, 0, 0.1)',
                  border: isSelected ? '2px solid #2979ff' : '2px solid transparent',
                }}
                onClick={() => onSelectTemplate(template)}
              >
                <div style={styles.brickPreview}>
                  <div
                    style={{
                      ...styles.brick3d,
                      width: `${template.size.x * 12}px`,
                      height: `${template.size.z * 12}px`,
                      backgroundColor: selectedColor,
                      boxShadow: `
                        inset 2px 2px 4px rgba(255,255,255,0.3),
                        inset -2px -2px 4px rgba(0,0,0,0.2),
                        0 4px 8px rgba(0,0,0,0.15)
                      `,
                    }}
                  >
                    {Array.from({ length: template.size.x }).map((_, i) =>
                      Array.from({ length: template.size.z }).map((_, j) => (
                        <div
                          key={`${i}-${j}`}
                          style={{
                            ...styles.stud,
                            left: `${4 + i * 12}px`,
                            top: `${2 + j * 12}px`,
                          }}
                        />
                      ))
                    )}
                  </div>
                </div>
                <div style={styles.cardLabel}>{template.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={styles.hint}>
        <p style={styles.hintText}>点击积木选择，再点击场景放置</p>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  panel: {
    width: 240,
    height: '100%',
    backgroundColor: '#ffffff',
    borderRight: '1px solid #d0d0d0',
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
  },
  header: {
    padding: '16px 20px',
    borderBottom: '1px solid #e8e8e8',
  },
  title: {
    fontSize: 16,
    fontWeight: 600,
    color: '#333',
    margin: 0,
  },
  section: {
    padding: '16px 20px',
    borderBottom: '1px solid #f0f0f0',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 500,
    color: '#666',
    marginBottom: 12,
  },
  colorGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
    gap: 8,
  },
  colorSwatch: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  templateGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 10,
  },
  card: {
    backgroundColor: '#fafafa',
    borderRadius: 8,
    padding: '12px 8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    border: '2px solid transparent',
  },
  brickPreview: {
    width: 60,
    height: 50,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  brick3d: {
    position: 'relative',
    borderRadius: 2,
    transition: 'all 0.2s ease',
  },
  stud: {
    position: 'absolute',
    width: 6,
    height: 3,
    borderRadius: '50%',
    backgroundColor: 'rgba(255,255,255,0.4)',
    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
  },
  cardLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: 500,
  },
  hint: {
    padding: '16px 20px',
    marginTop: 'auto',
  },
  hintText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 1.5,
  },
};
