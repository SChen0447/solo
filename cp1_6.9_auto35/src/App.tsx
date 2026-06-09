import React, { useState, useEffect, useCallback, useMemo } from 'react';
import GestureGrid, { LineStyle } from './components/GestureGrid';
import StatusPanel, { StatusType } from './components/StatusPanel';
import { patternStorage, MAX_ERROR_ATTEMPTS } from './utils/patternStorage';

type AppMode = 'setup-first' | 'setup-confirm' | 'unlock' | 'success';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>('unlock');
  const [firstPattern, setFirstPattern] = useState<number[] | null>(null);
  const [lineStyle, setLineStyle] = useState<LineStyle>('default');
  const [showRipple, setShowRipple] = useState(false);
  const [shake, setShake] = useState(false);
  const [resetTrigger, setResetTrigger] = useState(0);
  const [message, setMessage] = useState('请绘制你的解锁图案');
  const [statusType, setStatusType] = useState<StatusType>('unlock');
  const [errorCount, setErrorCount] = useState(0);
  const [lockRemainingSeconds, setLockRemainingSeconds] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');

  const generateRandomPassword = useCallback(() => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }, []);

  useEffect(() => {
    const hasPattern = patternStorage.hasPattern();
    if (!hasPattern) {
      setMode('setup-first');
      setMessage('请绘制你的解锁图案（至少4个点）');
      setStatusType('setup');
    } else {
      setMode('unlock');
      setMessage('请绘制图案解锁');
      setStatusType('unlock');
    }
    setErrorCount(patternStorage.getErrorCount());
    checkLockStatus();
  }, []);

  const checkLockStatus = useCallback(() => {
    if (patternStorage.isLocked()) {
      setIsLocked(true);
      setStatusType('locked');
      setLockRemainingSeconds(patternStorage.getLockRemainingSeconds());
    }
  }, []);

  useEffect(() => {
    if (!isLocked) return;
    const timer = setInterval(() => {
      const remaining = patternStorage.getLockRemainingSeconds();
      setLockRemainingSeconds(remaining);
      if (remaining <= 0) {
        setIsLocked(false);
        setErrorCount(0);
        if (mode === 'unlock') {
          setStatusType('unlock');
          setMessage('请绘制图案解锁');
        } else {
          setStatusType('setup');
          setMessage('请绘制你的解锁图案（至少4个点）');
        }
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [isLocked, mode]);

  const resetGridVisual = useCallback((delay: number = 800) => {
    setTimeout(() => {
      setLineStyle('default');
      setShowRipple(false);
      setShake(false);
      setResetTrigger(prev => prev + 1);
    }, delay);
  }, []);

  const handlePatternComplete = useCallback((pattern: number[]) => {
    if (isLocked) return;

    switch (mode) {
      case 'setup-first':
        setFirstPattern(pattern);
        setLineStyle('dashed-blue');
        setMessage('再次绘制以确认图案');
        setStatusType('setup');
        setMode('setup-confirm');
        resetGridVisual(1500);
        break;

      case 'setup-confirm':
        if (firstPattern && pattern.length === firstPattern.length && 
            pattern.every((v, i) => v === firstPattern[i])) {
          patternStorage.savePattern(pattern);
          setLineStyle('solid-green');
          setShowRipple(true);
          setMessage('图案设置成功！');
          setStatusType('success');
          setTimeout(() => {
            setMode('unlock');
            setMessage('请绘制图案解锁');
            setStatusType('unlock');
            setFirstPattern(null);
            resetGridVisual(500);
          }, 1500);
        } else {
          setLineStyle('solid-red');
          setShake(true);
          setMessage('两次图案不一致，请重新绘制');
          setStatusType('warning');
          setFirstPattern(null);
          setMode('setup-first');
          resetGridVisual(800);
          setTimeout(() => {
            setMessage('请绘制你的解锁图案（至少4个点）');
            setStatusType('setup');
          }, 800);
        }
        break;

      case 'unlock':
        if (patternStorage.verifyPattern(pattern)) {
          patternStorage.resetErrorCount();
          setErrorCount(0);
          setLineStyle('solid-green');
          setShowRipple(true);
          setMessage('解锁成功！');
          setStatusType('success');
          setGeneratedPassword(generateRandomPassword());
          setTimeout(() => {
            setMode('success');
            resetGridVisual(200);
          }, 1000);
        } else {
          const newErrorCount = patternStorage.incrementErrorCount();
          setErrorCount(newErrorCount);
          setLineStyle('solid-red');
          setShake(true);
          
          if (newErrorCount >= MAX_ERROR_ATTEMPTS) {
            setIsLocked(true);
            setStatusType('locked');
            setLockRemainingSeconds(patternStorage.getLockRemainingSeconds());
          } else {
            const remaining = MAX_ERROR_ATTEMPTS - newErrorCount;
            setMessage(`图案错误，剩余${remaining}次机会`);
            setStatusType('warning');
          }
          resetGridVisual(800);
        }
        break;
    }
  }, [mode, firstPattern, isLocked, resetGridVisual, generateRandomPassword]);

  const handleClearReset = useCallback(() => {
    setFirstPattern(null);
    setMode('setup-first');
    setLineStyle('default');
    setShowRipple(false);
    setShake(false);
    setResetTrigger(prev => prev + 1);
    setMessage('请绘制你的解锁图案（至少4个点）');
    setStatusType('setup');
  }, []);

  const handleBackToLock = useCallback(() => {
    setMode('unlock');
    setMessage('请绘制图案解锁');
    setStatusType('unlock');
    setLineStyle('default');
    setResetTrigger(prev => prev + 1);
  }, []);

  const handleResetAll = useCallback(() => {
    patternStorage.clearAll();
    setFirstPattern(null);
    setMode('setup-first');
    setLineStyle('default');
    setShowRipple(false);
    setShake(false);
    setResetTrigger(prev => prev + 1);
    setMessage('请绘制你的解锁图案（至少4个点）');
    setStatusType('setup');
    setErrorCount(0);
    setIsLocked(false);
  }, []);

  const isSetupMode = mode === 'setup-first' || mode === 'setup-confirm';

  const backgroundStyle = useMemo(() => ({
    background: mode === 'success' 
      ? 'radial-gradient(ellipse at center, #0b3d0b 0%, #0a2e0a 50%, #051a05 100%)'
      : 'radial-gradient(ellipse at center, #1a1a2e 0%, #16213e 50%, #0f0f1a 100%)'
  }), [mode]);

  return (
    <div className="app-container" style={backgroundStyle}>
      {mode !== 'success' ? (
        <div className="lock-screen">
          <div className="app-header">
            <h1 className="app-title">
              {isSetupMode ? '设置手势密码' : '手势解锁'}
            </h1>
          </div>

          <StatusPanel
            message={message}
            statusType={statusType}
            errorCount={errorCount}
            lockRemainingSeconds={lockRemainingSeconds}
            showProgress={false}
          />

          <div className="grid-wrapper">
            <GestureGrid
              onPatternComplete={handlePatternComplete}
              disabled={isLocked}
              lineStyle={lineStyle}
              showRipple={showRipple}
              shake={shake}
              resetTrigger={resetTrigger}
            />
          </div>

          <div className="bottom-actions">
            {mode === 'setup-confirm' && (
              <button className="action-btn secondary-btn" onClick={handleClearReset}>
                清除并重新设置
              </button>
            )}
            {mode === 'unlock' && patternStorage.hasPattern() && !isLocked && (
              <button className="action-btn secondary-btn" onClick={handleResetAll}>
                重置密码
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="success-screen">
          <div className="success-icon">
            <svg viewBox="0 0 52 52" className="success-svg">
              <circle
                className="success-circle"
                cx="26"
                cy="26"
                r="25"
                fill="none"
                stroke="#4ade80"
                strokeWidth="2"
              />
              <path
                className="success-check"
                fill="none"
                stroke="#4ade80"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14.1 27.2l7.1 7.2 16.7-16.8"
              />
            </svg>
          </div>
          
          <h2 className="success-title">解锁成功</h2>
          <p className="success-subtitle">欢迎回来，以下是你的安全内容</p>

          <div className="password-card">
            <div className="card-header">
              <div className="card-lock-icon">🔐</div>
              <span className="card-title">随机生成密码</span>
            </div>
            <div className="password-display">
              <span className="password-text">{generatedPassword}</span>
            </div>
            <div className="card-footer">
              <span className="card-hint">使用等宽字体显示，纸张纹理保护</span>
            </div>
          </div>

          <div className="success-actions">
            <button className="action-btn primary-btn" onClick={handleBackToLock}>
              返回锁定
            </button>
          </div>
        </div>
      )}

      <style>{`
        .app-container {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          transition: background 0.6s ease;
          position: relative;
          overflow: hidden;
        }

        .app-container::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: radial-gradient(circle at 20% 20%, rgba(255,169,77,0.05) 0%, transparent 50%),
                      radial-gradient(circle at 80% 80%, rgba(77,171,247,0.05) 0%, transparent 50%);
          pointer-events: none;
        }

        .lock-screen {
          width: 100%;
          max-width: 480px;
          padding: clamp(16px, 5vw, 32px);
          display: flex;
          flex-direction: column;
          align-items: center;
          z-index: 1;
        }

        .app-header {
          margin-bottom: clamp(8px, 3vw, 20px);
        }

        .app-title {
          font-size: clamp(20px, 6vw, 28px);
          font-weight: 600;
          color: #ffffff;
          text-align: center;
          letter-spacing: 2px;
          text-shadow: 0 2px 10px rgba(0,0,0,0.3);
        }

        .grid-wrapper {
          margin: clamp(20px, 5vw, 40px) 0;
          display: flex;
          justify-content: center;
        }

        .bottom-actions {
          margin-top: clamp(16px, 4vw, 32px);
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          justify-content: center;
        }

        .action-btn {
          padding: 10px 24px;
          border: none;
          border-radius: 8px;
          font-size: clamp(13px, 3.5vw, 15px);
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          letter-spacing: 0.5px;
        }

        .primary-btn {
          background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
          color: #ffffff;
          box-shadow: 0 4px 15px rgba(74, 222, 128, 0.3);
        }

        .primary-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(74, 222, 128, 0.4);
        }

        .primary-btn:active {
          transform: translateY(0);
        }

        .secondary-btn {
          background: rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.15);
        }

        .secondary-btn:hover {
          background: rgba(255, 255, 255, 0.12);
          color: #ffffff;
        }

        .success-screen {
          width: 100%;
          max-width: 480px;
          padding: clamp(16px, 5vw, 32px);
          display: flex;
          flex-direction: column;
          align-items: center;
          z-index: 1;
          animation: fadeInUp 0.6s ease-out;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .success-icon {
          width: clamp(70px, 20vw, 100px);
          height: clamp(70px, 20vw, 100px);
          margin-bottom: clamp(16px, 4vw, 28px);
        }

        .success-svg {
          width: 100%;
          height: 100%;
        }

        .success-circle {
          stroke-dasharray: 166;
          stroke-dashoffset: 166;
          animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
        }

        .success-check {
          stroke-dasharray: 48;
          stroke-dashoffset: 48;
          animation: stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.6s forwards;
        }

        @keyframes stroke {
          100% {
            stroke-dashoffset: 0;
          }
        }

        .success-title {
          font-size: clamp(22px, 6vw, 32px);
          font-weight: 600;
          color: #4ade80;
          margin-bottom: 8px;
          letter-spacing: 1px;
        }

        .success-subtitle {
          font-size: clamp(13px, 3.5vw, 16px);
          color: rgba(255, 255, 255, 0.6);
          margin-bottom: clamp(24px, 6vw, 40px);
        }

        .password-card {
          width: 100%;
          max-width: 360px;
          background: 
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 24px,
              rgba(0, 0, 0, 0.03) 24px,
              rgba(0, 0, 0, 0.03) 25px
            ),
            linear-gradient(135deg, #f5f0e1 0%, #e8dfc8 100%);
          border-radius: 12px;
          padding: 24px;
          box-shadow: 
            0 10px 40px rgba(0, 0, 0, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.5);
          position: relative;
          overflow: hidden;
        }

        .password-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image: 
            radial-gradient(circle at 15% 30%, rgba(139, 115, 85, 0.08) 0%, transparent 40%),
            radial-gradient(circle at 85% 70%, rgba(139, 115, 85, 0.06) 0%, transparent 40%);
          pointer-events: none;
        }

        .card-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
        }

        .card-lock-icon {
          font-size: 18px;
        }

        .card-title {
          font-size: 14px;
          color: #5d4e37;
          font-weight: 500;
        }

        .password-display {
          background: rgba(255, 255, 255, 0.5);
          border-radius: 8px;
          padding: 16px;
          text-align: center;
          border: 1px solid rgba(139, 115, 85, 0.15);
        }

        .password-text {
          font-family: 'Courier New', Courier, 'Monaco', monospace;
          font-size: clamp(20px, 6vw, 28px);
          font-weight: 700;
          color: #2d2a24;
          letter-spacing: 4px;
          word-break: break-all;
        }

        .card-footer {
          margin-top: 12px;
          text-align: center;
        }

        .card-hint {
          font-size: 12px;
          color: rgba(93, 78, 55, 0.6);
          font-style: italic;
        }

        .success-actions {
          margin-top: clamp(28px, 7vw, 48px);
        }
      `}</style>
    </div>
  );
};

export default App;
