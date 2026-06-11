import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { LogEntry } from '../App';

interface ReadingViewProps {
  entries: LogEntry[];
  updateNote: (bookId: string, note: string) => void;
}

const ReadingView = ({ entries, updateNote }: ReadingViewProps) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const entry = entries.find(e => e.book.id === id);

  const [note, setNote] = useState(entry?.notes || '');
  const [isSaving, setIsSaving] = useState(false);
  const [savedNotes, setSavedNotes] = useState<Array<{ text: string; rotate: number; id: number }>>([]);
  const [showCursor, setShowCursor] = useState(true);

  const MAX_NOTE_LENGTH = 200;

  const randomStickyRotation = useMemo(() => {
    return Math.floor(Math.random() * 7) - 3;
  }, []);

  if (!entry) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          minHeight: 'calc(100vh - 60px)',
          background: '#f4e4c1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '20px',
          fontFamily: '"KaiTi", "STKaiti", "楷体", serif'
        }}
      >
        <div style={{ fontSize: '60px' }}>📜</div>
        <div style={{ fontSize: '22px', color: '#8b4513' }}>未找到该典籍</div>
        <button
          onClick={() => navigate('/log')}
          style={{
            padding: '10px 24px',
            background: 'linear-gradient(180deg, #cd853f, #8b4513)',
            border: '2px solid #654321',
            borderRadius: '6px',
            color: '#fff8dc',
            fontSize: '16px',
            fontFamily: '"KaiTi", serif',
            cursor: 'pointer'
          }}
        >
          返回藏书志
        </button>
      </motion.div>
    );
  }

  useMemo(() => {
    setNote(entry?.notes || '');
  }, [id]);

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= MAX_NOTE_LENGTH) {
      setNote(value);
    }
  };

  const handleSave = () => {
    if (!note.trim()) return;
    setIsSaving(true);
    setTimeout(() => {
      updateNote(entry.book.id, note.trim());
      setSavedNotes(prev => [
        ...prev,
        { text: note.trim(), rotate: Math.floor(Math.random() * 7) - 3, id: Date.now() }
      ]);
      setIsSaving(false);
    }, 400);
  };

  const paragraphs = entry.book.content.split('\n\n').filter(p => p.trim());

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        minHeight: 'calc(100vh - 60px)',
        background: 'linear-gradient(180deg, #f4e4c1 0%, #e8d4a8 100%)',
        padding: '30px 20px',
        fontFamily: '"KaiTi", "STKaiti", "楷体", serif',
        position: 'relative'
      }}
    >
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto'
      }}>
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '24px',
            paddingBottom: '16px',
            borderBottom: '2px solid rgba(139,69,19,0.2)'
          }}
        >
          <button
            onClick={() => navigate('/log')}
            style={{
              padding: '8px 18px',
              background: 'linear-gradient(180deg, #cd853f, #8b4513)',
              border: '2px solid #654321',
              borderRadius: '6px',
              color: '#fff8dc',
              fontSize: '15px',
              fontFamily: '"KaiTi", serif',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.transform = 'translateX(-3px)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.transform = 'translateX(0)';
            }}
          >
            ← 返回书志
          </button>

          <div style={{
            width: '56px',
            height: '76px',
            background: `linear-gradient(90deg, ${entry.book.coverColor} 0%, ${shadeColor(entry.book.coverColor, -15)} 100%)`,
            borderRadius: '2px 7px 7px 2px',
            padding: '6px 4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid #d4af37',
            boxShadow: '0 3px 12px rgba(0,0,0,0.25)'
          }}>
            <span style={{
              writingMode: 'vertical-rl',
              fontSize: '14px',
              fontWeight: 'bold',
              color: '#f4e4c1',
              textShadow: '1px 1px 0 #8b4513',
              letterSpacing: '2px'
            }}>
              {entry.book.title}
            </span>
          </div>

          <div style={{ flex: 1 }}>
            <h1 style={{
              fontSize: '32px',
              color: '#654321',
              margin: 0,
              letterSpacing: '4px',
              marginBottom: '4px'
            }}>
              《{entry.book.title}》
            </h1>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <span style={{
                fontSize: '13px',
                background: entry.book.type === '经' ? '#C41E3A' :
                  entry.book.type === '史' ? '#1E3A5F' :
                    entry.book.type === '子' ? '#2D5A27' : '#8B4513',
                color: '#fff8dc',
                padding: '3px 10px',
                borderRadius: '4px',
                letterSpacing: '2px'
              }}>
                {entry.book.type}部
              </span>
              <span style={{ fontSize: '14px', color: '#8b4513', opacity: 0.8 }}>
                {entry.book.description}
              </span>
            </div>
          </div>
        </motion.div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(12, 1fr)',
          gap: '24px'
        }}>
          <div style={{ gridColumn: 'span 4' }}>
            <motion.div
              initial={{ x: -30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              style={{
                background: 'rgba(255,255,255,0.55)',
                backdropFilter: 'blur(8px)',
                borderRadius: '10px',
                padding: '24px',
                border: '1px solid rgba(139,69,19,0.25)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                position: 'sticky',
                top: '80px'
              }}
            >
              <h3 style={{
                fontSize: '20px',
                color: '#8b4513',
                margin: '0 0 16px 0',
                paddingBottom: '10px',
                borderBottom: '2px dashed rgba(139,69,19,0.3)',
                letterSpacing: '3px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                ✍️ 习书便签
              </h3>

              <div style={{ position: 'relative' }}>
                <textarea
                  value={note}
                  onChange={handleNoteChange}
                  placeholder="于此书写读书记悟、心中感想、考辨所得，限两百字内..."
                  style={{
                    width: '100%',
                    height: '200px',
                    padding: '16px 18px',
                    fontSize: '16px',
                    lineHeight: 1.8,
                    fontFamily: '"STKaiti", "KaiTi", "楷体", serif',
                    color: '#654321',
                    background: 'linear-gradient(180deg, #fffde7 0%, #fff9c4 100%)',
                    border: '2px solid rgba(212,175,55,0.5)',
                    borderRadius: '6px',
                    resize: 'none',
                    outline: 'none',
                    boxShadow: 'inset 0 2px 8px rgba(139,69,19,0.1)',
                    transition: 'all 0.3s'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#d4af37';
                    e.target.style.boxShadow = 'inset 0 2px 8px rgba(139,69,19,0.1), 0 0 15px rgba(212,175,55,0.3)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(212,175,55,0.5)';
                    e.target.style.boxShadow = 'inset 0 2px 8px rgba(139,69,19,0.1)';
                  }}
                />
                <div style={{
                  position: 'absolute',
                  bottom: '8px',
                  right: '12px',
                  fontSize: '12px',
                  color: note.length >= MAX_NOTE_LENGTH * 0.9 ? '#C41E3A' : '#8b4513',
                  opacity: 0.7
                }}>
                  {note.length}/{MAX_NOTE_LENGTH}
                </div>
              </div>

              <button
                onClick={handleSave}
                disabled={isSaving || !note.trim()}
                style={{
                  width: '100%',
                  marginTop: '16px',
                  padding: '12px',
                  background: note.trim()
                    ? 'linear-gradient(180deg, #d4af37 0%, #b8860b 100%)'
                    : 'linear-gradient(180deg, #cdbfa6 0%, #a89880 100%)',
                  border: '2px solid #8b4513',
                  borderRadius: '6px',
                  color: note.trim() ? '#fff8dc' : '#8b4513',
                  fontSize: '16px',
                  fontFamily: '"KaiTi", serif',
                  fontWeight: 'bold',
                  cursor: note.trim() && !isSaving ? 'pointer' : 'not-allowed',
                  letterSpacing: '3px',
                  boxShadow: note.trim() ? '0 3px 10px rgba(0,0,0,0.2)' : 'none',
                  opacity: isSaving ? 0.7 : 1,
                  transition: 'all 0.3s'
                }}
              >
                {isSaving ? '保存中...' : '💾 存录便签'}
              </button>

              {(entry.notes || savedNotes.length > 0) && (
                <div style={{ marginTop: '24px' }}>
                  <h4 style={{
                    fontSize: '15px',
                    color: '#654321',
                    margin: '0 0 12px 0',
                    letterSpacing: '2px',
                    borderBottom: '1px solid rgba(139,69,19,0.2)',
                    paddingBottom: '6px'
                  }}>
                    📋 已存便签
                  </h4>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px'
                  }}>
                    {entry.notes && (
                      <StickyNote text={entry.notes} rotate={randomStickyRotation} />
                    )}
                    {savedNotes.map(n => (
                      <StickyNote key={n.id} text={n.text} rotate={n.rotate} />
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </div>

          <div style={{ gridColumn: 'span 8' }}>
            <motion.div
              initial={{ x: 30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              style={{
                position: 'relative',
                background: '#f5e6c8',
                borderRadius: '10px',
                padding: '40px 56px',
                border: '1px solid rgba(139,69,19,0.3)',
                boxShadow: '0 8px 30px rgba(0,0,0,0.15), inset 0 0 60px rgba(139,69,19,0.06)',
                minHeight: '600px',
                overflow: 'hidden'
              }}
            >
              <div style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `
                  radial-gradient(circle at 15% 20%, rgba(139,69,19,0.06) 0%, transparent 40%),
                  radial-gradient(circle at 85% 80%, rgba(139,69,19,0.05) 0%, transparent 35%),
                  repeating-linear-gradient(
                    90deg,
                    transparent 0,
                    transparent 28px,
                    rgba(139,69,19,0.03) 28px,
                    rgba(139,69,19,0.03) 29px
                  ),
                  repeating-linear-gradient(
                    0deg,
                    transparent 0,
                    transparent 38px,
                    rgba(139,69,19,0.04) 38px,
                    rgba(139,69,19,0.04) 39px
                  )
                `,
                pointerEvents: 'none'
              }} />

              <div style={{
                position: 'absolute',
                inset: 0,
                background: `
                  url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E")
                `,
                opacity: 0.5,
                pointerEvents: 'none'
              }} />

              <div style={{ position: 'relative' }}>
                <div style={{
                  textAlign: 'center',
                  marginBottom: '40px',
                  paddingBottom: '20px',
                  borderBottom: '3px double rgba(139,69,19,0.3)'
                }}>
                  <h2 style={{
                    fontSize: '28px',
                    color: '#8b4513',
                    margin: 0,
                    letterSpacing: '8px',
                    textShadow: '1px 1px 0 rgba(212,175,55,0.5)'
                  }}>
                    {entry.book.title}
                  </h2>
                  <div style={{
                    marginTop: '8px',
                    fontSize: '14px',
                    color: '#cd853f',
                    letterSpacing: '4px',
                    fontStyle: 'italic'
                  }}>
                    —— {entry.book.type}部典籍 ——
                  </div>
                </div>

                <div style={{
                  fontSize: '16px',
                  lineHeight: 1.8,
                  color: '#3d2817',
                  fontFamily: '"STKaiti", "KaiTi", "楷体", "SimSun", serif',
                  textAlign: 'justify',
                  textIndent: '2em'
                }}>
                  {paragraphs.map((para, idx) => (
                    <motion.p
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + idx * 0.08 }}
                      style={{
                        marginBottom: '20px',
                        letterSpacing: '1px'
                      }}
                    >
                      {para.split('\n').map((line, lineIdx) => (
                        <span key={lineIdx}>
                          {line}
                          {lineIdx < para.split('\n').length - 1 && <br />}
                        </span>
                      ))}
                    </motion.p>
                  ))}
                </div>

                <div style={{
                  marginTop: '48px',
                  paddingTop: '24px',
                  borderTop: '3px double rgba(139,69,19,0.3)',
                  textAlign: 'right'
                }}>
                  <div style={{
                    display: 'inline-block',
                    padding: '12px 24px',
                    background: 'rgba(212,175,55,0.15)',
                    borderLeft: '4px solid #d4af37',
                    borderRadius: '0 6px 6px 0',
                    fontStyle: 'italic',
                    color: '#654321',
                    fontSize: '15px',
                    maxWidth: '500px',
                    textAlign: 'left'
                  }}>
                    💬 书灵批注：「{entry.comment}」
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <style>{`
        textarea::placeholder {
          color: rgba(139, 69, 19, 0.4);
          font-style: italic;
        }
        @keyframes cursorBlink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </motion.div>
  );
};

const StickyNote = ({ text, rotate }: { text: string; rotate: number }) => {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.05, zIndex: 10 }}
      transition={{ type: 'spring', stiffness: 200 }}
      style={{
        background: 'linear-gradient(135deg, #fff59d 0%, #ffee58 40%, #fff176 100%)',
        padding: '14px 16px',
        borderRadius: '3px',
        boxShadow: '3px 4px 12px rgba(0,0,0,0.18)',
        position: 'relative',
        transform: `rotate(${rotate}deg)`,
        transition: 'all 0.3s ease'
      }}
    >
      <div style={{
        position: 'absolute',
        top: '-6px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '50px',
        height: '14px',
        background: 'rgba(212, 175, 55, 0.5)',
        borderRadius: '2px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
      }} />
      <p style={{
        margin: 0,
        fontSize: '14px',
        lineHeight: 1.6,
        color: '#3d2817',
        fontFamily: '"STKaiti", "KaiTi", "楷体", serif',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word'
      }}>
        {text}
      </p>
      <div style={{
        position: 'absolute',
        bottom: '4px',
        right: '6px',
        fontSize: '10px',
        color: '#8b4513',
        opacity: 0.3,
        transform: 'rotate(180deg)'
      }}>
        ♪
      </div>
    </motion.div>
  );
};

const shadeColor = (color: string, percent: number): string => {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return '#' + (0x1000000
    + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000
    + (G < 255 ? G < 1 ? 0 : G : 255) * 0x100
    + (B < 255 ? B < 1 ? 0 : B : 255)
  ).toString(16).slice(1);
};

export default ReadingView;
