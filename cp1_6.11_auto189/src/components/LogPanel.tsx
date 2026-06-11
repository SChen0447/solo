import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTeaStore, TEA_INFO, BrewRecord, TeaType } from '../store';

interface LogPanelProps {
  collapsed: boolean;
  onToggle: () => void;
  onSelectRecord: (record: BrewRecord) => void;
}

const LogPanel: React.FC<LogPanelProps> = ({ collapsed, onToggle, onSelectRecord }) => {
  const records = useTeaStore((s) => s.records);
  const activeRecordId = useTeaStore((s) => s.activeRecordId);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <motion.div
      initial={false}
      animate={{ width: collapsed ? 0 : 240, opacity: collapsed ? 0 : 1 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      style={{
        overflow: 'hidden',
        background: 'linear-gradient(180deg, rgba(240,232,200,0.95), rgba(220,210,185,0.95))',
        borderRight: '1px solid rgba(160,140,110,0.3)',
        height: '100%',
        flexShrink: 0,
      }}
    >
      <div style={{ width: 240, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            padding: '20px 16px 12px',
            fontSize: 15,
            color: '#3a2a1a',
            letterSpacing: 3,
            borderBottom: '1px solid rgba(160,140,110,0.3)',
            fontWeight: 500,
          }}
        >
          品鑑日志
        </div>

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '8px 0',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(120,100,70,0.3) transparent',
          }}
        >
          {records.length === 0 && (
            <div
              style={{
                padding: '24px 16px',
                fontSize: 12,
                color: '#9a8a7a',
                textAlign: 'center',
                fontStyle: 'italic',
              }}
            >
              まだ記録がありません
            </div>
          )}

          <AnimatePresence>
            {records.map((record) => {
              const teaInfo = TEA_INFO[record.teaType as TeaType];
              const isActive = record.id === activeRecordId;

              return (
                <motion.div
                  key={record.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                  onClick={() => onSelectRecord(record)}
                  style={{
                    padding: '10px 16px',
                    cursor: 'pointer',
                    background: isActive
                      ? 'rgba(90,74,58,0.12)'
                      : 'transparent',
                    borderBottom: '1px solid rgba(160,140,110,0.15)',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLDivElement).style.background =
                        'rgba(90,74,58,0.06)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLDivElement).style.background =
                        'transparent';
                    }
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 4,
                    }}
                  >
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 3,
                        background: record.teaColorHex,
                        border: '1px solid rgba(0,0,0,0.12)',
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontSize: 13, color: '#3a2a1a', fontWeight: 500 }}>
                      {teaInfo?.name ?? record.teaType}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: '#8a7a6a', paddingLeft: 28 }}>
                    {formatDate(record.date)} {formatTime(record.date)}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        <div
          style={{
            padding: '8px 16px',
            fontSize: 11,
            color: '#9a8a7a',
            borderTop: '1px solid rgba(160,140,110,0.3)',
            textAlign: 'center',
          }}
        >
          {records.length} / 50
        </div>
      </div>
    </motion.div>
  );
};

export default LogPanel;
