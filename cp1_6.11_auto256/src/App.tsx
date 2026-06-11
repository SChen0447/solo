import { useState, useCallback } from 'react';
import AuroraCanvas from './components/AuroraCanvas';
import ControlPanel from './components/ControlPanel';

const DEFAULT_GEO_INDEX = 3;
const DEFAULT_SOLAR_WIND = 30;

export default function App() {
  const [geomagneticIndex, setGeomagneticIndex] = useState(DEFAULT_GEO_INDEX);
  const [solarWindSpeed, setSolarWindSpeed] = useState(DEFAULT_SOLAR_WIND);
  const [resetTrigger, setResetTrigger] = useState(0);

  const handleReset = useCallback(() => {
    setGeomagneticIndex(DEFAULT_GEO_INDEX);
    setSolarWindSpeed(DEFAULT_SOLAR_WIND);
    setResetTrigger((prev) => prev + 1);
  }, []);

  return (
    <>
      <AuroraCanvas
        geomagneticIndex={geomagneticIndex}
        solarWindSpeed={solarWindSpeed}
        resetTrigger={resetTrigger}
      />
      <ControlPanel
        geomagneticIndex={geomagneticIndex}
        solarWindSpeed={solarWindSpeed}
        onGeomagneticChange={setGeomagneticIndex}
        onSolarWindChange={setSolarWindSpeed}
        onReset={handleReset}
      />
    </>
  );
}
