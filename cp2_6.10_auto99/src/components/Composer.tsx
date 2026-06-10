import React, { useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { addLine, selectCurrentLines } from '../store/poemSlice';
import { MAX_LINES, MAX_CHARS_PER_LINE } from '../utils/versionManager';

const Composer: React.FC = () => {
  const dispatch = useDispatch();
  const currentLines = useSelector(selectCurrentLines);
  const [text, setText] = useState('');
  const [author, setAuthor] = useState('');
  const [isFlashing, setIsFlashing] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isFull = currentLines.length >= MAX_LINES;

  const handleSubmit = () => {
    if (isFull) {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 300);
      return;
    }
    if (!text.trim() || !author.trim()) return;
    if (text.length > MAX_CHARS_PER_LINE) return;

    dispatch(addLine({ text: text.trim(), author: author.trim() }));
    setText('');
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 200);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.inputRow}>
        <input
          type="text"
          placeholder="作者名"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          style={{
            ...styles.authorInput,
            ...(isFlashing ? styles.flash : {}),
          }}
          onKeyDown={handleKeyDown}
        />
        <input
          ref={inputRef}
          type="text"
          placeholder={`输入一句诗（不超过${MAX_CHARS_PER_LINE}字）`}
          value={text}
          onChange={(e) => {
            if (e.target.value.length <= MAX_CHARS_PER_LINE) {
              setText(e.target.value);
            }
          }}
          onKeyDown={handleKeyDown}
          style={{
            ...styles.textInput,
            ...(isFlashing ? styles.flash : {}),
          }}
          maxLength={MAX_CHARS_PER_LINE}
        />
        <motion.button
          onClick={handleSubmit}
          disabled={isFull}
          animate={isShaking ? { x: [-3, 3, -3, 3, 0] } : {}}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          style={{
            ...styles.submitButton,
            ...(isFull ? styles.disabledButton : {}),
          }}
          whileHover={!isFull ? { backgroundColor: '#5a2d8a' } : {}}
          whileTap={!isFull ? { scale: 0.97 } : {}}
        >
          {isFull ? '已满员' : '提交'}
        </motion.button>
      </div>
      <div style={styles.counter}>
        {text.length}/{MAX_CHARS_PER_LINE} · 当前 {currentLines.length}/{MAX_LINES} 句
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    padding: '24px 0',
  },
  inputRow: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorInput: {
    width: '120px',
    padding: '12px 16px',
    fontSize: '14px',
    border: '2px solid #ccc',
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
    fontFamily: 'inherit',
  },
  textInput: {
    flex: 1,
    padding: '12px 16px',
    fontSize: '16px',
    border: '2px solid #ccc',
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
    fontFamily: 'inherit',
  },
  submitButton: {
    padding: '12px 28px',
    fontSize: '15px',
    fontWeight: 600,
    color: '#fff',
    backgroundColor: '#764ba2',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    fontFamily: 'inherit',
  },
  disabledButton: {
    backgroundColor: '#aaa',
    color: '#e74c3c',
    cursor: 'not-allowed',
  },
  flash: {
    boxShadow: '0 0 20px rgba(118, 75, 162, 0.6)',
  },
  counter: {
    marginTop: '8px',
    textAlign: 'center',
    fontSize: '12px',
    color: '#888',
  },
};

export default Composer;
