import React from 'react';
import { motion } from 'framer-motion';
import type { NoteInfo } from './types';
import { computePanelBgColor } from './LightController';

interface InfoPanelProps {
  currentNote: NoteInfo | null;
  currentVelocity: number;
  recentNotes: NoteInfo[];
}

export const InfoPanel: React.FC<InfoPanelProps> = ({
  currentNote,
  currentVelocity,
  recentNotes,
}) => {
  const bgColor = computePanelBgColor(recentNotes);

  return (
    <motion.div
      className="info-panel"
      animate={{ backgroundColor: bgColor }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      style={{
        width: 180,
        minHeight: 300,
        padding: '24px 16px',
        borderRadius: '20px',
        border: '1px solid rgba(183, 110, 121, 0.2)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        color: '#e0d6d8',
        fontFamily: "'Nunito', sans-serif",
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 14,
            fontWeight: 600,
            color: 'rgba(224, 214, 216, 0.6)',
            letterSpacing: 2,
            textTransform: 'uppercase',
            marginBottom: 8,
          }}
        >
          音高
        </div>
        <motion.div
          key={currentNote?.name ?? 'silent'}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 42,
            fontWeight: 700,
            color: currentNote ? '#f5d76e' : 'rgba(224, 214, 216, 0.3)',
            lineHeight: 1,
          }}
        >
          {currentNote?.name ?? '--'}
        </motion.div>
      </div>

      <div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'rgba(224, 214, 216, 0.6)',
            letterSpacing: 1,
            textTransform: 'uppercase',
            marginBottom: 8,
          }}
        >
          力度
        </div>
        <div
          style={{
            width: '100%',
            height: 8,
            borderRadius: 4,
            background: 'rgba(255, 255, 255, 0.08)',
            overflow: 'hidden',
          }}
        >
          <motion.div
            animate={{ width: `${currentVelocity}%` }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            style={{
              height: '100%',
              borderRadius: 4,
              background: `linear-gradient(90deg, #d4af37, #f5d76e)`,
            }}
          />
        </div>
        <div
          style={{
            fontSize: 11,
            color: 'rgba(224, 214, 216, 0.5)',
            marginTop: 4,
            textAlign: 'right',
          }}
        >
          {currentVelocity}/100
        </div>
      </div>

      <div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'rgba(224, 214, 216, 0.6)',
            letterSpacing: 1,
            textTransform: 'uppercase',
            marginBottom: 8,
          }}
        >
          频率
        </div>
        <div
          style={{
            fontFamily: "'Nunito', sans-serif",
            fontSize: 18,
            fontWeight: 300,
            color: currentNote ? '#e0d6d8' : 'rgba(224, 214, 216, 0.3)',
          }}
        >
          {currentNote ? `${currentNote.frequency.toFixed(1)} Hz` : '-- Hz'}
        </div>
      </div>

      <div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'rgba(224, 214, 216, 0.6)',
            letterSpacing: 1,
            textTransform: 'uppercase',
            marginBottom: 8,
          }}
        >
          最近音符
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {recentNotes.length === 0 && (
            <span style={{ fontSize: 12, color: 'rgba(224, 214, 216, 0.3)' }}>暂无</span>
          )}
          {recentNotes.map((note, i) => (
            <motion.span
              key={`${note.name}-${i}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                fontSize: 12,
                padding: '2px 8px',
                borderRadius: 8,
                background: 'rgba(212, 175, 55, 0.15)',
                color: '#f5d76e',
                fontFamily: "'Nunito', sans-serif",
              }}
            >
              {note.name}
            </motion.span>
          ))}
        </div>
      </div>
    </motion.div>
  );
};
