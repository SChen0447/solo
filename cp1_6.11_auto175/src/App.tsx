import React, { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { PlacedPlant, Butterfly, PedigreeRecord, FlyingButterfly, TabType } from './types';
import { PLANT_DATA } from './utils/plantData';
import {
  loadCapturedButterflies,
  loadPedigreeRecords,
  saveCapturedButterflies,
  savePedigreeRecords,
  addPedigreeRecord,
  forceSaveAll
} from './utils/storage';
import ButterflyGarden from './components/ButterflyGarden';
import BreedingLab from './components/BreedingLab';
import GardenStats from './components/GardenStats';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('garden');
  const [plants, setPlants] = useState<PlacedPlant[]>([]);
  const [capturedButterflies, setCapturedButterflies] = useState<Butterfly[]>([]);
  const [pedigreeRecords, setPedigreeRecords] = useState<PedigreeRecord[]>([]);
  const [selectedButterfly, setSelectedButterfly] = useState<FlyingButterfly | null>(null);
  const [releaseButterfly, setReleaseButterfly] = useState<Butterfly | null>(null);
  const [wildButterflyCount, setWildButterflyCount] = useState(0);
  const [breedCount, setBreedCount] = useState(0);
  const saveTimerRef = useRef<number>(0);

  useEffect(() => {
    const savedButterflies = loadCapturedButterflies();
    const savedRecords = loadPedigreeRecords();

    if (savedButterflies.length > 0) {
      setCapturedButterflies(savedButterflies);
    }
    if (savedRecords.length > 0) {
      setPedigreeRecords(savedRecords);
    }

    const initialPlants: PlacedPlant[] = [
      {
        id: uuidv4(),
        type: 'aristolochia',
        gridX: 1,
        gridY: 2,
        nectar: 80,
        lastVisitedAt: Date.now(),
        daysWithoutVisit: 0,
        plantedAt: Date.now()
      },
      {
        id: uuidv4(),
        type: 'aristolochia',
        gridX: 4,
        gridY: 1,
        nectar: 75,
        lastVisitedAt: Date.now(),
        daysWithoutVisit: 0,
        plantedAt: Date.now()
      },
      {
        id: uuidv4(),
        type: 'buddleja',
        gridX: 2,
        gridY: 4,
        nectar: 90,
        lastVisitedAt: Date.now(),
        daysWithoutVisit: 0,
        plantedAt: Date.now()
      }
    ];
    setPlants(initialPlants);

    const savedBreedCount = localStorage.getItem('butterfly_garden_breed_count');
    if (savedBreedCount) {
      setBreedCount(parseInt(savedBreedCount, 10));
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      saveCapturedButterflies(capturedButterflies, false);
      savePedigreeRecords(pedigreeRecords, false);
    }, 5 * 60 * 1000);

    saveTimerRef.current = interval;
    return () => clearInterval(interval);
  }, [capturedButterflies, pedigreeRecords]);

  useEffect(() => {
    localStorage.setItem('butterfly_garden_breed_count', breedCount.toString());
  }, [breedCount]);

  const totalNectar = plants.reduce((sum, p) => sum + p.nectar, 0);

  const handleButterflyCapture = useCallback((butterfly: Butterfly) => {
    setCapturedButterflies(prev => {
      const updated = [...prev, butterfly];
      saveCapturedButterflies(updated, true);
      return updated;
    });

    setPedigreeRecords(prev => {
      const updated = addPedigreeRecord(butterfly, prev);
      savePedigreeRecords(updated, true);
      return updated;
    });
  }, []);

  const handleAddPedigree = useCallback((butterfly: Butterfly) => {
    setPedigreeRecords(prev => {
      const updated = addPedigreeRecord(butterfly, prev);
      return updated;
    });
    setBreedCount(prev => prev + 1);
  }, []);

  const handleReleaseButterfly = useCallback((butterfly: Butterfly) => {
    setReleaseButterfly(butterfly);
  }, []);

  const handleReleased = useCallback(() => {
    setReleaseButterfly(null);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setWildButterflyCount(Math.floor(Math.random() * 5) + 2);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    return () => {
      forceSaveAll(capturedButterflies, pedigreeRecords);
    };
  }, [capturedButterflies, pedigreeRecords]);

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'garden', label: '蝴蝶花园', icon: '🌿' },
    { id: 'observation', label: '观察日志', icon: '📋' },
    { id: 'design', label: '设计工作室', icon: '🎨' }
  ];

  return (
    <div
      className="app-container"
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #0d1b2a 0%, #1b263b 100%)',
        color: '#ecf0f1',
        fontFamily: "'Crimson Text', serif"
      }}
    >
      <header style={{
        padding: '16px 30px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 28 }}>🦋</span>
          <h1 style={{
            margin: 0,
            fontSize: 24,
            fontFamily: "'Crimson Text', serif",
            fontWeight: 700,
            color: '#ecf0f1'
          }}>
            蝴蝶花园
          </h1>
          <span style={{
            color: '#7f8c8d',
            fontSize: 13,
            fontStyle: 'italic'
          }}>
            虚拟生态观察与翅膀图案设计
          </span>
        </div>

        <nav style={{ display: 'flex', gap: 4 }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '10px 20px',
                backgroundColor: activeTab === tab.id
                  ? 'linear-gradient(180deg, #5c8a5c 0%, #7ab07a 100%)'
                  : 'transparent',
                background: activeTab === tab.id
                  ? 'linear-gradient(180deg, #5c8a5c 0%, #7ab07a 100%)'
                  : 'transparent',
                border: activeTab === tab.id
                  ? '1px solid rgba(255,255,255,0.3)'
                  : '1px solid transparent',
                borderRadius: 6,
                color: activeTab === tab.id ? 'white' : '#bdc3c7',
                cursor: 'pointer',
                fontSize: 15,
                fontFamily: "'Crimson Text', serif",
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.color = '#ecf0f1';
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.color = '#bdc3c7';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      <main style={{ padding: '20px 0' }}>
        {activeTab === 'garden' && (
          <ButterflyGarden
            plants={plants}
            setPlants={setPlants}
            onButterflyCapture={handleButterflyCapture}
            capturedButterflies={capturedButterflies}
            selectedButterfly={selectedButterfly}
            setSelectedButterfly={setSelectedButterfly}
            releaseButterflyData={releaseButterfly}
            onReleased={handleReleased}
          />
        )}

        {activeTab === 'observation' && (
          <BreedingLab
            capturedButterflies={capturedButterflies}
            setCapturedButterflies={setCapturedButterflies}
            pedigreeRecords={pedigreeRecords}
            setPedigreeRecords={setPedigreeRecords}
            plants={plants}
            onReleaseButterfly={handleReleaseButterfly}
            onAddPedigree={handleAddPedigree}
          />
        )}

        {activeTab === 'design' && (
          <div style={{
            padding: 40,
            textAlign: 'center',
            color: '#7f8c8d'
          }}>
            <h2 style={{ fontFamily: "'Crimson Text', serif" }}>🎨 设计工作室</h2>
            <p>翅膀图案设计功能开发中...</p>
            <p style={{ fontSize: 14, marginTop: 20 }}>
              敬请期待：自定义翅膀图案、颜色调配、图案导出等功能
            </p>
          </div>
        )}
      </main>

      {activeTab === 'garden' && (
        <GardenStats
          plantCount={plants.length}
          totalNectar={totalNectar}
          wildButterflyCount={wildButterflyCount}
          capturedCount={capturedButterflies.length}
          breedCount={breedCount}
        />
      )}

      <style>{`
        * {
          box-sizing: border-box;
        }
        
        body {
          margin: 0;
          padding: 0;
          overflow-x: hidden;
        }
        
        #root {
          min-height: 100vh;
        }
        
        @keyframes cage-pulse {
          0% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.2); opacity: 0.8; }
          100% { transform: scale(1); opacity: 0.5; }
        }
        
        @keyframes release-spiral {
          0% {
            transform: translate(0, 0) rotate(0deg) scale(0.5);
            opacity: 1;
          }
          100% {
            transform: translate(var(--tx, 0), var(--ty, -100px)) rotate(720deg) scale(1.2);
            opacity: 0;
          }
        }
        
        @keyframes pulse-gold {
          0% { box-shadow: 0 0 0 0 rgba(255, 215, 0, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(255, 215, 0, 0); }
          100% { box-shadow: 0 0 0 0 rgba(255, 215, 0, 0); }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        
        ::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.1);
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb {
          background: #7a9ab0;
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: #9ab5c8;
        }
      `}</style>
    </div>
  );
};

export default App;
