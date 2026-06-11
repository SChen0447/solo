import React, { useEffect, useState } from 'react';

interface TimerProps {
  isRunning: boolean;
  resetKey: number;
}

const Timer: React.FC<TimerProps> = ({ isRunning, resetKey }) => {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    setSeconds(0);
  }, [resetKey]);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  return <div className="timer">{mm}:{ss}</div>;
};

export default Timer;
