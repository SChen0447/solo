import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTeaStore, TeaType, TEA_INFO, BrewRecord, blendTeaColor } from './store';
import TeaBowl from './components/TeaBowl';
import BrewCard from './components/BrewCard';
import LogPanel from './components/LogPanel';

interface SteamParticle {
  id: number;
  x: number;
  delay: number;
  duration: number;
  curve: number;
  startX: number;
}

const STEAM_COUNT = 20;

function generateSteamParticles(intensity: number): SteamParticle[] {
  return Array.from({ length: STEAM_COUNT }, (_, i) => ({
    id: i,
    x: Math.random() * 40 - 20,
    delay: Math.random() * 3,
    duration: 2 + Math.random() * 2,
    curve: (Math.random() - 0.5) * 60,
    startX: Math.random() * 20 - 10,
  }));
}

const HEARTH_W = 140;
const HEARTH_H = 120;
const KETTLE_W = 80;
const KETTLE_H = 50;

const App: React.FC = () => {
  const {
    selectedTea,
    waterTemp,
    showBrewCard,
    activeRecordId,
    records,
    steamIntensity,
    brewStartTime,
    selectTea,
    setWaterTemp,
    startBrew,
    setShowBrewCard,
    addRecord,
    setActiveRecordId,
    setSteamIntensity,
    getRecordById,
  } = useTeaStore();

  const [showRipple, setShowRipple] = useState(false);
  const [logCollapsed, setLogCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [steamParticles, setSteamParticles] = useState<SteamParticle[]>(generateSteamParticles(1));
  const [dragOver, setDragOver] = useState(false);
  const [brewingTime, setBrewingTime] = useState(0);
  const brewTimerRef = useRef<number>(0);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    setLogCollapsed(isMobile);
  }, [isMobile]);

  useEffect(() => {
    setSteamParticles(generateSteamParticles(steamIntensity));
  }, [steamIntensity]);

  useEffect(() => {
    if (selectedTea) {
      startBrew();
    }
  }, [selectedTea]);

  useEffect(() => {
    if (selectedTea) {
      const tick = () => {
        setBrewingTime(Date.now() - useTeaStore.getState().brewStartTime);
      };
      brewTimerRef.current = window.setInterval(tick, 200);
      return () => clearInterval(brewTimerRef.current);
    }
  }, [selectedTea]);

  const handleTeaClick = useCallback(
    (tea: TeaType) => {
      selectTea(tea);
    },
    [selectTea]
  );

  const handleDragStart = useCallback((e: React.DragEvent, tea: TeaType) => {
    e.dataTransfer.setData('teaType', tea);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const tea = e.dataTransfer.getData('teaType') as TeaType;
    if (tea && Object.values(TeaType).includes(tea)) {
      selectTea(tea);
    }
  }, [selectTea]);

  const handleKettleClick = useCallback(() => {
    setSteamIntensity(Math.min(steamIntensity + 0.5, 3));
    setTimeout(() => setSteamIntensity(1), 2000);
  }, [steamIntensity, setSteamIntensity]);

  const handleTaste = useCallback(() => {
    setShowBrewCard(true);
    setShowRipple(true);
  }, [setShowBrewCard]);

  const handleRippleEnd = useCallback(() => {
    setShowRipple(false);
  }, []);

  const handleSaveRecord = useCallback(
    (record: Omit<BrewRecord, 'id' | 'date'>) => {
      addRecord(record);
    },
    [addRecord]
  );

  const handleSelectRecord = useCallback(
    (record: BrewRecord) => {
      setActiveRecordId(record.id);
      selectTea(record.teaType);
      setWaterTemp(record.waterTemp);
      setShowBrewCard(true);
    },
    [setActiveRecordId, selectTea, setWaterTemp, setShowBrewCard]
  );

  const activeRecord = activeRecordId ? getRecordById(activeRecordId) : undefined;

  const teaTypes = Object.values(TeaType);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: 'linear-gradient(180deg, #f5f0e8 0%, #d4d9c8 100%)',
        fontFamily: "'Noto Serif JP', 'Zen Old Mincho', serif",
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {isMobile && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 48,
            background: 'linear-gradient(180deg, rgba(90,74,58,0.9), rgba(58,42,26,0.9))',
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            zIndex: 100,
          }}
        >
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              background: 'none',
              border: 'none',
              color: '#f5f0e8',
              fontSize: 20,
              cursor: 'pointer',
              padding: '4px 8px',
            }}
          >
            ☰
          </button>
          <span style={{ color: '#f5f0e8', fontSize: 14, marginLeft: 12, letterSpacing: 2 }}>
            茶道冥想室
          </span>
        </div>
      )}

      <AnimatePresence>
        {isMobile && mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{
              position: 'absolute',
              top: 48,
              left: 0,
              right: 0,
              background: 'rgba(240,232,200,0.97)',
              zIndex: 99,
              maxHeight: '60vh',
              overflowY: 'auto',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            }}
          >
            <div style={{ padding: '12px 16px', fontSize: 13, color: '#3a2a1a', letterSpacing: 2, borderBottom: '1px solid rgba(160,140,110,0.3)' }}>
              品鑑日志
            </div>
            {records.length === 0 && (
              <div style={{ padding: 16, fontSize: 12, color: '#9a8a7a', textAlign: 'center' }}>
                まだ記録がありません
              </div>
            )}
            {records.map((record) => {
              const teaInfo = TEA_INFO[record.teaType as TeaType];
              return (
                <div
                  key={record.id}
                  onClick={() => {
                    handleSelectRecord(record);
                    setMobileMenuOpen(false);
                  }}
                  style={{
                    padding: '10px 16px',
                    cursor: 'pointer',
                    borderBottom: '1px solid rgba(160,140,110,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 3,
                      background: record.teaColorHex,
                      border: '1px solid rgba(0,0,0,0.12)',
                    }}
                  />
                  <span style={{ fontSize: 13, color: '#3a2a1a' }}>{teaInfo?.name}</span>
                  <span style={{ fontSize: 11, color: '#8a7a6a', marginLeft: 'auto' }}>
                    {new Date(record.date).toLocaleDateString('ja-JP')}
                  </span>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', paddingTop: isMobile ? 48 : 0 }}>
        {!isMobile && (
          <LogPanel
            collapsed={logCollapsed}
            onToggle={() => setLogCollapsed(!logCollapsed)}
            onSelectRecord={handleSelectRecord}
          />
        )}

        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: isMobile ? 24 : 40,
            padding: isMobile ? '20px 16px' : '0 40px',
            overflow: 'auto',
            position: 'relative',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 24,
            }}
          >
            <div
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <div
                onClick={handleKettleClick}
                style={{
                  position: 'relative',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    position: 'relative',
                    width: KETTLE_W,
                    height: KETTLE_H,
                    background: 'radial-gradient(ellipse at 40% 30%, #5a5550, #2a2825 80%)',
                    borderRadius: '50% 50% 8% 8%',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3), inset 0 2px 4px rgba(255,255,255,0.1)',
                    zIndex: 2,
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: -8,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 16,
                      height: 10,
                      background: '#3a3530',
                      borderRadius: '8px 8px 0 0',
                    }}
                  />
                </div>

                <div style={{ position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)', zIndex: 3 }}>
                  {steamParticles.map((p) => (
                    <motion.div
                      key={p.id}
                      initial={{
                        opacity: 0.6 * steamIntensity,
                        x: p.startX,
                        y: 0,
                      }}
                      animate={{
                        opacity: 0,
                        x: p.curve,
                        y: -50 - Math.random() * 20,
                      }}
                      transition={{
                        duration: p.duration,
                        delay: p.delay,
                        repeat: Infinity,
                        ease: 'easeOut',
                      }}
                      style={{
                        position: 'absolute',
                        width: 4 + Math.random() * 4,
                        height: 4 + Math.random() * 4,
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.5)',
                        pointerEvents: 'none',
                      }}
                    />
                  ))}
                </div>

                <div
                  style={{
                    width: HEARTH_W,
                    height: HEARTH_H,
                    background: 'linear-gradient(180deg, #1a1512, #0e0c0a)',
                    borderRadius: '8px 8px 4px 4px',
                    position: 'relative',
                    marginTop: -8,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5), inset 0 0 20px rgba(255,80,20,0.1)',
                    zIndex: 1,
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 12,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      display: 'flex',
                      gap: 4,
                    }}
                  >
                    {Array.from({ length: 8 }, (_, i) => (
                      <motion.div
                        key={i}
                        animate={{
                          opacity: [0.3, 0.9, 0.3],
                          scale: [0.8, 1.2, 0.8],
                          y: [0, -4, 0],
                        }}
                        transition={{
                          duration: 0.8 + Math.random() * 0.6,
                          repeat: Infinity,
                          delay: Math.random() * 0.5,
                        }}
                        style={{
                          width: 4 + Math.random() * 4,
                          height: 4 + Math.random() * 4,
                          borderRadius: '50%',
                          background: `radial-gradient(circle, #ff6020, #cc3300)`,
                        }}
                      />
                    ))}
                  </div>

                  <div
                    style={{
                      position: 'absolute',
                      bottom: 20,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 60,
                      height: 8,
                      background: 'radial-gradient(ellipse, rgba(255,100,30,0.3), transparent)',
                      borderRadius: '50%',
                      filter: 'blur(4px)',
                    }}
                  />
                </div>
              </div>

              <div style={{ fontSize: 11, color: '#9a8a7a', marginTop: 8, letterSpacing: 1 }}>
                釜をクリックで蒸気強化
              </div>
            </div>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              style={{
                transition: 'all 0.3s ease',
                transform: dragOver ? 'scale(1.05)' : 'scale(1)',
              }}
            >
              <TeaBowl
                teaType={selectedTea}
                waterTemp={waterTemp}
                onTaste={handleTaste}
                showRipple={showRipple}
                onRippleEnd={handleRippleEnd}
              />
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: '100%',
                maxWidth: 280,
              }}
            >
              <div style={{ fontSize: 12, color: '#6b5e4f', marginBottom: 6 }}>
                水温：{waterTemp}℃
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={waterTemp}
                onChange={(e) => setWaterTemp(Number(e.target.value))}
                style={{
                  width: '100%',
                  accentColor: '#5a4a3a',
                  cursor: 'pointer',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: 10, color: '#9a8a7a' }}>
                <span>0℃</span>
                <span>100℃</span>
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              maxWidth: isMobile ? '100%' : 160,
            }}
          >
            <div style={{ fontSize: 13, color: '#3a2a1a', letterSpacing: 2, marginBottom: 4, textAlign: 'center' }}>
              茶罐
            </div>
            <div
              style={{
                display: isMobile ? 'flex' : 'flex',
                flexDirection: isMobile ? 'row' : 'column',
                flexWrap: isMobile ? 'wrap' : 'nowrap',
                gap: 10,
                justifyContent: 'center',
              }}
            >
              {teaTypes.map((tea) => {
                const info = TEA_INFO[tea];
                const isSelected = selectedTea === tea;
                return (
                  <motion.div
                    key={tea}
                    draggable
                    onDragStart={(e) => handleDragStart(e as unknown as React.DragEvent, tea)}
                    onClick={() => handleTeaClick(tea)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    style={{
                      width: isMobile ? 80 : 130,
                      padding: isMobile ? '8px' : '12px',
                      background: info.texture,
                      borderRadius: 8,
                      cursor: 'grab',
                      border: isSelected
                        ? '2px solid #f5f0e8'
                        : '2px solid rgba(255,255,255,0.1)',
                      boxShadow: isSelected
                        ? '0 0 16px rgba(245,240,232,0.4)'
                        : '0 2px 8px rgba(0,0,0,0.2)',
                      position: 'relative',
                      transition: 'border-color 0.2s, box-shadow 0.2s',
                    }}
                  >
                    <div style={{ fontSize: 13, color: '#f5f0e8', fontWeight: 500, letterSpacing: 1 }}>
                      {info.nameJa}
                    </div>
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        background: 'rgba(0,0,0,0.6)',
                        padding: '4px 8px',
                        borderRadius: '0 0 6px 6px',
                        fontSize: 10,
                        color: 'rgba(245,240,232,0.85)',
                        opacity: 0,
                        transition: 'opacity 0.2s',
                        pointerEvents: 'none',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      className="tea-aroma-tooltip"
                    />
                  </motion.div>
                );
              })}
            </div>
          </div>

          <AnimatePresence>
            {showBrewCard && selectedTea && (
              <BrewCard
                teaType={selectedTea}
                waterTemp={waterTemp}
                brewTime={brewingTime}
                onClose={() => setShowBrewCard(false)}
                onSave={handleSaveRecord}
                existingRecord={activeRecord}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      <style>{`
        .tea-aroma-tooltip {
          display: none;
        }
        div:hover > .tea-aroma-tooltip {
          opacity: 1 !important;
          display: block;
        }
        @media (max-width: 767px) {
          input[type="range"] {
            -webkit-appearance: none;
            height: 6px;
            border-radius: 3px;
            background: linear-gradient(90deg, #c8d8e8, #e85830);
            outline: none;
          }
          input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 22px;
            height: 22px;
            border-radius: 50%;
            background: #5a4a3a;
            border: 2px solid #f5f0e8;
            cursor: pointer;
          }
        }
        ::-webkit-scrollbar {
          width: 4px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(120,100,70,0.3);
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
};

export default App;
