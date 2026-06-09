import React from 'react';

interface ProgressBarProps {
  progress: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress }) => {
  return (
    <div className="progress-bar">
      <div
        className="progress-bar__fill"
        style={{ transform: `scaleX(${progress / 100})` }}
      />
    </div>
  );
};

export default ProgressBar;
