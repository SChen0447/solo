import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const ResetModal: React.FC<ResetModalProps> = ({ isOpen, onClose, onConfirm }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={styles.overlay}
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            style={styles.modal}
          >
            <div style={styles.icon}>⚠️</div>
            <div style={styles.title}>确认重置所有诗句？</div>
            <div style={styles.message}>
              此操作将清空当前诗歌的所有内容和版本历史，且无法撤销。
            </div>
            <div style={styles.buttonRow}>
              <motion.button
                onClick={onClose}
                style={styles.cancelButton}
                whileHover={{ backgroundColor: '#e0e0e0' }}
                whileTap={{ scale: 0.97 }}
              >
                取消
              </motion.button>
              <motion.button
                onClick={onConfirm}
                style={styles.confirmButton}
                whileHover={{ backgroundColor: '#c0392b' }}
                whileTap={{ scale: 0.97 }}
              >
                确认重置
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 200,
  },
  modal: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '32px',
    width: '400px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    zIndex: 201,
    textAlign: 'center',
  },
  icon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  title: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#2d3436',
    marginBottom: '12px',
  },
  message: {
    fontSize: '14px',
    color: '#666',
    lineHeight: 1.6,
    marginBottom: '24px',
  },
  buttonRow: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
  },
  cancelButton: {
    padding: '10px 24px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#2d3436',
    backgroundColor: '#f0f0f0',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    fontFamily: 'inherit',
  },
  confirmButton: {
    padding: '10px 24px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#fff',
    backgroundColor: '#e74c3c',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    fontFamily: 'inherit',
  },
};

export default ResetModal;
