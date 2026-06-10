import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ActivityProvider } from './context/ActivityContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ActivityProvider>
        <App />
      </ActivityProvider>
    </BrowserRouter>
  </React.StrictMode>
);
