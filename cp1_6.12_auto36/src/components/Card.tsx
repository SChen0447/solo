import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CardData } from '../types';
import { useParticles } from '../hooks/useParticles';

interface CardProps {
  card: CardData;
  isActive: boolean;
  onMouseDown: (e: React.MouseEvent, id: string) => void;
  onUpdate: (id: string, updates: Partial<CardData>) => void;
  onDelete: (id: string) => void;
  onVote: (id: string) => void;
  onBringToFront: (id: string) => void;
  onDragStart?: (id: string) => void;
  onDragEnd?: (id: string) => void;
  style?: React.CSSProperties;
}

export default function Card({
  card,
  isActive,
  onMouseDown,
  onUpdate,
  onDelete,
  onVote,
  onBringToFront,
  style,
}: CardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const rocketRef = useRef<HTMLButtonElement>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [voteAnimating, setVoteAnimating] = useState(false);
  const { particles, emitParticles } = useParticles();

  useEffect(() => {
    if (card.isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [card.isEditing]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdate(card.id, { content: e.target.value });
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdate(card.id, { isEditing: !card.isEditing });
    setShowMenu(false);
  };

  const handlePinClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdate(card.id, { isPinned: !card.isPinned });
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(card.id);
  };

  const handleVoteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onVote(card.id);
    setVoteAnimating(true);
    setTimeout(() => setVoteAnimating(false), 200);

    if (rocketRef.current && !card.votedByUser) {
      const rect = rocketRef.current.getBoundingClientRect();
      emitParticles(rect.width / 2, rect.height / 2, 10);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('textarea')) {
      return;
    }
    onBringToFront(card.id);
    onMouseDown(e, card.id);
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('cardId', card.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <motion.div
      ref={cardRef}
      layout
      initial={{ scale: 0, opacity: 0 }}
      animate={{
        scale: 1,
        opacity: isActive ? 1 : 0.35,
        x: card.x,
        y: card.y,
      }}
      exit={{ scale: 0, opacity: 0, transition: { duration: 0.3 } }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 30,
      }}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setShowMenu(true)}
      onMouseLeave={() => setShowMenu(false)}
      draggable
      onDragStart={handleDragStart}
      style={{
        position: 'absolute',
        width: card.width,
        minHeight: card.height,
        backgroundColor: card.color,
        borderRadius: 12,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        padding: '16px 14px 12px',
        cursor: card.isEditing ? 'text' : 'grab',
        zIndex: card.zIndex,
        userSelect: 'none',
        pointerEvents: isActive ? 'auto' : 'none',
        ...style,
      }}
      whileHover={{
        y: -2,
        boxShadow: '0 6px 16px rgba(0,0,0,0.15)',
        transition: { duration: 0.2, ease: 'easeOut' },
      }}
      whileTap={{ cursor: 'grabbing' }}
    >
      <div
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          display: 'flex',
          gap: 4,
          opacity: showMenu ? 1 : 0,
          transition: 'opacity 0.2s ease',
        }}
      >
        <button
          onClick={handleEditClick}
          title="编辑"
          style={{
            width: 26,
            height: 26,
            borderRadius: 6,
            border: 'none',
            background: card.isEditing ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.8)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            color: '#4B5563',
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={(e) => {
            if (!card.isEditing) e.currentTarget.style.background = 'rgba(255,255,255,1)';
          }}
          onMouseLeave={(e) => {
            if (!card.isEditing) e.currentTarget.style.background = 'rgba(255,255,255,0.8)';
          }}
        >
          ✏️
        </button>
        <button
          onClick={handlePinClick}
          title={card.isPinned ? '取消吸附' : '吸附网格'}
          style={{
            width: 26,
            height: 26,
            borderRadius: 6,
            border: 'none',
            background: card.isPinned ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255,255,255,0.8)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            color: '#4B5563',
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={(e) => {
            if (!card.isPinned) e.currentTarget.style.background = 'rgba(255,255,255,1)';
          }}
          onMouseLeave={(e) => {
            if (!card.isPinned) e.currentTarget.style.background = 'rgba(255,255,255,0.8)';
          }}
        >
          📌
        </button>
        <button
          onClick={handleDeleteClick}
          title="删除"
          style={{
            width: 26,
            height: 26,
            borderRadius: 6,
            border: 'none',
            background: 'rgba(255,255,255,0.8)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            color: '#EF4444',
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.8)';
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ paddingTop: 4, paddingBottom: 8 }}>
        <textarea
          ref={textareaRef}
          value={card.content}
          onChange={handleContentChange}
          readOnly={!card.isEditing}
          rows={3}
          placeholder="在此输入灵感..."
          style={{
            width: '100%',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            resize: 'none',
            fontFamily: 'inherit',
            fontSize: 14,
            lineHeight: 1.5,
            color: '#374151',
            cursor: card.isEditing ? 'text' : 'default',
            overflow: card.isEditing ? 'auto' : 'hidden',
          }}
          onBlur={() => {
            if (card.isEditing) {
              onUpdate(card.id, { isEditing: false });
            }
          }}
          onMouseDown={(e) => e.stopPropagation()}
        />
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 6,
          marginTop: 'auto',
          position: 'relative',
        }}
      >
        <button
          ref={rocketRef}
          onClick={handleVoteClick}
          style={{
            position: 'relative',
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: 'none',
            background: card.votedByUser
              ? 'linear-gradient(135deg, #60A5FA, #34D399)'
              : 'rgba(255,255,255,0.6)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            transition: 'all 0.2s ease',
            overflow: 'hidden',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          🚀
          <AnimatePresence>
            {particles.map((p) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 1, scale: 1 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 0.8 }}
                style={{
                  position: 'absolute',
                  left: p.x,
                  top: p.y,
                  width: p.size,
                  height: p.size,
                  borderRadius: '50%',
                  backgroundColor: p.color,
                  pointerEvents: 'none',
                }}
              />
            ))}
          </AnimatePresence>
        </button>
        <motion.span
          key={card.votes}
          initial={{ scale: voteAnimating ? 1.3 : 1, y: voteAnimating ? -3 : 0 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: card.votedByUser ? '#3B82F6' : '#6B7280',
            minWidth: 20,
            textAlign: 'center',
          }}
        >
          {card.votes}
        </motion.span>
      </div>
    </motion.div>
  );
}
