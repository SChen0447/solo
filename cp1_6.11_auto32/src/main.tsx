import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuctionProvider } from './context/AuctionContext';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuctionProvider>
        <App />
      </AuctionProvider>
    </BrowserRouter>
  </React.StrictMode>
);
