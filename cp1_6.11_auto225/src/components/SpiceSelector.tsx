import type { Spice } from '../types';

interface SpiceSelectorProps {
  spices: Spice[];
  selectedSpice: Spice | null;
  onSelect: (spice: Spice) => void;
}

const spiceIcons: Record<string, string> = {
  cinnamon: '🌿',
  clove: '🌸',
  nutmeg: '🥜',
  cardamom: '🫛',
  saffron: '✨'
};

function SpiceSelector({ spices, selectedSpice, onSelect }: SpiceSelectorProps) {
  if (spices.length === 0) {
    return <div className="empty-hint">加载中...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
      {spices.map(spice => (
        <div
          key={spice.id}
          className={`spice-card ${selectedSpice?.id === spice.id ? 'selected' : ''}`}
          onClick={() => onSelect(spice)}
        >
          <div 
            className="spice-icon"
            style={{ 
              background: `radial-gradient(circle, ${spice.color}40, ${spice.color}10)`,
              borderColor: `${spice.color}60`
            }}
          >
            {spiceIcons[spice.id] || '🌿'}
          </div>
          <div className="spice-name" style={{ color: spice.color }}>
            {spice.name}
          </div>
          <div className="spice-name-en">{spice.nameEn}</div>
          <div className="spice-description">{spice.description}</div>
        </div>
      ))}
    </div>
  );
}

export default SpiceSelector;
