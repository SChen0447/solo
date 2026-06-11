import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DrugControlsProps {
  selectedConcentration: number;
  onConcentrationChange: (concentration: number) => void;
  injectMode: boolean;
  onInjectModeChange: (active: boolean) => void;
  onSaveSnapshot: () => void;
  onLoadSnapshot: (id: string) => void;
  snapshots: { id: string; name: string; timestamp: number }[];
}

const CONCENTRATION_OPTIONS = [0.1, 0.3, 0.5, 0.8];

const SyringeIcon: React.FC<{ active?: boolean; size?: number }> = ({ active, size = 48 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect x="18" y="12" width="12" height="24" rx="2" fill={active ? '#1565c0' : '#e3f2fd'} stroke="#1565c0" strokeWidth="2" />
    <rect x="18" y="28" width="12" height="8" fill="#bbdefb" />
    <line x1="20" y1="18" x2="28" y2="18" stroke="#1565c0" strokeWidth="1" />
    <line x1="20" y1="22" x2="28" y2="22" stroke="#1565c0" strokeWidth="1" />
    <line x1="20" y1="26" x2="28" y2="26" stroke="#1565c0" strokeWidth="1" />
    <rect x="16" y="34" width="16" height="4" rx="1" fill="#1565c0" />
    <path d="M22 6 L26 6 L26 12 L22 12 Z" fill="#90caf9" stroke="#1565c0" strokeWidth="1" />
    <path d="M23 2 L25 2 L25 6 L23 6 Z" fill="#424242" />
    <rect x="14" y="8" width="20" height="3" rx="1" fill="#78909c" />
  </svg>
);

const DrugControls: React.FC<DrugControlsProps> = ({
  selectedConcentration,
  onConcentrationChange,
  injectMode,
  onInjectModeChange,
  onSaveSnapshot,
  onLoadSnapshot,
  snapshots,
}) => {
  const [showConcentrations, setShowConcentrations] = useState(false);
  const [inputValue, setInputValue] = useState(selectedConcentration.toString());
  const [showSnapshotDropdown, setShowSnapshotDropdown] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*\.?\d*$/.test(value)) {
      setInputValue(value);
      const num = parseFloat(value);
      if (!isNaN(num) && num >= 0 && num <= 1) {
        onConcentrationChange(num);
      }
    }
  };

  const handleInputBlur = () => {
    setInputFocused(false);
    const num = parseFloat(inputValue);
    if (isNaN(num) || num < 0 || num > 1) {
      setInputValue(selectedConcentration.toString());
    }
  };

  const handleConcentrationClick = (conc: number) => {
    onConcentrationChange(conc);
    setInputValue(conc.toString());
    setShowConcentrations(false);
  };

  const handleSyringeClick = () => {
    if (injectMode) {
      onInjectModeChange(false);
    } else {
      setShowConcentrations(!showConcentrations);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
        padding: '16px 24px',
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
        flexWrap: 'wrap',
        justifyContent: 'center',
      }}
    >
      <div style={{ position: 'relative' }}>
        <motion.div
          onClick={handleSyringeClick}
          style={{
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '8px',
            background: injectMode ? '#e3f2fd' : 'transparent',
            border: injectMode ? '2px solid #1565c0' : '2px solid transparent',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
          }}
          whileHover={{ y: -2, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
          whileTap={{ scale: 0.97 }}
          transition={{ duration: 0.2 }}
        >
          <SyringeIcon active={injectMode} size={40} />
          <span style={{ fontSize: '12px', color: '#666' }}>
            {injectMode ? '注射中' : '注射器'}
          </span>
        </motion.div>

        <AnimatePresence>
          {showConcentrations && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              style={{
                position: 'absolute',
                top: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                marginTop: '8px',
                background: 'white',
                borderRadius: '8px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                padding: '8px',
                zIndex: 100,
                minWidth: '140px',
              }}
            >
              {CONCENTRATION_OPTIONS.map((conc) => (
                <motion.div
                  key={conc}
                  onClick={() => handleConcentrationClick(conc)}
                  style={{
                    padding: '10px 16px',
                    cursor: 'pointer',
                    borderRadius: '6px',
                    background: selectedConcentration === conc ? '#e3f2fd' : 'transparent',
                    color: selectedConcentration === conc ? '#1565c0' : '#333',
                    fontSize: '14px',
                    fontWeight: selectedConcentration === conc ? 600 : 400,
                  }}
                  whileHover={{ background: '#f5f5f5' }}
                  whileTap={{ scale: 0.98 }}
                >
                  {conc} mg/mL
                </motion.div>
              ))}
              <motion.div
                onClick={() => {
                  onInjectModeChange(true);
                  setShowConcentrations(false);
                }}
                style={{
                  padding: '10px 16px',
                  cursor: 'pointer',
                  borderRadius: '6px',
                  background: '#1565c0',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 500,
                  textAlign: 'center',
                  marginTop: '4px',
                }}
                whileHover={{ background: '#0d47a1' }}
                whileTap={{ scale: 0.98 }}
              >
                开始注射
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label style={{ fontSize: '12px', color: '#888' }}>药物浓度 (mg/mL)</label>
        <div style={{ position: 'relative', width: '120px' }}>
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => setInputFocused(true)}
            onBlur={handleInputBlur}
            style={{
              width: '100%',
              padding: '8px 0',
              border: 'none',
              borderBottom: inputFocused ? '2px solid #1565c0' : '1px solid #ccc',
              fontSize: '16px',
              outline: 'none',
              background: 'transparent',
              fontFamily: 'Roboto Mono, monospace',
              transition: 'border-color 0.2s ease-out',
            }}
          />
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: inputFocused ? 1 : 0 }}
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: '100%',
              height: '2px',
              background: '#1565c0',
              transformOrigin: 'left',
            }}
            transition={{ duration: 0.2 }}
          />
        </div>
      </div>

      <div style={{ flex: 1 }} />

      <motion.button
        onClick={onSaveSnapshot}
        style={{
          padding: '10px 20px',
          border: 'none',
          borderRadius: '8px',
          background: 'linear-gradient(135deg, #388e3c, #2e7d32)',
          color: 'white',
          fontSize: '14px',
          fontWeight: 500,
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(56, 142, 60, 0.3)',
        }}
        whileHover={{ y: -2, boxShadow: '0 4px 16px rgba(56, 142, 60, 0.4)' }}
        whileTap={{ scale: 0.97 }}
        transition={{ duration: 0.2 }}
      >
        保存快照
      </motion.button>

      <div style={{ position: 'relative' }}>
        <motion.button
          onClick={() => setShowSnapshotDropdown(!showSnapshotDropdown)}
          style={{
            padding: '10px 20px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            background: 'white',
            color: '#333',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            minWidth: '140px',
          }}
          whileHover={{ y: -2, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
          whileTap={{ scale: 0.97 }}
          transition={{ duration: 0.2 }}
        >
          加载快照 ▾
        </motion.button>

        <AnimatePresence>
          {showSnapshotDropdown && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '4px',
                background: 'white',
                borderRadius: '8px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                padding: '4px',
                zIndex: 100,
                minWidth: '200px',
                maxHeight: '200px',
                overflowY: 'auto',
              }}
            >
              {snapshots.length === 0 ? (
                <div style={{ padding: '12px', color: '#999', fontSize: '13px' }}>
                  暂无快照
                </div>
              ) : (
                snapshots.map((snap) => (
                  <motion.div
                    key={snap.id}
                    onClick={() => {
                      onLoadSnapshot(snap.id);
                      setShowSnapshotDropdown(false);
                    }}
                    style={{
                      padding: '10px 14px',
                      cursor: 'pointer',
                      borderRadius: '6px',
                      fontSize: '13px',
                    }}
                    whileHover={{ background: '#f5f5f5' }}
                  >
                    <div style={{ fontWeight: 500, color: '#333' }}>{snap.name}</div>
                    <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>
                      {formatDate(snap.timestamp)}
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default DrugControls;
