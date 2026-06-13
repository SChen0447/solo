import React from 'react';
import ReactDOM from 'react-dom/client';
import MixingConsole from './components/MixingConsole';

const loadingScreen = document.getElementById('loading-screen');
const rootEl = document.getElementById('root');

if (rootEl) {
  const root = ReactDOM.createRoot(rootEl);
  root.render(
    <React.StrictMode>
      <MixingConsole />
    </React.StrictMode>
  );

  requestAnimationFrame(() => {
    rootEl.classList.add('visible');
    if (loadingScreen) {
      loadingScreen.classList.add('fade-out');
      setTimeout(() => loadingScreen.remove(), 600);
    }
  });
}
