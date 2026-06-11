import React from 'react';
import GameBoard from './GameBoard';

const App: React.FC = () => {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: 'radial-gradient(ellipse at center, #0b0c27 0%, #1c133a 100%)',
        overflow: 'hidden',
      }}
    >
      <GameBoard />
    </div>
  );
};

export default App;
