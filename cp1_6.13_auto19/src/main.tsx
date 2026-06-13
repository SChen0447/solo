import React from 'react';
import ReactDOM from 'react-dom/client';
import HeightMapEditor from './components/HeightMapEditor';

const rootEl = document.getElementById('root');
if (rootEl) {
  const root = ReactDOM.createRoot(rootEl);
  root.render(
    <React.StrictMode>
      <HeightMapEditor />
    </React.StrictMode>
  );
}
