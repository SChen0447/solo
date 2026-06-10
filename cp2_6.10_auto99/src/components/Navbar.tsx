import React from 'react';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { selectAuthors } from '../store/poemSlice';

interface NavbarProps {
  onReset: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onReset }) => {
  const authors = useSelector(selectAuthors);

  return (
    <nav style={styles.navbar}>
      <div style={styles.logoSection}>
        <span style={styles.logoText}>诗链</span>
        <span style={styles.logoSubtitle}>Poem Chain</span>
      </div>
      <div style={styles.rightSection}>
        <div style={styles.onlineIndicator}>
          <span style={styles.onlineDot} />
          <span style={styles.onlineText}>{authors.length} 位作者在线</span>
        </div>
        <motion.button
          onClick={onReset}
          style={styles.resetButton}
          whileHover={{ backgroundColor: '#e0e0e0' }}
          whileTap={{ scale: 0.97 }}
        >
          重置
        </motion.button>
      </div>
    </nav>
  );
};

const styles: Record<string, React.CSSProperties> = {
  navbar: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: '320px',
    height: '60px',
    backgroundColor: '#fff',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 32px',
    zIndex: 100,
  },
  logoSection: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '10px',
  },
  logoText: {
    fontSize: '24px',
    fontWeight: 800,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    letterSpacing: '2px',
  },
  logoSubtitle: {
    fontSize: '12px',
    color: '#999',
    letterSpacing: '1px',
    textTransform: 'uppercase',
  },
  rightSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  onlineIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  onlineDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#27ae60',
    boxShadow: '0 0 8px rgba(39, 174, 96, 0.6)',
    display: 'inline-block',
  },
  onlineText: {
    fontSize: '13px',
    color: '#555',
  },
  resetButton: {
    padding: '8px 20px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#2d3436',
    backgroundColor: '#f0f0f0',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    fontFamily: 'inherit',
  },
};

export default Navbar;
