import { useState, useEffect, useCallback } from 'react';
import MapView from './components/MapView';
import GardenPanel from './components/GardenPanel';
import ObservationModal from './components/ObservationModal';
import type { Garden, Plant, HeatmapPoint } from './types';

function useIsDaytime() {
  const [isDay, setIsDay] = useState(() => {
    const h = new Date().getHours();
    return h >= 6 && h < 18;
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const h = new Date().getHours();
      setIsDay(h >= 6 && h < 18);
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  return isDay;
}

function formatTime() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function App() {
  const [gardens, setGardens] = useState<Garden[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [heatmapData, setHeatmapData] = useState<HeatmapPoint[]>([]);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [activeGardenId, setActiveGardenId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [highlightedPlantIds, setHighlightedPlantIds] = useState<string[]>([]);
  const [currentTime, setCurrentTime] = useState(formatTime());

  const isDay = useIsDaytime();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(formatTime()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetch('/api/gardens')
      .then((r) => r.json())
      .then((data: Garden[]) => setGardens(data))
      .catch((err) => console.error('加载温室列表失败:', err));

    fetch('/api/plants')
      .then((r) => r.json())
      .then((data: Plant[]) => setPlants(data))
      .catch((err) => console.error('加载植物列表失败:', err));
  }, []);

  useEffect(() => {
    if (!showHeatmap) {
      setHeatmapData([]);
      return;
    }
    fetch('/api/heatmap')
      .then((r) => r.json())
      .then((data: HeatmapPoint[]) => setHeatmapData(data))
      .catch((err) => console.error('加载热力图失败:', err));

    const timer = setInterval(() => {
      fetch('/api/heatmap')
        .then((r) => r.json())
        .then((data: HeatmapPoint[]) => setHeatmapData(data));
    }, 10000);
    return () => clearInterval(timer);
  }, [showHeatmap]);

  const handleGardenSelect = useCallback((gardenId: string) => {
    setActiveGardenId(gardenId);
  }, []);

  const handlePlantClick = useCallback((_plant: Plant) => {}, []);

  const handleAddObservation = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const handleSubmitObservation = useCallback(
    async (data: {
      plantId: string;
      description: string;
      mood: string;
      photo: string;
    }) => {
      const res = await fetch('/api/observations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!res.ok) {
        throw new Error('提交失败');
      }

      setHighlightedPlantIds((prev) => [...prev, data.plantId]);

      setTimeout(() => {
        setHighlightedPlantIds((prev) => prev.filter((id) => id !== data.plantId));
      }, 2500);
    },
    []
  );

  return (
    <div className="app-container">
      <MapView
        gardens={gardens}
        plants={plants}
        heatmapData={heatmapData}
        showHeatmap={showHeatmap}
        focusGardenId={activeGardenId}
        onPlantClick={handlePlantClick}
        highlightedPlantIds={highlightedPlantIds}
      />

      <div className={`top-bar ${isDay ? 'day' : 'night'}`}>
        <h1>🌳 数字花园导览平台</h1>
        <div className="top-bar-right">
          <span className="time-display">
            {isDay ? '☀️' : '🌙'} {currentTime}
          </span>
          <button
            className={`heatmap-toggle ${showHeatmap ? 'active' : ''}`}
            onClick={() => setShowHeatmap((s) => !s)}
            title={showHeatmap ? '关闭热力图' : '开启人流热力图'}
          >
            {showHeatmap ? '🔥' : '📍'}
          </button>
        </div>
      </div>

      <GardenPanel
        gardens={gardens}
        activeGardenId={activeGardenId}
        onGardenSelect={handleGardenSelect}
        onAddObservation={handleAddObservation}
      />

      <ObservationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        availablePlants={plants}
        onSubmit={handleSubmitObservation}
      />
    </div>
  );
}

export default App;
