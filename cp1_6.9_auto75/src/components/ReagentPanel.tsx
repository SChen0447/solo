import React from 'react';
import { REAGENTS, type ReagentId } from '../data/reactions';

interface ReagentPanelProps {
  selectedReagent: ReagentId | null;
  onSelectReagent: (id: ReagentId | null) => void;
}

const ReagentPanel: React.FC<ReagentPanelProps> = ({ selectedReagent, onSelectReagent }) => {
  return (
    <div className="reagent-panel">
      <h3>试剂架</h3>
      <div className="reagent-list">
        {REAGENTS.map(reagent => (
          <button
            key={reagent.id}
            className={`reagent-btn ${selectedReagent === reagent.id ? 'selected' : ''}`}
            onClick={() => onSelectReagent(selectedReagent === reagent.id ? null : reagent.id)}
          >
            <span
              className="reagent-color"
              style={{ backgroundColor: reagent.color }}
            />
            <span>{reagent.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ReagentPanel;
