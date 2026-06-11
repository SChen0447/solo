import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { LogEntry } from '../App';

const typeColors: Record<string, string> = {
  '经': '#C41E3A',
  '史': '#1E3A5F',
  '子': '#2D5A27',
  '集': '#8B4513'
};

const ReadingLog = ({ entries }: { entries: LogEntry[] }) => {
  const navigate = useNavigate();

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  if (entries.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          minHeight: 'calc(100vh - 60px)',
          background: 'linear-gradient(180deg, #f4e4c1 0%, #e8d4a8 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: '"KaiTi", "STKaiti", "楷体", serif'
        }}
      >
        <div style={{
          textAlign: 'center',
          color: '#8b4513',
          opacity: 0.7
        }}>
          <div style={{ fontSize: '80px', marginBottom: '20px' }}>📖</div>
          <div style={{ fontSize: '24px', marginBottom: '12px' }}>藏书志空空如也</div>
          <div style={{ fontSize: '16px', fontStyle: 'italic' }}>
            移步书肆，与书灵交换典籍，开启您的藏书之旅吧~
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        minHeight: 'calc(100vh - 60px)',
        background: 'linear-gradient(180deg, #f4e4c1 0%, #e8d4a8 100%)',
        padding: '40px 20px',
        fontFamily: '"KaiTi", "STKaiti", "楷体", serif'
      }}
    >
      <div style={{
        maxWidth: '1000px',
        margin: '0 auto'
      }}>
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          style={{
            textAlign: 'center',
            marginBottom: '50px'
          }}
        >
          <h1 style={{
            fontSize: '42px',
            color: '#8b4513',
            marginBottom: '10px',
            textShadow: '2px 2px 0 #d4af37',
            letterSpacing: '6px'
          }}>
            📜 藏书志 📜
          </h1>
          <p style={{
            color: '#654321',
            fontSize: '18px',
            fontStyle: 'italic',
            opacity: 0.8
          }}>
            共收录典籍 {entries.length} 部 · 愿君读书破万卷
          </p>
        </motion.div>

        <div style={{ position: 'relative' }}>
          <div style={{
            position: 'absolute',
            left: '160px',
            top: 0,
            bottom: 0,
            width: '3px',
            background: 'linear-gradient(180deg, #d4af37 0%, #8b4513 100%)',
            borderRadius: '2px'
          }} />
          <div style={{
            position: 'absolute',
            left: '160px',
            top: 0,
            bottom: 0,
            width: '9px',
            marginLeft: '-3px',
            background: 'linear-gradient(180deg, rgba(212,175,55,0.3) 0%, rgba(139,69,19,0.3) 100%)',
            borderRadius: '5px'
          }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            {entries.map((entry, idx) => (
              <TimelineItem
                key={entry.id}
                entry={entry}
                index={idx}
                formatDate={formatDate}
                onClick={() => navigate(`/reading/${entry.book.id}`)}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const TimelineItem = ({ entry, index, formatDate, onClick }: {
  entry: LogEntry;
  index: number;
  formatDate: (iso: string) => string;
  onClick: () => void;
}) => {
  return (
    <motion.div
      initial={{ x: 50, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: index * 0.08, type: 'spring', stiffness: 100 }}
      style={{
        display: 'flex',
        alignItems: 'stretch',
        gap: '20px',
        position: 'relative'
      }}
    >
      <div style={{
        width: '160px',
        flexShrink: 0,
        textAlign: 'right',
        padding: '20px 24px 20px 0',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        position: 'relative'
      }}>
        <div style={{
          fontSize: '15px',
          color: '#8b4513',
          fontWeight: 'bold',
          lineHeight: 1.4
        }}>
          {formatDate(entry.timestamp)}
        </div>
        <div style={{
          fontSize: '12px',
          color: '#cd853f',
          marginTop: '4px',
          fontStyle: 'italic'
        }}>
          入藏 · 第 {index + 1} 部
        </div>
      </div>

      <div style={{
        position: 'absolute',
        left: '152px',
        top: '50%',
        transform: 'translateY(-50%)',
        width: '20px',
        height: '20px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #ffd700 0%, #d4af37 50%, #b8860b 100%)',
        border: '3px solid #8b4513',
        boxShadow: '0 0 15px rgba(212,175,55,0.6)',
        zIndex: 2
      }} />

      <motion.div
        onClick={onClick}
        whileHover={{
          scale: 1.01,
          x: 5,
          boxShadow: '4px 8px 24px rgba(0,0,0,0.25)'
        }}
        whileTap={{ scale: 0.98 }}
        style={{
          flex: 1,
          background: 'rgba(255,255,255,0.55)',
          backdropFilter: 'blur(8px)',
          borderRadius: '8px',
          padding: '20px 24px',
          border: '1px solid rgba(139,69,19,0.25)',
          boxShadow: '2px 4px 12px rgba(0,0,0,0.1)',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          display: 'flex',
          gap: '20px',
          marginLeft: '20px',
          position: 'relative'
        }}
      >
        <div style={{
          width: '80px',
          height: '110px',
          flexShrink: 0,
          background: `linear-gradient(90deg, ${entry.book.coverColor} 0%, ${shadeColor(entry.book.coverColor, -15)} 100%)`,
          borderRadius: '3px 8px 8px 3px',
          padding: '10px 6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '2px solid #d4af37',
          boxShadow: '0 4px 15px rgba(0,0,0,0.25)',
          position: 'relative'
        }}>
          <span style={{
            writingMode: 'vertical-rl',
            textOrientation: 'upright',
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#f4e4c1',
            textShadow: '1px 1px 0 #8b4513',
            letterSpacing: '3px'
          }}>
            {entry.book.title}
          </span>
          <span style={{
            position: 'absolute',
            bottom: '6px',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '10px',
            color: '#d4af37',
            border: '1px solid #d4af37',
            padding: '1px 5px',
            borderRadius: '2px',
            background: 'rgba(0,0,0,0.3)'
          }}>
            {entry.book.type}
          </span>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <h3 style={{
              fontSize: '24px',
              color: '#654321',
              margin: 0,
              letterSpacing: '2px'
            }}>
              《{entry.book.title}》
            </h3>
            <span style={{
              fontSize: '13px',
              color: '#fff8dc',
              background: typeColors[entry.book.type],
              padding: '3px 10px',
              borderRadius: '4px',
              fontWeight: 'bold',
              letterSpacing: '2px'
            }}>
              {entry.book.type}部
            </span>
          </div>

          <p style={{
            fontSize: '15px',
            color: '#8b4513',
            margin: 0,
            lineHeight: 1.6,
            opacity: 0.85
          }}>
            {entry.book.description}
          </p>

          <div style={{
            marginTop: 'auto',
            padding: '10px 14px',
            background: 'linear-gradient(135deg, rgba(212,175,55,0.2) 0%, rgba(205,133,63,0.15) 100%)',
            borderLeft: '3px solid #d4af37',
            borderRadius: '0 4px 4px 0',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px'
          }}>
            <span style={{ fontSize: '16px' }}>💬</span>
            <p style={{
              margin: 0,
              fontSize: '14px',
              color: '#654321',
              fontStyle: 'italic',
              lineHeight: 1.5,
              flex: 1
            }}>
              书灵评曰：「{entry.comment}」
            </p>
          </div>

          {entry.notes && (
            <div style={{
              fontSize: '13px',
              color: '#8b4513',
              padding: '6px 10px',
              background: 'rgba(255,248,180,0.5)',
              borderRadius: '4px',
              border: '1px dashed #d4af37',
              fontStyle: 'italic'
            }}>
              📝 已有心得笔记（{entry.notes.length}/200字）
            </div>
          )}
        </div>

        <div style={{
          position: 'absolute',
          right: '16px',
          top: '50%',
          transform: 'translateY(-50%)',
          color: '#cd853f',
          fontSize: '28px',
          opacity: 0.6
        }}>
          →
        </div>
      </motion.div>
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

export default ReadingLog;
