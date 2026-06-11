import { useState, useEffect } from 'react';
import Editor from './components/Editor';
import Preview from './components/Preview';
import TemplatePicker from './components/TemplatePicker';
import './App.css';

export default function App() {
  const [isMobile, setIsMobile] = useState(false);
  const [leftDrawerOpen, setLeftDrawerOpen] = useState(false);
  const [rightDrawerOpen, setRightDrawerOpen] = useState(false);

  useEffect(() => {
    const checkScreen = () => {
      setIsMobile(window.innerWidth < 1280);
    };

    checkScreen();
    window.addEventListener('resize', checkScreen);
    return () => window.removeEventListener('resize', checkScreen);
  }, []);

  useEffect(() => {
    if (!isMobile) {
      setLeftDrawerOpen(false);
      setRightDrawerOpen(false);
    }
  }, [isMobile]);

  return (
    <div className="app-container">
      {isMobile && (
        <header className="mobile-header">
          <button
            className="drawer-toggle left-toggle"
            onClick={() => setLeftDrawerOpen(true)}
          >
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
            </svg>
          </button>
          <h1 className="app-title">简历制作工具</h1>
          <button
            className="drawer-toggle right-toggle"
            onClick={() => setRightDrawerOpen(true)}
          >
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z" />
            </svg>
          </button>
        </header>
      )}

      <div className="main-content">
        <aside
          className={`left-panel ${isMobile ? 'drawer' : ''} ${
            leftDrawerOpen ? 'open' : ''
          }`}
        >
          {isMobile && (
            <div className="drawer-header">
              <h2>编辑简历</h2>
              <button
                className="close-btn"
                onClick={() => setLeftDrawerOpen(false)}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
                </svg>
              </button>
            </div>
          )}
          <Editor />
        </aside>

        {isMobile && leftDrawerOpen && (
          <div
            className="drawer-overlay"
            onClick={() => setLeftDrawerOpen(false)}
          />
        )}

        <main className="center-panel">
          <Preview />
        </main>

        {isMobile && rightDrawerOpen && (
          <div
            className="drawer-overlay right-overlay"
            onClick={() => setRightDrawerOpen(false)}
          />
        )}

        <aside
          className={`right-panel ${isMobile ? 'drawer right-drawer' : ''} ${
            rightDrawerOpen ? 'open' : ''
          }`}
        >
          {isMobile && (
            <div className="drawer-header">
              <h2>模板与导出</h2>
              <button
                className="close-btn"
                onClick={() => setRightDrawerOpen(false)}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
                </svg>
              </button>
            </div>
          )}
          <TemplatePicker />
        </aside>
      </div>
    </div>
  );
}
