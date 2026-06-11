import React from 'react';
import { EnvParams } from './SpriteManager';

interface EnvControlsProps {
  env: EnvParams;
  onEnvChange: (env: EnvParams) => void;
  shrimpHealths: number[];
  averageHealth: number;
  symbiosisSuccess: boolean;
}

const sliderStyle: React.CSSProperties = {
  position: 'relative',
  width: '200px',
  height: '24px',
  marginBottom: '20px',
  display: 'flex',
  alignItems: 'center',
  gap: '12px'
};

const trackStyle: React.CSSProperties = {
  flex: 1,
  height: '6px',
  borderRadius: '3px',
  background: 'linear-gradient(to right, #1a3a5c, #ff8c00)',
  position: 'relative',
  cursor: 'pointer'
};

const fillStyle = (percentage: number): React.CSSProperties => ({
  position: 'absolute',
  left: 0,
  top: 0,
  height: '100%',
  width: `${percentage}%`,
  borderRadius: '3px',
  background: 'linear-gradient(to right, #1a3a5c, #ff8c00)',
  opacity: 0.8
});

const thumbStyle: React.CSSProperties = {
  position: 'absolute',
  top: '50%',
  transform: 'translate(-50%, -50%)',
  width: '20px',
  height: '20px',
  borderRadius: '50%',
  background: 'radial-gradient(circle, #ffffff 0%, #ff8c00 50%, #ff4500 100%)',
  boxShadow: '0 0 15px rgba(255, 140, 0, 0.8), 0 0 30px rgba(255, 69, 0, 0.4)',
  cursor: 'grab',
  zIndex: 2,
  userSelect: 'none'
};

const labelStyle: React.CSSProperties = {
  color: '#a0d8ef',
  fontSize: '13px',
  fontWeight: 500,
  minWidth: '70px'
};

const valueStyle: React.CSSProperties = {
  color: '#ff8c00',
  fontSize: '13px',
  fontWeight: 600,
  minWidth: '55px',
  textAlign: 'right'
};

const panelStyle: React.CSSProperties = {
  position: 'fixed',
  right: '20px',
  bottom: '20px',
  padding: '24px',
  background: 'rgba(26, 58, 92, 0.4)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  borderRadius: '16px',
  border: '1px solid rgba(255, 140, 0, 0.3)',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
  zIndex: 100,
  minWidth: '320px'
};

const titleStyle: React.CSSProperties = {
  color: '#ff8c00',
  fontSize: '16px',
  fontWeight: 600,
  marginBottom: '16px',
  textShadow: '0 0 10px rgba(255, 140, 0, 0.5)',
  display: 'flex',
  alignItems: 'center',
  gap: '8px'
};

const statusPanelStyle: React.CSSProperties = {
  marginTop: '16px',
  paddingTop: '16px',
  borderTop: '1px solid rgba(255, 140, 0, 0.2)'
};

const statusRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '10px',
  fontSize: '12px'
};

const healthBarContainerStyle: React.CSSProperties = {
  flex: 1,
  height: '8px',
  background: 'rgba(0, 0, 0, 0.3)',
  borderRadius: '4px',
  overflow: 'hidden',
  marginLeft: '10px'
};

const healthBarStyle = (health: number): React.CSSProperties => {
  let color = '#ff4444';
  if (health >= 80) color = '#00e676';
  else if (health >= 50) color = '#ffc107';

  return {
    height: '100%',
    width: `${health}%`,
    background: `linear-gradient(90deg, ${color}, ${color}aa)`,
    borderRadius: '4px',
    transition: 'width 0.3s ease, background 0.3s ease',
    boxShadow: `0 0 8px ${color}66`
  };
};

const symbiosisSuccessStyle: React.CSSProperties = {
  marginTop: '12px',
  padding: '12px',
  background: 'rgba(0, 230, 118, 0.15)',
  border: '1px solid rgba(0, 230, 118, 0.5)',
  borderRadius: '8px',
  color: '#00e676',
  fontSize: '13px',
  fontWeight: 600,
  textAlign: 'center',
  animation: 'pulse 1.5s ease-in-out infinite'
};

