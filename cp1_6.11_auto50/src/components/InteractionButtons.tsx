import React from 'react';
import { FaUtensils, FaGamepad, FaBath } from 'react-icons/fa';
import { InteractionType, INTERACTION_NAME } from '../types';

interface InteractionButtonsProps {
  onInteraction: (type: InteractionType) => void;
  disabled: boolean;
}

const interactionIcons: Record<InteractionType, React.ReactNode> = {
  [InteractionType.FEED]: <FaUtensils />,
  [InteractionType.PLAY]: <FaGamepad />,
  [InteractionType.CLEAN]: <FaBath />,
};

const InteractionButtons: React.FC<InteractionButtonsProps> = ({ onInteraction, disabled }) => {
  return (
    <div className="interaction-buttons">
      {(Object.keys(InteractionType) as string[]).map((key) => {
        const type = key as InteractionType;
        return (
          <button
            key={type}
            className="interaction-btn"
            onClick={() => onInteraction(type)}
            disabled={disabled}
          >
            {interactionIcons[type]}
            <span>{INTERACTION_NAME[type]}</span>
          </button>
        );
      })}
    </div>
  );
};

export default React.memo(InteractionButtons);
