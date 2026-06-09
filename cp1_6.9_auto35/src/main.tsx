import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { patternStorage } from './utils/patternStorage';

const initStorage = () => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      patternStorage.getErrorCount();
    }
  } catch (e) {
    console.warn('LocalStorage not available:', e);
  }
};

initStorage();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
