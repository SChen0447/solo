import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const savedState = localStorage.getItem('rhythm-workshop-state');
if (savedState) {
  try {
    JSON.parse(savedState);
  } catch {
    localStorage.removeItem('rhythm-workshop-state');
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
