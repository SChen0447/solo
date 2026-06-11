import { useState, useEffect, useRef, useCallback } from 'react';
import type { GardenSlot, PlantType, PlantParams, HealthStatus } from './types';
import { PLANT_CONFIGS } from './constants/plants';
import { calculateGrowth, determineHealthStatus, createPlant } from './utils/plantEngine';
import { exportGrowthLog } from './utils/exportLog';
import GardenGrid from './components/GardenGrid';
import PlantPanel from './components/PlantPanel';
import PlantSelector from './components/PlantSelector';
import ConfirmDialog from './components/ConfirmDialog';
import StatusBar from './components/StatusBar';

const FRAME_INTERVAL = 1000 / 30;
const HEALTH_CHECK_INTERVAL = 5000;

function createInitialSlots(): GardenSlot[] {
  return Array.from({ length: 9 }, (_, i) => ({
    id: i,
    plant: null,
  }));
}

export default function App() {
  const [slots, setSlots] = useState<GardenSlot[]>(createInitialSlots);
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [showPlantSelector, setShowPlantSelector] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [pendingSlotId, setPendingSlotId] = useState<number | null>(null);
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);

  const lastFrameTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>();
  const healthCheckIntervalRef = useRef<number>();

  const selectedSlot = selectedSlotId !== null ? slots[selectedSlotId] : null;
  const selectedPlant = selectedSlot?.plant ?? null;
  const hasPlants = slots.some((s) => s.plant !== null);

  const updatePlantHealth = useCallback(() => {
    setSlots((prevSlots) =>
      prevSlots.map((slot) => {
        if (!slot.plant) return slot;

        const config = PLANT_CONFIGS[slot.plant.type];
        const newHealthStatus = determineHealthStatus(slot.plant.params, config);

        if (newHealthStatus !== slot.plant.healthStatus) {
          return {
            ...slot,
            plant: {
              ...slot.plant,
              healthStatus: newHealthStatus,
              healthHistory: [
                ...slot.plant.healthHistory,
                {
                  status: newHealthStatus as HealthStatus,
                  timestamp: Date.now(),
                },
              ],
            },
          };
        }

        return slot;
      })
    );
  }, []);

  const updatePlantGrowth = useCallback(() => {
    const now = performance.now();
    if (now - lastFrameTimeRef.current < FRAME_INTERVAL) {
      return;
    }
    lastFrameTimeRef.current = now;

    setSlots((prevSlots) =>
      prevSlots.map((slot) => {
        if (!slot.plant) return slot;
        if (slot.plant.growth >= slot.plant.maxGrowth) return slot;

        const growthIncrement = calculateGrowth(slot.plant.params);
        const newGrowth = Math.min(slot.plant.maxGrowth, slot.plant.growth + growthIncrement);

        return {
          ...slot,
          plant: {
            ...slot.plant,
            growth: newGrowth,
          },
        };
      })
    );
  }, []);

  useEffect(() => {
    const gameLoop = () => {
      updatePlantGrowth();
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    healthCheckIntervalRef.current = window.setInterval(updatePlantHealth, HEALTH_CHECK_INTERVAL);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
      }
    };
  }, [updatePlantGrowth, updatePlantHealth]);

  const handleSlotClick = (slotId: number) => {
    const slot = slots[slotId];
    if (!slot.plant) {
      setPendingSlotId(slotId);
      setShowPlantSelector(true);
      setSelectedSlotId(null);
      setIsMobilePanelOpen(false);
    } else {
      setSelectedSlotId(slotId);
      setShowPlantSelector(false);
      setPendingSlotId(null);
      setIsMobilePanelOpen(true);
    }
  };

  const handlePlantSelect = (type: PlantType) => {
    if (pendingSlotId === null) return;

    const newPlant = createPlant(type);
    setSlots((prevSlots) =>
      prevSlots.map((slot) =>
        slot.id === pendingSlotId ? { ...slot, plant: newPlant } : slot
      )
    );
    setShowPlantSelector(false);
    setPendingSlotId(null);
    setSelectedSlotId(pendingSlotId);
    setIsMobilePanelOpen(true);
  };

  const handleParamChange = (plantId: string, param: keyof PlantParams, value: number) => {
    setSlots((prevSlots) =>
      prevSlots.map((slot) => {
        if (!slot.plant || slot.plant.id !== plantId) return slot;

        const waterCount = param === 'water' ? slot.plant.waterCount + 1 : slot.plant.waterCount;

        return {
          ...slot,
          plant: {
            ...slot.plant,
            params: {
              ...slot.plant.params,
              [param]: value,
            },
            waterCount,
          },
        };
      })
    );
  };

  const handleNameChange = (plantId: string, name: string) => {
    setSlots((prevSlots) =>
      prevSlots.map((slot) =>
        slot.plant?.id === plantId
          ? { ...slot, plant: { ...slot.plant, name } }
          : slot
      )
    );
  };

  const handleClosePanel = () => {
    setSelectedSlotId(null);
    setIsMobilePanelOpen(false);
  };

  const handleExportLog = () => {
    exportGrowthLog(slots);
  };

  const handleResetClick = () => {
    if (!hasPlants) {
      setSlots(createInitialSlots());
      return;
    }
    setShowResetConfirm(true);
  };

  const handleResetConfirm = () => {
    setSlots(createInitialSlots());
    setSelectedSlotId(null);
    setShowResetConfirm(false);
    setIsMobilePanelOpen(false);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-title">
          <span className="title-icon">🌿</span>
          <h1>垂直花园模拟器</h1>
        </div>
        <button
          className="btn btn-primary export-btn"
          onClick={handleExportLog}
          disabled={!hasPlants}
        >
          📄 导出日志
        </button>
      </header>

      <main className="app-main">
        <div className="garden-container">
          <GardenGrid
            slots={slots}
            selectedSlotId={selectedSlotId}
            onSlotClick={handleSlotClick}
          />
        </div>

        {selectedPlant && (
          <div className={`panel-container ${isMobilePanelOpen ? 'mobile-open' : ''}`}>
            <div className="mobile-panel-header" onClick={() => setIsMobilePanelOpen(!isMobilePanelOpen)}>
              <span>{PLANT_CONFIGS[selectedPlant.type].emoji} {selectedPlant.name}</span>
              <span className="panel-toggle-icon">{isMobilePanelOpen ? '▼' : '▲'}</span>
            </div>
            <div className="panel-content-wrapper">
              <PlantPanel
                plant={selectedPlant}
                onParamChange={handleParamChange}
                onNameChange={handleNameChange}
                onClose={handleClosePanel}
              />
            </div>
          </div>
        )}
      </main>

      <StatusBar slots={slots} />

      <button
        className="reset-button"
        onClick={handleResetClick}
        title="重置花园"
      >
        🔄 重置
      </button>

      {showPlantSelector && (
        <PlantSelector
          onSelect={handlePlantSelect}
          onClose={() => {
            setShowPlantSelector(false);
            setPendingSlotId(null);
          }}
        />
      )}

      {showResetConfirm && (
        <ConfirmDialog
          title="确认重置"
          message="确定要清空所有植物数据吗？此操作不可撤销。"
          confirmText="确定重置"
          cancelText="取消"
          onConfirm={handleResetConfirm}
          onCancel={() => setShowResetConfirm(false)}
        />
      )}
    </div>
  );
}
