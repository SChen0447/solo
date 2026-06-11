import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import { theme, animations, inkColors } from './styles';

interface InkBlot {
  id: string;
  x: number;
  y: number;
  color: string;
}

interface LetterEditorProps {
  letterContent: string;
  currentInkColor: string;
  onContentChange: (content: string) => void;
  onInkColorChange: (color: string) => void;
  isEditorOpen: boolean;
  onToggleEditor: () => void;
}

const FeatherCursor: React.FC<{ x: number; y: number; visible: boolean }> = ({ x, y, visible }) => (
  <motion.div
    style={{
      position: 'fixed',
      left: x - 7,
      top: y - 15,
      pointerEvents: 'none',
      zIndex: 9999,
      opacity: visible ? 0.7 : 0,
      transition: 'opacity 0.2s'
    }}
    variants={animations.featherWobble}
    animate="hover"
    initial="rest"
  >
    <svg width="15px" height="30px" viewBox="0 0 15 30" fill="none">
      <path
        d="M7.5 0 C5 5 3 10 3 15 C3 20 5 25 7.5 28 C10 25 12 20 12 15 C12 10 10 5 7.5 0 Z"
        fill={theme.colors.inkBrown}
        opacity="0.8"
      />
      <path
        d="M7.5 2 L7.5 28"
        stroke={theme.colors.mapleDark}
        strokeWidth="0.8"
      />
      <path
        d="M7.5 5 Q4 8 3 12"
        stroke={theme.colors.mapleDark}
        strokeWidth="0.5"
        fill="none"
      />
      <path
        d="M7.5 5 Q11 8 12 12"
        stroke={theme.colors.mapleDark}
        strokeWidth="0.5"
        fill="none"
      />
      <path
        d="M7.5 10 Q4.5 13 4 17"
        stroke={theme.colors.mapleDark}
        strokeWidth="0.5"
        fill="none"
      />
      <path
        d="M7.5 10 Q10.5 13 11 17"
        stroke={theme.colors.mapleDark}
        strokeWidth="0.5"
        fill="none"
      />
    </svg>
  </motion.div>
);

const InkBottle: React.FC<{
  color: string;
  selected: boolean;
  onClick: () => void;
}> = ({ color, selected, onClick }) => (
  <motion.button
    whileHover={{ scale: 1.1 }}
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    style={{
      width: 48,
      height: 56,
      borderRadius: theme.radii.md,
      background: selected ? theme.colors.goldLight : theme.colors.paper,
      border: `2px solid ${selected ? theme.colors.gold : theme.colors.maple}`,
      boxShadow: theme.shadows.card,
      cursor: 'pointer',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 4,
      transition: 'all 0.3s'
    }}
  >
    <div
      style={{
        width: 20,
        height: 24,
        borderRadius: '4px 4px 6px 6px',
        background: color,
        position: 'relative'
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: -6,
          left: 3,
          width: 14,
          height: 8,
          borderRadius: '2px',
          background: theme.colors.walnutMedium
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 2,
          left: 2,
          width: 4,
          height: 6,
          borderRadius: 2,
          background: 'rgba(255,255,255,0.3)'
        }}
      />
    </div>
  </motion.button>
);

