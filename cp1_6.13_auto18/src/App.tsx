import { useEffect, useState } from 'react';
import Toolbar from './components/Toolbar';
import Canvas from './components/Canvas';
import PropertyPanel from './components/PropertyPanel';
import ThemeBar from './components/ThemeBar';
import EditModal from './components/EditModal';
import Toast from './components/Toast';
import { useAppStore } from './store/useAppStore';
import './App.css';

function App() {
  const theme = useAppStore((state) => state.theme);
  const customPrimaryColor = useAppStore((state) => state.customPrimaryColor);
  const [isMobile, setIsMobile] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty('--bg-color', theme.background);
    document.documentElement.style.setProperty('--primary-color', customPrimaryColor);
    document.documentElement.style.setProperty('--secondary-color', theme.secondary);
    document.documentElement.style.setProperty('--text-color', theme.text);
    document.documentElement.style.setProperty('--text-secondary', theme.textSecondary);
    document.documentElement.style.setProperty('--card-bg', theme.cardBg);
    document.documentElement.style.setProperty('--card-border', theme.cardBorder);
    document.documentElement.style.setProperty('--shadow', theme.shadow);
    document.documentElement.style.setProperty('--font-family', theme.fontFamily);
    document.documentElement.style.setProperty('--grid-color', theme.gridColor);
  }, [theme, customPrimaryColor]);

  return (
    <div className="app-container" style={{ fontFamily: theme.fontFamily }}>
      <ThemeBar />
      <div className="main-content">
        {!isMobile && <Toolbar />}
        {isMobile && (
          <div className="mobile-toolbar">
            <Toolbar />
          </div>
        )}
        <Canvas />
        {!isMobile && <PropertyPanel />}
        {isMobile && showDrawer && (
          <div className="mobile-drawer-overlay" onClick={() => setShowDrawer(false)}>
            <div className="mobile-drawer" onClick={(e) => e.stopPropagation()}>
              <PropertyPanel />
            </div>
          </div>
        )}
      </div>
      {isMobile && (
        <button className="mobile-drawer-toggle" onClick={() => setShowDrawer(true)}>
          ⚙️ 属性
        </button>
      )}
      <EditModal />
      <Toast />
    </div>
  );
}

export default App;
