import React from 'react';

interface FPSCounterProps {
  fps: number;
}

const FPSCounter: React.FC<FPSCounterProps> = ({ fps }) => {
  return <div className="fps-counter">FPS: {fps}</div>;
};

export default FPSCounter;
