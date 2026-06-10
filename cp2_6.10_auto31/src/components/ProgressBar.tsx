import { useState, useEffect } from 'react';

interface ProgressBarProps {
  pledgedAmount: number;
  goalAmount: number;
  showLabel?: boolean;
  height?: number;
}

export default function ProgressBar({
  pledgedAmount,
  goalAmount,
  showLabel = true,
  height = 12
}: ProgressBarProps) {
  const [showCelebration, setShowCelebration] = useState(false);
  const percentage = Math.min((pledgedAmount / goalAmount) * 100, 100);
  const displayPercentage = percentage.toFixed(1);

  useEffect(() => {
    if (percentage >= 100) {
      setShowCelebration(true);
      const timer = setTimeout(() => setShowCelebration(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [percentage]);

  return (
    <div style={{ width: '100%', position: 'relative' }}>
      <div
        style={{
          width: '100%',
          height: `${height}px`,
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '999px',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${percentage}%`,
            background: 'linear-gradient(90deg, #ff6b6b 0%, #7c5cfc 50%, #4ecdc4 100%)',
            borderRadius: '999px',
            transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: percentage > 0 ? '0 0 10px rgba(124, 92, 252, 0.5)' : 'none'
          }}
        />
        {showCelebration && (
          <>
            {Array.from({ length: 8 }).map((_, i) => (
              <span
                key={i}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: `${percentage}%`,
                  transform: 'translate(-50%, -50%)',
                  fontSize: '14px',
                  animation: `star-fly-${i % 4} 2s ease-out forwards`,
                  pointerEvents: 'none'
                }}
              >
                ✦
              </span>
            ))}
          </>
        )}
      </div>
      {showLabel && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '8px',
          fontSize: '13px',
          color: 'rgba(255, 255, 255, 0.7)'
        }}>
          <span>¥{pledgedAmount.toLocaleString()} 已筹集</span>
          <span style={{ color: '#4ecdc4', fontWeight: 600 }}>{displayPercentage}%</span>
        </div>
      )}
      <style>{`
        @keyframes star-fly-0 {
          0% { transform: translate(-50%, -50%) scale(0) rotate(0deg); opacity: 1; }
          100% { transform: translate(-150%, -120%) scale(1.5) rotate(360deg); opacity: 0; }
        }
        @keyframes star-fly-1 {
          0% { transform: translate(-50%, -50%) scale(0) rotate(0deg); opacity: 1; }
          100% { transform: translate(50%, -150%) scale(1.5) rotate(-360deg); opacity: 0; }
        }
        @keyframes star-fly-2 {
          0% { transform: translate(-50%, -50%) scale(0) rotate(0deg); opacity: 1; }
          100% { transform: translate(-200%, 80%) scale(1.5) rotate(720deg); opacity: 0; }
        }
        @keyframes star-fly-3 {
          0% { transform: translate(-50%, -50%) scale(0) rotate(0deg); opacity: 1; }
          100% { transform: translate(100%, 100%) scale(1.5) rotate(-720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
