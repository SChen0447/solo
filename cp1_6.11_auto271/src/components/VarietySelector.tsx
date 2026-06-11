import React from 'react';
import { TeaVariety, TeaVarietyConfig } from '../FermentationEngine';

interface VarietySelectorProps {
  varieties: TeaVarietyConfig[];
  selected: TeaVariety;
  onSelect: (variety: TeaVariety) => void;
  disabled?: boolean;
}

const VarietySelector: React.FC<VarietySelectorProps> = ({
  varieties,
  selected,
  onSelect,
  disabled = false
}) => {
  return (
    <div className="panel-section">
      <h3 className="panel-title">茶品选择</h3>
      <div className="variety-cards">
        {varieties.map(variety => (
          <div
            key={variety.id}
            className={`variety-card ${selected === variety.id ? 'active' : ''}`}
            onClick={() => !disabled && onSelect(variety.id)}
            style={{ opacity: disabled && selected !== variety.id ? 0.5 : 1 }}
          >
            <div className="variety-name">{variety.name}</div>
            <div className="variety-desc">{variety.description}</div>
            <div className="variety-color-preview">
              <div
                className="color-dot"
                style={{
                  backgroundColor: `rgb(${variety.initialColor.r}, ${variety.initialColor.g}, ${variety.initialColor.b})`
                }}
              />
              <span className="color-arrow">→</span>
              <div
                className="color-dot"
                style={{
                  backgroundColor: `rgb(${variety.finalColor.r}, ${variety.finalColor.g}, ${variety.finalColor.b})`
                }}
              />
              <span style={{ fontSize: '11px', color: 'var(--color-text-light)', marginLeft: '4px' }}>
                {variety.fermentationDays}天
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VarietySelector;
