import { motion } from 'framer-motion';
import type { AromaBase, NoteType } from '@/types';
import { getNoteLabel } from '@/utils/helpers';

interface BaseSelectorProps {
  bases: AromaBase[];
  selectedIds: string[];
  onSelect: (base: AromaBase) => void;
}

const noteOrder: Record<NoteType, number> = {
  top: 0,
  middle: 1,
  base: 2,
};

export default function BaseSelector({ bases, selectedIds, onSelect }: BaseSelectorProps) {
  const sortedBases = [...bases].sort(
    (a, b) => noteOrder[a.note] - noteOrder[b.note]
  );

  const topBases = sortedBases.filter((b) => b.note === 'top');
  const middleBases = sortedBases.filter((b) => b.note === 'middle');
  const baseBases = sortedBases.filter((b) => b.note === 'base');

  const renderBaseCard = (base: AromaBase) => {
    const isSelected = selectedIds.includes(base.id);

    return (
      <motion.div
        key={base.id}
        className={`base-card ${isSelected ? 'selected' : ''}`}
        style={
          {
            '--card-color': base.color,
            '--card-color-glow': `${base.color}40`,
          } as React.CSSProperties
        }
        onClick={() => onSelect(base)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        layout
      >
        <div className="base-icon">{base.iconSvg}</div>
        <div className="base-name">{base.name}</div>
        <div className="base-name-en">{base.nameEn}</div>
        <div style={{ textAlign: 'center' }}>
          <span className="base-note-tag">{getNoteLabel(base.note)}</span>
        </div>
        <div className="base-description">{base.description}</div>
      </motion.div>
    );
  };

  return (
    <div className="base-selector">
      <h2 className="section-title">香精柜</h2>

      <div className="note-section">
        <h3 style={{ fontSize: '0.85rem', color: '#f5d742', marginBottom: '10px', letterSpacing: '2px', fontWeight: 400 }}>
          ✦ 前调 TOP NOTES
        </h3>
        <div className="base-grid" style={{ marginBottom: '20px' }}>
          {topBases.map(renderBaseCard)}
        </div>
      </div>

      <div className="note-section">
        <h3 style={{ fontSize: '0.85rem', color: '#f48fb1', marginBottom: '10px', letterSpacing: '2px', fontWeight: 400 }}>
          ✦ 中调 HEART NOTES
        </h3>
        <div className="base-grid" style={{ marginBottom: '20px' }}>
          {middleBases.map(renderBaseCard)}
        </div>
      </div>

      <div className="note-section">
        <h3 style={{ fontSize: '0.85rem', color: '#8d6e63', marginBottom: '10px', letterSpacing: '2px', fontWeight: 400 }}>
          ✦ 后调 BASE NOTES
        </h3>
        <div className="base-grid">{baseBases.map(renderBaseCard)}</div>
      </div>
    </div>
  );
}
