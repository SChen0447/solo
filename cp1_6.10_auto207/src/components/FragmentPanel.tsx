import React from 'react';
import { useApp } from '../context/AppContext';

interface FragmentPanelProps {
  fragmentId: string;
  onClose: () => void;
}

const FragmentPanel: React.FC<FragmentPanelProps> = ({ fragmentId, onClose }) => {
  const { getFragmentById } = useApp();
  const fragment = getFragmentById(fragmentId);

  if (!fragment) return null;

  const color = `hsl(${fragment.hue}, 80%, 60%)`;

  return (
    <div className="fragment-panel" onClick={(e) => e.stopPropagation()}>
      <button className="panel-close" onClick={onClose}>×</button>
      <div className="panel-color-dot" style={{ background: color, color }} />
      <h2 className="panel-title">{fragment.title}</h2>
      <p className="panel-content">{fragment.content}</p>
    </div>
  );
};

export default FragmentPanel;
