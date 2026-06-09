import React from 'react';

interface HeaderPanelProps {
  score: number;
  level: number;
  remainingBubbles: number;
  onReset: () => void;
  scorePulse: boolean;
}

const HeaderPanel: React.FC<HeaderPanelProps> = ({
  score,
  level,
  remainingBubbles,
  onReset,
  scorePulse,
}) => {
  const headerStyle: React.CSSProperties = {
    position: 'absolute',
    top: '10px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '800px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 20px',
    boxSizing: 'border-box',
    zIndex: 10,
    pointerEvents: 'none',
  };

  const scoreStyle: React.CSSProperties = {
    fontFamily: '"SimHei", "Microsoft YaHei", "黑体", sans-serif',
    fontSize: '48px',
    fontWeight: 'bold',
    color: '#ffffff',
    textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
    transform: scorePulse ? 'scale(1.2)' : 'scale(1)',
    transition: 'transform 0.2s ease-out',
  };

  const levelStyle: React.CSSProperties = {
    fontFamily: '"SimHei", "Microsoft YaHei", "黑体", sans-serif',
    fontSize: '24px',
    color: '#aaaaaa',
    textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
  };

  const infoContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '4px',
    pointerEvents: 'auto',
  };

  const remainingStyle: React.CSSProperties = {
    fontFamily: '"SimHei", "Microsoft YaHei", "黑体", sans-serif',
    fontSize: '18px',
    color: '#cccccc',
  };

  const resetButtonStyle: React.CSSProperties = {
    fontFamily: '"SimHei", "Microsoft YaHei", "黑体", sans-serif',
    fontSize: '16px',
    padding: '8px 20px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#ffffff',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  };

  return (
    <div style={headerStyle}>
      <div style={scoreStyle}>{score}</div>
      <div style={infoContainerStyle}>
        <div style={levelStyle}>第 {level} 关</div>
        <div style={remainingStyle}>剩余泡泡: {remainingBubbles}</div>
        <button style={resetButtonStyle} onClick={onReset}>
          重置关卡
        </button>
      </div>
    </div>
  );
};

export default HeaderPanel;
