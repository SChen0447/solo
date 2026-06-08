import React, { useState } from 'react';

interface NavBarProps {
  onUploadClick: () => void;
  onExportClick: () => void;
  onResetClick: () => void;
  hasAudio: boolean;
}

const NavBar: React.FC<NavBarProps> = ({
  onUploadClick,
  onExportClick,
  onResetClick,
  hasAudio,
}) => {
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);

  const createRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();

    setRipples(prev => [...prev, { id, x, y }]);

    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== id));
    }, 400);
  };

  const NavButton: React.FC<{
    onClick: () => void;
    disabled?: boolean;
    children: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'danger';
  }> = ({ onClick, disabled, children, variant = 'secondary' }) => (
    <button
      className={`nav-btn ${variant}`}
      onClick={(e) => {
        createRipple(e);
        if (!disabled) onClick();
      }}
      disabled={disabled}
    >
      {ripples.map(r => (
        <span
          key={r.id}
          className="ripple"
          style={{ left: r.x, top: r.y }}
        />
      ))}
      <span className="btn-content">{children}</span>
    </button>
  );

  return (
    <nav className="navbar">
      <div className="nav-container">
        <div className="nav-logo">
          <span className="logo-icon">🎵</span>
          <span className="logo-text">AudioVisualizer</span>
        </div>

        <div className="nav-actions">
          <NavButton onClick={onUploadClick} variant="primary">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            上传
          </NavButton>

          <NavButton onClick={onExportClick} disabled={!hasAudio} variant="secondary">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            导出
          </NavButton>

          <NavButton onClick={onResetClick} disabled={!hasAudio} variant="secondary">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            重置
          </NavButton>
        </div>
      </div>

      <style>{`
        .navbar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 56px;
          background: rgba(26, 26, 46, 0.8);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          z-index: 1000;
        }

        .nav-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 100%;
          padding: 0 24px;
          max-width: 100%;
        }

        .nav-logo {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .logo-icon {
          font-size: 24px;
        }

        .logo-text {
          font-size: 20px;
          font-weight: 700;
          background: linear-gradient(90deg, #00ffaa, #ff00aa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          letter-spacing: 1px;
        }

        .nav-actions {
          display: flex;
          gap: 12px;
        }

        .nav-btn {
          position: relative;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          overflow: hidden;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .nav-btn:hover:not(:disabled) {
          transform: scale(1.1);
        }

        .nav-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .nav-btn.primary {
          background: linear-gradient(135deg, #00ffaa, #00cc88);
          color: #0a0a0f;
          box-shadow: 0 2px 10px rgba(0, 255, 170, 0.3);
        }

        .nav-btn.primary:hover:not(:disabled) {
          box-shadow: 0 4px 20px rgba(0, 255, 170, 0.5);
        }

        .nav-btn.secondary {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .nav-btn.secondary:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.2);
          border-color: #00ffaa;
        }

        .nav-btn.danger {
          background: rgba(255, 68, 102, 0.2);
          color: #ff4466;
          border: 1px solid rgba(255, 68, 102, 0.3);
        }

        .btn-content {
          display: flex;
          align-items: center;
          gap: 8px;
          position: relative;
          z-index: 1;
        }

        .ripple {
          position: absolute;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.4);
          transform: scale(0);
          animation: ripple-animation 0.4s ease-out forwards;
          pointer-events: none;
        }

        @keyframes ripple-animation {
          to {
            transform: scale(4);
            opacity: 0;
          }
        }

        @media (max-width: 768px) {
          .nav-container {
            padding: 0 16px;
          }

          .logo-text {
            display: none;
          }

          .nav-actions {
            gap: 8px;
          }

          .nav-btn {
            padding: 6px 12px;
            font-size: 13px;
          }
        }
      `}</style>
    </nav>
  );
};

export default NavBar;
