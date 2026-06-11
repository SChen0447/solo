import React from 'react';
import { PAPER_COLORS } from '../types';

interface ColorPickerProps {
  selectedColor: string;
  onSelectColor: (color: string) => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ selectedColor, onSelectColor }) => {
  return (
    <div className="color-picker">
      {PAPER_COLORS.map((item) => (
        <div
          key={item.color}
          className={`color-swatch ${selectedColor === item.color ? 'active' : ''}`}
          style={{ backgroundColor: item.color }}
          onClick={() => onSelectColor(item.color)}
        >
          <span className="color-tooltip">{item.name}</span>
        </div>
      ))}
    </div>
  );
};

export default ColorPicker;
