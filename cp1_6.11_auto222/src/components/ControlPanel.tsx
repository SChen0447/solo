import React from 'react';

export interface TeaRecipe {
  id: string;
  name: string;
  description: string;
  params: {
    bubbleCount: number;
    minSize: number;
    maxSize: number;
    aggregation: number;
    pattern: string;
    concentration: string;
  };
}

interface ControlPanelProps {
  teaRecipes: TeaRecipe[];
  selectedRecipe: string;
  onSelectRecipe: (id: string) => void;
  temperature: number;
  onTemperatureChange: (v: number) => void;
  waterAmount: number;
  onWaterAmountChange: (v: number) => void;
  whiskSpeed: number;
  onWhiskSpeedChange: (v: number) => void;
  whiskAngle: number;
  onWhiskAngleChange: (v: number) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  teaRecipes,
  selectedRecipe,
  onSelectRecipe,
  temperature,
  onTemperatureChange,
  waterAmount,
  onWaterAmountChange,
  whiskSpeed,
  onWhiskSpeedChange,
  whiskAngle,
  onWhiskAngleChange
}) => {
  return (
    <div className="tea-card" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h3 className="ink-title" style={{ fontSize: '22px', marginBottom: '16px' }}>
          · 茶谱选择 ·
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {teaRecipes.map(recipe => (
            <button
              key={recipe.id}
              className={`tea-btn ${selectedRecipe === recipe.id ? 'active' : ''}`}
              onClick={() => onSelectRecipe(recipe.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                padding: '14px 8px',
                width: '100%'
              }}
            >
              <span style={{
                fontSize: '16px',
                fontWeight: 700,
                fontFamily: "'Ma Shan Zheng', cursive"
              }}>{recipe.name}</span>
              <span style={{
                fontSize: '11px',
                opacity: selectedRecipe === recipe.id ? 0.9 : 0.7,
                lineHeight: 1.4,
                textAlign: 'center'
              }}>{recipe.description}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="ink-title" style={{ fontSize: '22px', marginBottom: '16px' }}>
          · 煎茶参数 ·
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '8px',
              alignItems: 'center'
            }}>
              <label style={{ fontSize: '14px', fontWeight: 600 }}>
                🌡️ 水温
              </label>
              <span style={{
                fontSize: '14px',
                color: '#6b4423',
                fontWeight: 700,
                padding: '3px 10px',
                background: 'rgba(212, 160, 23, 0.12)',
                borderRadius: '8px',
                border: '1px solid rgba(212, 160, 23, 0.3)'
              }}>
                {temperature}°C
              </span>
            </div>
            <input
              type="range"
              min="40"
              max="100"
              value={temperature}
              onChange={(e) => onTemperatureChange(Number(e.target.value))}
              className="tea-slider"
            />
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '11px',
              opacity: 0.55,
              marginTop: '4px'
            }}>
              <span>温凉 40°</span>
              <span>微沸 70°</span>
              <span>鼎沸 100°</span>
            </div>
          </div>

          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '8px',
              alignItems: 'center'
            }}>
              <label style={{ fontSize: '14px', fontWeight: 600 }}>
                💧 注水量
              </label>
              <span style={{
                fontSize: '14px',
                color: '#6b4423',
                fontWeight: 700,
                padding: '3px 10px',
                background: 'rgba(212, 160, 23, 0.12)',
                borderRadius: '8px',
                border: '1px solid rgba(212, 160, 23, 0.3)'
              }}>
                {waterAmount} ml
              </span>
            </div>
            <input
              type="range"
              min="30"
              max="120"
              value={waterAmount}
              onChange={(e) => onWaterAmountChange(Number(e.target.value))}
              className="tea-slider"
            />
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '11px',
              opacity: 0.55,
              marginTop: '4px'
            }}>
              <span>少量 30ml</span>
              <span>适中 75ml</span>
              <span>盈满 120ml</span>
            </div>
          </div>

          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '8px',
              alignItems: 'center'
            }}>
              <label style={{ fontSize: '14px', fontWeight: 600 }}>
                🍃 击拂速度
              </label>
              <span style={{
                fontSize: '14px',
                color: '#6b4423',
                fontWeight: 700,
                padding: '3px 10px',
                background: 'rgba(212, 160, 23, 0.12)',
                borderRadius: '8px',
                border: '1px solid rgba(212, 160, 23, 0.3)'
              }}>
                {whiskSpeed} 次/分
              </span>
            </div>
            <input
              type="range"
              min="30"
              max="180"
              value={whiskSpeed}
              onChange={(e) => onWhiskSpeedChange(Number(e.target.value))}
              className="tea-slider"
            />
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '11px',
              opacity: 0.55,
              marginTop: '4px'
            }}>
              <span>徐缓 30</span>
              <span>疾徐 105</span>
              <span>骤急 180</span>
            </div>
          </div>

          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '8px',
              alignItems: 'center'
            }}>
              <label style={{ fontSize: '14px', fontWeight: 600 }}>
                📐 击拂角度
              </label>
              <span style={{
                fontSize: '14px',
                color: '#6b4423',
                fontWeight: 700,
                padding: '3px 10px',
                background: 'rgba(212, 160, 23, 0.12)',
                borderRadius: '8px',
                border: '1px solid rgba(212, 160, 23, 0.3)'
              }}>
                {whiskAngle}°
              </span>
            </div>
            <input
              type="range"
              min="-45"
              max="45"
              value={whiskAngle}
              onChange={(e) => onWhiskAngleChange(Number(e.target.value))}
              className="tea-slider"
            />
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '11px',
              opacity: 0.55,
              marginTop: '4px'
            }}>
              <span>左斜 45°</span>
              <span>中正 0°</span>
              <span>右斜 45°</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{
        padding: '14px 16px',
        background: 'linear-gradient(135deg, rgba(43, 77, 62, 0.08), rgba(212, 160, 23, 0.06))',
        borderRadius: '12px',
        border: '1px dashed rgba(212, 160, 23, 0.4)'
      }}>
        <p style={{
          fontSize: '12px',
          lineHeight: 1.8,
          color: '#3d2817',
          opacity: 0.8
        }}>
          <strong style={{ color: '#2b4d3e' }}>操作提示：</strong><br />
          · 在茶汤上<strong>按住右键</strong>拖动即可<strong>击拂</strong>出汤花<br />
          · 在汤花上<strong>按住左键</strong>拖动可<strong>涂抹</strong>露出茶汤底色<br />
          · 击拂越快越频繁，汤花越密集细腻
        </p>
      </div>
    </div>
  );
};

export default ControlPanel;
