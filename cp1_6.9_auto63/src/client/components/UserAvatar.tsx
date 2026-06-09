import React from 'react';

interface Props {
  letter: string;
  color: string;
  size?: number;
  className?: string;
}

export const UserAvatar: React.FC<Props> = ({ letter, color, size = 40, className = '' }) => {
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: color,
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 600,
        fontSize: size * 0.4,
        flexShrink: 0
      }}
    >
      {letter}
    </div>
  );
};
