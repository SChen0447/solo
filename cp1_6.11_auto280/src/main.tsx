import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AlchemyProvider } from './phases/Phases';
import { initFirebase } from './firebase/firebaseConfig';

initFirebase();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AlchemyProvider>
        <App />
      </AlchemyProvider>
    </BrowserRouter>
  </React.StrictMode>
);
