import React from 'react';
import { RefreshCw } from 'lucide-react';

interface ResetButtonProps {
  onClick: () => void;
}

const ResetButton: React.FC<ResetButtonProps> = ({ onClick }) => {
  return (
    <button className="reset-btn" onClick={onClick} title="重置">
      <RefreshCw size={18} />
    </button>
  );
};

export default ResetButton;