const LetterEditor: React.FC<LetterEditorProps> = ({
  letterContent,
  currentInkColor,
  onContentChange,
  onInkColorChange,
  isEditorOpen,
  onToggleEditor
}) => {
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [cursorVisible, setCursorVisible] = useState(false);
  const [inkBlots, setInkBlots] = useState<InkBlot[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const letterAreaRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setCursorPos({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseEnter = useCallback(() => {
    setCursorVisible(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setCursorVisible(false);
  }, []);

  const handleTextareaClick = useCallback((e: React.MouseEvent<HTMLTextAreaElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const newBlot: InkBlot = {
      id: uuidv4(),
      x,
      y,
      color: currentInkColor
    };
    setInkBlots(prev => [...prev, newBlot]);
    setTimeout(() => {
      setInkBlots(prev => prev.filter(b => b.id !== newBlot.id));
    }, 1200);
  }, [currentInkColor]);

  const letterPaperStyle: React.CSSProperties = {
    width: '100%',
    aspectRatio: '16 / 9',
    background: theme.colors.paper,
    borderRadius: theme.radii.md,
    boxShadow: `0 8px 32px ${theme.colors.shadow}, inset 0 0 60px ${theme.colors.paperDark}`,
    position: 'relative',
    overflow: 'hidden',
    cursor: 'none',
    transform: 'rotate(-0.5deg)'
  };

  return (
    <>
      <FeatherCursor x={cursorPos.x} y={cursorPos.y} visible={cursorVisible} />

      <div
        ref={letterAreaRef}
        style={letterPaperStyle}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={onToggleEditor}
      >
        <div
          style={{
            position: 'absolute',
            inset: 16,
            border: `0.5px dashed ${theme.colors.mapleDark}`,
            borderRadius: 4,
            pointerEvents: 'none'
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 24,
            display: 'flex',
            flexDirection: 'column',
            padding: '16px 20px'
          }}
        >
          <div
            style={{
              fontFamily: "'Ma Shan Zheng', cursive",
              fontSize: 18,
              color: currentInkColor,
              minHeight: '100%',
              whiteSpace: 'pre-wrap',
              lineHeight: 2,
              opacity: 0.85
            }}
          >
            {letterContent || (
              <span style={{ color: theme.colors.mapleDark, fontStyle: 'italic' }}>
                点击此处开始书写你的时光信件...
              </span>
            )}
          </div>
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 30,
            background: `linear-gradient(to top, ${theme.colors.paperDark}, transparent)`,
            pointerEvents: 'none'
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: -5,
            left: -5,
            right: -5,
            bottom: -5,
            background: `radial-gradient(ellipse at center, transparent 60%, ${theme.colors.walnutDark}22 100%)`,
            pointerEvents: 'none'
          }}
        />
      </div>

      <AnimatePresence>
        {isEditorOpen && (
          <motion.div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              perspective: 1200
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onToggleEditor}
          >
            <motion.div
              variants={animations.letterFlip}
              initial="closed"
              animate="open"
              exit="closed"
              onClick={(e) => e.stopPropagation()}
              style={{
                width: 'min(90vw, 900px)',
                maxHeight: '90vh',
                background: theme.colors.paper,
                borderRadius: theme.radii.lg,
                boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                transformStyle: 'preserve-3d'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  padding: '20px 24px',
                  gap: 24,
                  flex: 1,
                  overflow: 'hidden',
                  flexDirection: window.innerWidth <= theme.breakpoints.mobile ? 'column' : 'row'
                }}
              >
                <div
                  style={{
                    width: window.innerWidth <= theme.breakpoints.mobile ? '100%' : 180,
                    background: theme.colors.maple,
                    borderRadius: theme.radii.md,
                    padding: 20,
                    boxShadow: theme.shadows.inset,
                    flexShrink: 0
                  }}
                >
                  <h3
                    style={{
                      color: theme.colors.walnutDark,
                      fontSize: 16,
                      marginBottom: 16,
                      fontFamily: "'Noto Serif SC', serif"
                    }}
                  >
                    信纸样式
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {['素白信笺', '微黄旧纸', '带格信纸'].map((name) => (
                      <motion.div
                        key={name}
                        whileHover={{ scale: 1.02 }}
                        style={{
                          padding: '10px 12px',
                          background: theme.colors.paper,
                          borderRadius: theme.radii.sm,
                          color: theme.colors.walnutDark,
                          fontSize: 14,
                          boxShadow: theme.shadows.card,
                          cursor: 'pointer'
                        }}
                      >
                        {name}
                      </motion.div>
                    ))}
                  </div>
                  <h3
                    style={{
                      color: theme.colors.walnutDark,
                      fontSize: 16,
                      margin: '24px 0 16px',
                      fontFamily: "'Noto Serif SC', serif"
                    }}
                  >
                    墨水颜色
                  </h3>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {inkColors.map((ink) => (
                      <InkBottle
                        key={ink.id}
                        color={ink.color}
                        selected={currentInkColor === ink.color}
                        onClick={() => onInkColorChange(ink.color)}
                      />
                    ))}
                  </div>
                </div>

                <div style={{ flex: 1, position: 'relative', minHeight: 300 }}>
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      border: `0.5px dashed ${theme.colors.mapleDark}`,
                      borderRadius: theme.radii.sm,
                      pointerEvents: 'none'
                    }}
                  />
                  <textarea
                    ref={textareaRef}
                    value={letterContent}
                    onChange={(e) => onContentChange(e.target.value)}
                    onClick={handleTextareaClick}
                    placeholder="在此书写你的信件内容..."
                    style={{
                      width: '100%',
                      height: '100%',
                      padding: 24,
                      border: 'none',
                      outline: 'none',
                      background: 'transparent',
                      resize: 'none',
                      fontFamily: "'Ma Shan Zheng', cursive",
                      fontSize: 20,
                      lineHeight: 2,
                      color: currentInkColor,
                      position: 'relative',
                      zIndex: 1
                    }}
                  />
                  {inkBlots.map((blot) => (
                    <motion.div
                      key={blot.id}
                      variants={animations.inkSpread}
                      initial="initial"
                      animate="animate"
                      style={{
                        position: 'absolute',
                        left: blot.x,
                        top: blot.y,
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        background: `radial-gradient(circle, ${blot.color}99 0%, transparent 70%)`,
                        pointerEvents: 'none',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 2
                      }}
                    />
                  ))}
                </div>
              </div>

              <div
                style={{
                  padding: '16px 24px',
                  borderTop: `1px solid ${theme.colors.maple}`,
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 12,
                  background: theme.colors.paperDark
                }}
              >
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onToggleEditor}
                  style={{
                    padding: '10px 24px',
                    borderRadius: theme.radii.md,
                    border: 'none',
                    background: theme.colors.walnutMedium,
                    color: theme.colors.paper,
                    fontSize: 15,
                    fontFamily: "'Noto Serif SC', serif",
                    cursor: 'pointer',
                    boxShadow: theme.shadows.card
                  }}
                >
                  完成书写
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default LetterEditor;
