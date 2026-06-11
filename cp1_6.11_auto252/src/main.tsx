import React, { useState, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import SandScape from './components/SandScape';
import Controls from './components/Controls';
import { ControlState } from './utils/particleSystem';

const App: React.FC = () => {
  const [controls, setControls] = useState<ControlState>({
    windDirection: Math.random() * 360,
    windSpeed: 3,
    humidity: 45,
  });

  const handleControlsChange = useCallback((newControls: ControlState) => {
    setControls(newControls);
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <SandScape controls={controls} />
      <Controls controls={controls} onControlsChange={handleControlsChange} />
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
