import React from 'react';
import type { CardTemplate } from '../types/card';
import { templates } from '../data/templates';

interface TemplateLibraryProps {
  selectedTemplateId: string | null;
  onSelectTemplate: (template: CardTemplate) => void;
}

export const TemplateLibrary: React.FC<TemplateLibraryProps> = ({
  selectedTemplateId,
  onSelectTemplate,
}) => {
  const categories = [
    { key: 'birthday', label: '🎂 生日', icon: '🎂' },
    { key: 'holiday', label: '🎄 节日', icon: '🎄' },
    { key: 'thanks', label: '💝 感谢', icon: '💝' },
  ];

  const renderTemplatePreview = (template: CardTemplate) => {
    const bgStyle = template.backgroundGradient
      ? {
          background: `linear-gradient(${template.backgroundGradient.direction}, ${template.backgroundGradient.start}, ${template.backgroundGradient.end})`,
        }
      : { backgroundColor: template.backgroundColor };

    return (
      <div style={{ ...styles.templateThumb, ...bgStyle }}>
        {template.decorations.slice(0, 3).map((dec, i) => (
          <div
            key={dec.id}
            style={{
              position: 'absolute',
              left: `${dec.x * 0.8}%`,
              top: `${dec.y * 0.6}%`,
              transform: `translate(-50%, -50%) scale(${dec.scale * 0.5}) rotate(${dec.rotation}deg)`,
              fontSize: '16px',
              opacity: 0.9,
            }}
          >
            {dec.type === 'balloon' && '🎈'}
            {dec.type === 'star' && '⭐'}
            {dec.type === 'heart' && '❤️'}
            {dec.type === 'flower' && '🌸'}
            {dec.type === 'ribbon' && '🎀'}
          </div>
        ))}
        <div style={styles.templateTitleOverlay}>
          <span style={styles.templateName}>{template.name}</span>
        </div>
      </div>
    );
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.header}>📚 模板库</h3>

      {categories.map((category) => (
        <div key={category.key} style={styles.categorySection}>
          <h4 style={styles.categoryTitle}>{category.label}</h4>
          <div style={styles.templateGrid}>
            {templates
              .filter((t) => t.category === category.key)
              .map((template) => (
                <div
                  key={template.id}
                  onClick={() => onSelectTemplate(template)}
                  style={{
                    ...styles.templateCard,
                    ...(selectedTemplateId === template.id
                      ? styles.templateCardSelected
                      : {}),
                  }}
                >
                  {renderTemplatePreview(template)}
                  <p style={styles.templateLabel}>{template.name}</p>
                </div>
              ))}
          </div>
        </div>
      ))}

      <div style={styles.hint}>
        <p style={styles.hintText}>💡 选择一个模板开始设计你的专属贺卡</p>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    height: '100%',
    overflowY: 'auto',
    padding: '4px',
  },
  header: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 600,
    color: '#333',
    textAlign: 'center',
    padding: '8px 0',
  },
  categorySection: {
    marginBottom: '8px',
  },
  categoryTitle: {
    margin: '0 0 8px 0',
    fontSize: '14px',
    fontWeight: 500,
    color: '#666',
  },
  templateGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '12px',
  },
  templateCard: {
    cursor: 'pointer',
    borderRadius: '12px',
    overflow: 'hidden',
    transition: 'all 0.2s ease',
    border: '2px solid transparent',
    backgroundColor: 'white',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
  },
  templateCardSelected: {
    borderColor: '#FF6B9D',
    boxShadow: '0 4px 16px rgba(255, 107, 157, 0.3)',
  },
  templateThumb: {
    position: 'relative',
    width: '100%',
    aspectRatio: '3/4',
    borderRadius: '10px',
    overflow: 'hidden',
  },
  templateTitleOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: '12px 8px',
    background: 'linear-gradient(to top, rgba(0,0,0,0.5), transparent)',
  },
  templateName: {
    color: 'white',
    fontSize: '13px',
    fontWeight: 500,
    textShadow: '0 1px 2px rgba(0,0,0,0.3)',
  },
  templateLabel: {
    margin: '8px',
    fontSize: '12px',
    color: '#555',
    textAlign: 'center',
  },
  hint: {
    marginTop: 'auto',
    padding: '12px',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: '8px',
  },
  hintText: {
    margin: 0,
    fontSize: '12px',
    color: '#888',
    textAlign: 'center',
  },
};
