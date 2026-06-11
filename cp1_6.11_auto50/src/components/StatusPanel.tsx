import React, { useEffect, useState } from 'react';
import { FaUtensils, FaSmile, FaTint, FaBolt } from 'react-icons/fa';
import { StateValues, StateKey, STATE_KEY_TO_NAME } from '../types';
import { getBarColor } from '../pet';

interface StatusPanelProps {
  states: StateValues;
  recoveryStates: Set<StateKey>;
}

interface StatusBarProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  isRecovering: boolean;
}

const StatusBar: React.FC<StatusBarProps> = ({ label, value, icon, isRecovering }) => {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    let frame: number;
    const startValue = displayValue;
    const endValue = value;
    const duration = 300;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (endValue - startValue) * easeProgress;
      setDisplayValue(Math.round(current));

      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      }
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  const barColor = getBarColor(value);

  return (
    <div className="status-item">
      <div className="status-header">
        <span className="status-label">
          {icon}
          {label}
        </span>
        <span className="status-value" style={{ color: barColor }}>
          {displayValue}
        </span>
      </div>
      <div className="status-bar-container">
        <div
          className={`status-bar ${isRecovering ? 'recovering' : ''}`}
          style={{
            width: `${value}%`,
            backgroundColor: barColor,
            transition: isRecovering ? 'width 0.5s ease' : undefined,
          }}
        />
      </div>
    </div>
  );
};

const statusIcons: Record<StateKey, React.ReactNode> = {
  [StateKey.HUNGER]: <FaUtensils />,
  [StateKey.HAPPINESS]: <FaSmile />,
  [StateKey.CLEANLINESS]: <FaTint />,
  [StateKey.ENERGY]: <FaBolt />,
};

const StatusPanel: React.FC<StatusPanelProps> = ({ states, recoveryStates }) => {
  return (
    <div className="panel status-panel">
      <h2 className="panel-title">宠物状态</h2>
      {(Object.keys(StateKey) as string[]).map((key) => {
        const stateKey = key as StateKey;
        return (
          <StatusBar
            key={stateKey}
            label={STATE_KEY_TO_NAME[stateKey]}
            value={states[stateKey]}
            icon={statusIcons[stateKey]}
            isRecovering={recoveryStates.has(stateKey)}
          />
        );
      })}
    </div>
  );
};

export default React.memo(StatusPanel);
