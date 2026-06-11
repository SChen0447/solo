import React from 'react';
import { TeaState } from '../FermentationEngine';

interface TeaSoupDisplayProps {
  state: TeaState;
}

const TeaSoupDisplay: React.FC<TeaSoupDisplayProps> = ({ state }) => {
  return (
    <div className="soup-drop-container">
      <div
        className="soup-drop"
        style={{
          backgroundColor: state.teaSoupColorHex,
          opacity: state.teaSoupOpacity
        }}
      />
      <div className="soup-info">
        <h4>🍵 茶汤色泽</h4>
        <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
          {state.progress < 0.2 ? '浅淡透明' : state.progress < 0.5 ? '渐显汤色' : state.progress < 0.8 ? '色泽明亮' : '浓艳透亮'}
        </div>
        <div className="soup-progress">
          <div
            className="soup-progress-bar"
            style={{
              width: `${state.progress * 100}%`,
              backgroundColor: state.teaSoupColorHex
            }}
          />
        </div>
        <div style={{ fontSize: '12px', color: 'var(--color-text-light)', marginTop: '6px' }}>
          色值: {state.teaSoupColorHex}
        </div>
      </div>
    </div>
  );
};

export default TeaSoupDisplay;
