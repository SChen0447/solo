import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import Navbar from './components/Navbar';
import Composer from './components/Composer';
import PoemDisplay from './components/PoemDisplay';
import Timeline from './components/Timeline';
import ResetModal from './components/ResetModal';
import { reset } from './store/poemSlice';

const App: React.FC = () => {
  const dispatch = useDispatch();
  const [showResetModal, setShowResetModal] = useState(false);

  const handleReset = () => {
    setShowResetModal(true);
  };

  const handleConfirmReset = () => {
    dispatch(reset());
    setShowResetModal(false);
  };

  return (
    <div style={styles.app}>
      <Navbar onReset={handleReset} />
      <main style={styles.main}>
        <div style={styles.content}>
          <div style={styles.titleSection}>
            <h1 style={styles.mainTitle}>共赋诗篇</h1>
            <p style={styles.subTitle}>与他人接力，共同创作一首诗歌</p>
          </div>
          <Composer />
          <PoemDisplay />
        </div>
      </main>
      <Timeline />
      <ResetModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onConfirm={handleConfirmReset}
      />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  app: {
    width: '100%',
    minHeight: '100vh',
    backgroundColor: '#fff',
    position: 'relative',
  },
  main: {
    paddingTop: '60px',
    paddingRight: '320px',
    minHeight: '100vh',
  },
  content: {
    padding: '0 20%',
  },
  titleSection: {
    textAlign: 'center',
    padding: '40px 0 16px',
  },
  mainTitle: {
    fontSize: '32px',
    fontWeight: 800,
    color: '#2d3436',
    marginBottom: '8px',
    letterSpacing: '2px',
  },
  subTitle: {
    fontSize: '14px',
    color: '#888',
  },
};

export default App;
