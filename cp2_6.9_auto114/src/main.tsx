import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import App from './App';

const ExitPage: React.FC = () => {
  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1E1E2E',
        color: '#fff',
        fontFamily: 'Inter',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 12 }}>👋 已退出编辑器</h1>
        <p style={{ color: '#888', fontSize: 14, marginBottom: 28 }}>感谢使用 Flow Editor</p>
        <Link
          to="/"
          style={{
            display: 'inline-block',
            padding: '10px 24px',
            background: '#6C5CE7',
            color: '#fff',
            borderRadius: 8,
            textDecoration: 'none',
            fontSize: 14,
            fontWeight: 500,
            transition: 'opacity 0.2s',
          }}
          onMouseOver={e => (e.currentTarget.style.opacity = '0.8')}
          onMouseOut={e => (e.currentTarget.style.opacity = '1')}
        >
          重新进入编辑器
        </Link>
      </div>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/exit" element={<ExitPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
