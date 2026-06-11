import { useState, useMemo, useCallback } from 'react';
import TimeMap from './components/TimeMap';
import TimeDetail from './components/TimeDetail';
import { generateAnchors } from './data/mockData';
import { AnchorPoint } from './types';

function App() {
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  const [flyToCoords, setFlyToCoords] = useState<{ lat: number; lng: number } | null>(null);

  const anchors = useMemo<AnchorPoint[]>(() => generateAnchors(), []);

  const handleAnchorSelect = useCallback((cityId: string, lat: number, lng: number) => {
    setFlyToCoords({ lat, lng });
    setTimeout(() => {
      setSelectedCityId(cityId);
    }, 800);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedCityId(null);
    setFlyToCoords(null);
  }, []);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">时空旅行灵感探索</h1>
        <p className="app-subtitle">点击地图上的锚点，探索平行时空中的城市故事</p>
      </header>

      <TimeMap
        anchors={anchors}
        onAnchorSelect={handleAnchorSelect}
        flyToCoords={flyToCoords}
      />

      <TimeDetail
        cityId={selectedCityId}
        onClose={handleCloseDetail}
      />
    </div>
  );
}

export default App;
