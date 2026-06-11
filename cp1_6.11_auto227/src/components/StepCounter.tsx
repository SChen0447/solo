import React from 'react';

interface StepCounterProps {
  current: number;
  total: number;
}

const StepCounter: React.FC<StepCounterProps> = ({ current, total }) => {
  return (
    <div className="step-counter">
      第{current}/{total}步
    </div>
  );
};

export default StepCounter;
