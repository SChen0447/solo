import React from 'react';
import { useApp } from '../context/AppContext';

const CollectorPanel: React.FC = () => {
  const { state, collectedCount, isAllCollected, startMix, setActiveFragment } = useApp();
  const totalSlots = 8;

  const slots = [];
  for (let i = 0; i < totalSlots; i++) {
    const fragment = state.fragments[i];
    if (fragment && fragment.collected) {
      const color = `hsl(${fragment.hue}, 80%, 65%)`;
      slots.push(
        <div
          key={fragment.id}
          className="fragment-icon"
          style={{ background: color, color }}
          onClick={() => setActiveFragment(fragment.id)}
        >
          <span className="icon-label">{fragment.title}</span>
        </div>
      );
    } else {
      slots.push(
        <div key={`empty-${i}`} className="collector-slot">
          {i + 1}
        </div>
      );
    }
  }

  return (
    <div className={`collector-panel ${isAllCollected ? 'complete' : ''}`}>
      <div className="collector-title">
        <span className="collector-icon" />
        <span>灵感收集瓶 ({collectedCount}/8)</span>
      </div>
      <div className="collector-grid">{slots}</div>
      {isAllCollected && (
        <button className="play-mix-btn" onClick={startMix}>
          ✨ 混音播放
        </button>
      )}
    </div>
  );
};

export default CollectorPanel;
