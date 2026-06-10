import React, { memo } from 'react';
import { IconData, DetectionResult } from './types';

interface StyleDetectorProps {
  icons: IconData[];
  detectionResult: DetectionResult | null;
  onDetect: () => void;
}

const StyleDetector: React.FC<StyleDetectorProps> = memo(({ icons, detectionResult, onDetect }) => {
  const detectButtonStyle: React.CSSProperties = {
    backgroundColor: '#e53935',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 20px',
    fontFamily: 'monospace',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  };

  const resultContainerStyle: React.CSSProperties = {
    marginTop: '12px',
    padding: '12px',
    borderRadius: '12px',
    backgroundColor: '#1a1b26',
    maxWidth: '600px'
  };

  const listStyle: React.CSSProperties = {
    listStyle: 'none',
    padding: 0,
    margin: 0
  };

  const listItemStyle: React.CSSProperties = {
    padding: '4px 0',
    color: '#8888aa',
    fontFamily: 'monospace',
    fontSize: '13px'
  };

  const sectionTitleStyle: React.CSSProperties = {
    color: '#ff9800',
    marginBottom: '8px',
    fontFamily: 'monospace',
    fontWeight: 'bold',
    fontSize: '14px'
  };

  return (
    <div>
      <button style={detectButtonStyle} onClick={onDetect} disabled={icons.length === 0}>
        检测风格
      </button>

      {detectionResult && (
        <div style={resultContainerStyle}>
          {detectionResult.lineWidthVarianceIndices.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <div style={sectionTitleStyle}>
                ⚠️ 线条粗细方差异常 ({detectionResult.lineWidthVarianceIndices.length}个)
              </div>
              <ul style={listStyle}>
                {detectionResult.lineWidthVarianceIndices.map((idx) => (
                  <li key={`lw-${idx}`} style={listItemStyle}>
                    图标 #{idx + 1}: {icons[idx]?.fileName}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {detectionResult.emptyFillIndices.length > 0 && (
            <div>
              <div style={sectionTitleStyle}>
                ⚠️ 填充为空 ({detectionResult.emptyFillIndices.length}个)
              </div>
              <ul style={listStyle}>
                {detectionResult.emptyFillIndices.map((idx) => (
                  <li key={`ef-${idx}`} style={listItemStyle}>
                    图标 #{idx + 1}: {icons[idx]?.fileName}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {detectionResult.lineWidthVarianceIndices.length === 0 &&
            detectionResult.emptyFillIndices.length === 0 && (
              <div style={{ color: '#4caf50', fontFamily: 'monospace' }}>
                ✅ 所有图标风格一致性检测通过
              </div>
            )}
        </div>
      )}
    </div>
  );
});

StyleDetector.displayName = 'StyleDetector';

export default StyleDetector;