export const EnvControls: React.FC<EnvControlsProps> = ({
  env,
  onEnvChange,
  shrimpHealths,
  averageHealth,
  symbiosisSuccess
}) => {
  const handleSliderChange = (key: keyof EnvParams, value: number) => {
    onEnvChange({ ...env, [key]: value });
  };

  const Slider: React.FC<{
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    unit: string;
    keyName: keyof EnvParams;
    optimal: [number, number];
  }> = ({ label, value, min, max, step, unit, keyName, optimal }) => {
    const percentage = ((value - min) / (max - min)) * 100;
    const isOptimal = value >= optimal[0] && value <= optimal[1];

    const handleMouseDown = (e: React.MouseEvent) => {
      e.preventDefault();
      const track = e.currentTarget as HTMLElement;
      const rect = track.getBoundingClientRect();

      const updateValue = (clientX: number) => {
        const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
        const ratio = x / rect.width;
        const newValue = min + ratio * (max - min);
        const steppedValue = Math.round(newValue / step) * step;
        handleSliderChange(keyName, Math.max(min, Math.min(max, steppedValue)));
      };

      updateValue(e.clientX);

      const handleMouseMove = (moveEvent: MouseEvent) => {
        updateValue(moveEvent.clientX);
      };

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    };

    const handleTouchStart = (e: React.TouchEvent) => {
      e.preventDefault();
      const track = e.currentTarget as HTMLElement;
      const rect = track.getBoundingClientRect();

      const updateValue = (clientX: number) => {
        const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
        const ratio = x / rect.width;
        const newValue = min + ratio * (max - min);
        const steppedValue = Math.round(newValue / step) * step;
        handleSliderChange(keyName, Math.max(min, Math.min(max, steppedValue)));
      };

      updateValue(e.touches[0].clientX);

      const handleTouchMove = (moveEvent: TouchEvent) => {
        updateValue(moveEvent.touches[0].clientX);
      };

      const handleTouchEnd = () => {
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };

      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
    };

    return (
      <div style={sliderStyle}>
        <span style={labelStyle}>{label}</span>
        <div
          style={trackStyle}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          <div style={fillStyle(percentage)} />
          <div
            style={{
              ...thumbStyle,
              left: `${percentage}%`
            }}
          />
        </div>
        <span style={{
          ...valueStyle,
          color: isOptimal ? '#00e676' : '#ff8c00'
        }}>
          {value.toFixed(keyName === 'sulfide' ? 2 : 1)}{unit}
        </span>
      </div>
    );
  };

  return (
    <div style={panelStyle}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
      <div style={titleStyle}>
        <span>🔬</span>
        <span>深海环境控制台</span>
      </div>

      <Slider
        label="温度"
        value={env.temperature}
        min={20}
        max={80}
        step={0.5}
        unit="°C"
        keyName="temperature"
        optimal={[35, 40]}
      />

      <Slider
        label="pH值"
        value={env.ph}
        min={5.0}
        max={9.0}
        step={0.1}
        unit=""
        keyName="ph"
        optimal={[6.5, 7.0]}
      />

      <Slider
        label="硫化物"
        value={env.sulfide}
        min={0}
        max={0.6}
        step={0.01}
        unit="mmol/L"
        keyName="sulfide"
        optimal={[0.1, 0.3]}
      />

      <div style={statusPanelStyle}>
        <div style={statusRowStyle}>
          <span style={{ color: '#a0d8ef', minWidth: '80px' }}>盲虾数量</span>
          <span style={{ color: '#ffffff', fontWeight: 600 }}>{shrimpHealths.length} 只</span>
        </div>
        <div style={statusRowStyle}>
          <span style={{ color: '#a0d8ef', minWidth: '80px' }}>平均健康</span>
          <span style={{
            color: averageHealth >= 80 ? '#00e676' : averageHealth >= 50 ? '#ffc107' : '#ff4444',
            fontWeight: 600
          }}>
            {averageHealth.toFixed(1)}%
          </span>
        </div>

        <div style={{ marginTop: '12px' }}>
          <div style={{ color: '#a0d8ef', fontSize: '12px', marginBottom: '8px' }}>
            各盲虾菌毯健康度：
          </div>
          {shrimpHealths.map((health, index) => (
            <div key={index} style={{ ...statusRowStyle, marginBottom: '6px' }}>
              <span style={{ color: '#88aacc', minWidth: '45px', fontSize: '11px' }}>
                #{index + 1}
              </span>
              <div style={healthBarContainerStyle}>
                <div style={healthBarStyle(health)} />
              </div>
              <span style={{
                color: health >= 80 ? '#00e676' : health >= 50 ? '#ffc107' : '#ff4444',
                minWidth: '38px',
                textAlign: 'right',
                fontSize: '11px',
                fontWeight: 600
              }}>
                {health.toFixed(0)}%
              </span>
            </div>
          ))}
        </div>

        {symbiosisSuccess && (
          <div style={symbiosisSuccessStyle}>
            ✨ 共生群落建立成功！ ✨
          </div>
        )}

        <div style={{
          marginTop: '16px',
          padding: '10px',
          background: 'rgba(0, 0, 0, 0.2)',
          borderRadius: '8px',
          fontSize: '11px',
          color: '#7a9abf',
          lineHeight: 1.6
        }}>
          <div style={{ color: '#a0d8ef', marginBottom: '4px', fontWeight: 500 }}>
            🎯 最优参数范围：
          </div>
          温度 35-40°C | pH 6.5-7.0 | 硫化物 0.1-0.3 mmol/L
          <br />
          让3只以上盲虾菌毯健康度达到100%触发共生成功！
        </div>
      </div>
    </div>
  );
};

export default EnvControls;
