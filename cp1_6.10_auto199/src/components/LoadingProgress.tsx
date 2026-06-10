import { useEffect, useState } from 'react';

interface LoadingProgressProps {
  duration?: number;
  onComplete?: () => void;
}

export default function LoadingProgress({ duration = 1500, onComplete }: LoadingProgressProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const startTime = performance.now();
    let frame: number;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      setProgress(Math.round(t * 100));
      if (t < 1) {
        frame = requestAnimationFrame(animate);
      } else {
        onComplete?.();
      }
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [duration, onComplete]);

  const bgStyle = {
    background: `linear-gradient(90deg, #7c5cbf 0%, #4a90d9 ${progress}%, rgba(255,255,255,0.1) ${progress}%)`
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      <div style={{
        fontSize: 28,
        fontWeight: 300,
        color: '#f5f0e8',
        letterSpacing: 4,
        marginBottom: 40
      }}>
        虚拟策展人
      </div>
      <div style={{
        width: 280,
        height: 6,
        borderRadius: 3,
        background: 'rgba(255,255,255,0.1)',
        overflow: 'hidden',
        marginBottom: 16
      }}>
        <div style={{
          width: '100%',
          height: '100%',
          ...bgStyle,
          transition: 'background 0.05s linear'
        }} />
      </div>
      <div style={{
        fontSize: 14,
        color: 'rgba(245,240,232,0.7)',
        fontVariantNumeric: 'tabular-nums'
      }}>
        {progress}%
      </div>
    </div>
  );
}
