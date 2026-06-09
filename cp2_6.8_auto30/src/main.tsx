import React from 'react'
import ReactDOM from 'react-dom/client'
import GameCanvas from './components/GameCanvas'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f4e 50%, #0a0e27 100%)',
      padding: '20px',
      boxSizing: 'border-box',
    }}>
      <h1 style={{
        fontFamily: '"SimHei", "Microsoft YaHei", "黑体", sans-serif',
        fontSize: '36px',
        color: '#ffffff',
        margin: '0 0 20px 0',
        textShadow: '2px 2px 8px rgba(0,0,0,0.5)',
      }}>
        🫧 泡泡射手 Bubble Shooter
      </h1>
      <p style={{
        fontFamily: '"SimHei", "Microsoft YaHei", "黑体", sans-serif',
        fontSize: '14px',
        color: '#aaaaaa',
        margin: '0 0 20px 0',
      }}>
        按住鼠标拖动瞄准，松开发射泡泡。消除同色泡泡获得分数！
      </p>
      <GameCanvas />
    </div>
  </React.StrictMode>,
)
