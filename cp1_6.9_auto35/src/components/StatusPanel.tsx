import React from 'react';
import { MAX_ERROR_ATTEMPTS } from '../utils/patternStorage';

export type StatusType = 'setup' | 'unlock' | 'warning' | 'locked' | 'success';

interface StatusPanelProps {
  message: string;
  statusType: StatusType;
  errorCount: number;
  lockRemainingSeconds?: number;
  showProgress?: boolean;
}

const StatusPanel: React.FC<StatusPanelProps> = ({
  message,
  statusType,
  errorCount,
  lockRemainingSeconds = 0,
  showProgress = false
}) => {
  const getTextColor = () => {
    switch (statusType) {
      case 'setup':
        return '#4dabf7';
      case 'warning':
        return '#ffa94d';
      case 'locked':
        return '#ff6b6b';
      case 'success':
        return '#51cf66';
      case 'unlock':
      default:
        return '#ffffff';
    }
  };

  const textColor = getTextColor();

  return (
    <div className="status-panel">
      <div className="status-content">
        <div 
          className="status-message"
          style={{ color: textColor }}
        >
          {statusType === 'locked' ? (
            <div className="lock-countdown-wrapper">
              <span className="lock-label">已锁定，请等待</span>
              <span 
                key={lockRemainingSeconds}
                className="countdown-number flip-animation"
              >
                {lockRemainingSeconds}
              </span>
              <span className="lock-label">秒</span>
            </div>
          ) : (
            <>
              {showProgress && (
                <div className="progress-circle">
                  <svg className="progress-svg" viewBox="0 0 36 36">
                    <circle
                      className="progress-bg"
                      cx="18"
                      cy="18"
                      r="15.9"
                      fill="none"
                      stroke="rgba(255,255,255,0.1)"
                      strokeWidth="2"
                    />
                    <circle
                      className="progress-bar"
                      cx="18"
                      cy="18"
                      r="15.9"
                      fill="none"
                      stroke={textColor}
                      strokeWidth="2"
                      strokeDasharray="100, 100"
                      strokeLinecap="round"
                      style={{
                        animation: 'progress-spin 1.5s linear infinite',
                        transformOrigin: 'center'
                      }}
                    />
                  </svg>
                </div>
              )}
              <span>{message}</span>
            </>
          )}
        </div>
        {statusType !== 'locked' && statusType !== 'success' && (
          <div className="error-indicators">
            {Array.from({ length: MAX_ERROR_ATTEMPTS }, (_, i) => (
              <div
                key={i}
                className={`error-dot ${i < errorCount ? 'filled' : ''}`}
              />
            ))}
          </div>
        )}
      </div>

      <style>{`
        .status-panel {
          width: 100%;
          padding: clamp(12px, 3vw, 20px);
          display: flex;
          justify-content: center;
        }

        .status-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          min-height: 60px;
        }

        .status-message {
          font-size: clamp(14px, 4vw, 18px);
          font-weight: 500;
          text-align: center;
          letter-spacing: 0.5px;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: color 0.3s ease;
        }

        .progress-circle {
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .progress-svg {
          width: 100%;
          height: 100%;
        }

        @keyframes progress-spin {
          0% {
            stroke-dasharray: 1, 100;
            stroke-dashoffset: 0;
          }
          50% {
            stroke-dasharray: 50, 100;
            stroke-dashoffset: -35;
          }
          100% {
            stroke-dasharray: 1, 100;
            stroke-dashoffset: -100;
          }
        }

        .error-indicators {
          display: flex;
          gap: 8px;
        }

        .error-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          border: 1.5px solid rgba(255, 255, 255, 0.3);
          background: transparent;
          transition: all 0.3s ease;
        }

        .error-dot.filled {
          background: #ff6b6b;
          border-color: #ff6b6b;
          box-shadow: 0 0 8px rgba(255, 107, 107, 0.5);
        }

        .lock-countdown-wrapper {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .lock-label {
          font-size: clamp(12px, 3.5vw, 16px);
          opacity: 0.9;
        }

        .countdown-number {
          display: inline-block;
          font-size: clamp(28px, 8vw, 42px);
          font-weight: 700;
          color: #ff6b6b;
          min-width: 50px;
          text-align: center;
          text-shadow: 0 0 20px rgba(255, 107, 107, 0.5);
        }

        .flip-animation {
          animation: flip-in 0.4s ease-out;
        }

        @keyframes flip-in {
          0% {
            transform: rotateX(90deg);
            opacity: 0;
          }
          50% {
            transform: rotateX(-10deg);
          }
          100% {
            transform: rotateX(0deg);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default StatusPanel;
