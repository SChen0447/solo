import React, { useState, useMemo } from 'react';
import { Butterfly, PedigreeRecord, PlacedPlant } from '../types';
import { breedButterflies, BASE_BUTTERFLIES } from '../utils/butterflyEngine';
import { PLANT_DATA } from '../utils/plantData';
import ButterflyThumbnail from './ButterflyThumbnail';
import confetti from 'canvas-confetti';

interface BreedingLabProps {
  capturedButterflies: Butterfly[];
  setCapturedButterflies: React.Dispatch<React.SetStateAction<Butterfly[]>>;
  pedigreeRecords: PedigreeRecord[];
  setPedigreeRecords: React.Dispatch<React.SetStateAction<PedigreeRecord[]>>;
  plants: PlacedPlant[];
  onReleaseButterfly: (butterfly: Butterfly) => void;
  onAddPedigree: (butterfly: Butterfly) => void;
}

const BreedingLab: React.FC<BreedingLabProps> = ({
  capturedButterflies,
  setCapturedButterflies,
  pedigreeRecords,
  setPedigreeRecords,
  plants,
  onReleaseButterfly,
  onAddPedigree
}) => {
  const [parent1, setParent1] = useState<Butterfly | null>(null);
  const [parent2, setParent2] = useState<Butterfly | null>(null);
  const [offspring, setOffspring] = useState<Butterfly[]>([]);
  const [reservedIds, setReservedIds] = useState<Set<string>>(new Set());
  const [breedingAnimation, setBreedingAnimation] = useState(false);
  const [speciesFilter, setSpeciesFilter] = useState<string>('all');
  const [dateSort, setDateSort] = useState<'asc' | 'desc'>('desc');
  const [selectedButterfly, setSelectedButterfly] = useState<Butterfly | null>(null);
  const [showReleaseConfirm, setShowReleaseConfirm] = useState<Butterfly | null>(null);

  const uniqueSpecies = useMemo(() => {
    const species = new Set<string>();
    capturedButterflies.forEach(b => species.add(b.speciesName));
    pedigreeRecords.forEach(r => species.add(r.speciesName));
    return Array.from(species);
  }, [capturedButterflies, pedigreeRecords]);

  const filteredRecords = useMemo(() => {
    let filtered = [...pedigreeRecords];
    if (speciesFilter !== 'all') {
      filtered = filtered.filter(r => r.speciesName === speciesFilter);
    }
    filtered.sort((a, b) => {
      const diff = a.createdAt - b.createdAt;
      return dateSort === 'desc' ? -diff : diff;
    });
    return filtered.slice(-100);
  }, [pedigreeRecords, speciesFilter, dateSort]);

  const handleSelectParent = (butterfly: Butterfly) => {
    if (!parent1) {
      setParent1(butterfly);
    } else if (!parent2 && butterfly.id !== parent1.id) {
      setParent2(butterfly);
    } else if (butterfly.id === parent1?.id) {
      setParent1(null);
    } else if (butterfly.id === parent2?.id) {
      setParent2(null);
    } else {
      setParent2(butterfly);
    }
    setSelectedButterfly(butterfly);
  };

  const handleBreed = () => {
    if (!parent1 || !parent2) return;

    setBreedingAnimation(true);

    setTimeout(() => {
      const children = breedButterflies(parent1, parent2, plants);

      setCapturedButterflies(prev => {
        const updated = prev.map(b => {
          if (b.id === parent1.id || b.id === parent2.id) {
            return {
              ...b,
              childIds: [...b.childIds, ...children.map(c => c.id)],
              lastActiveAt: Date.now()
            };
          }
          return b;
        });
        return [...updated, ...children];
      });

      children.forEach(child => onAddPedigree(child));

      setPedigreeRecords(prev => {
        let updated = [...prev];
        updated = updated.map(r =>
          r.butterflyId === parent1.id || r.butterflyId === parent2.id
            ? { ...r, childCount: r.childCount + children.length, lastActiveAt: Date.now() }
            : r
        );
        return updated;
      });

      setOffspring(children);
      setReservedIds(new Set());
      setBreedingAnimation(false);

      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#FFA500', '#FF6347']
      });
    }, 500);
  };

  const toggleReserve = (butterflyId: string) => {
    setReservedIds(prev => {
      const next = new Set(prev);
      if (next.has(butterflyId)) {
        next.delete(butterflyId);
      } else {
        next.add(butterflyId);
      }
      return next;
    });
  };

  const handleRelease = (butterfly: Butterfly) => {
    setShowReleaseConfirm(butterfly);
  };

  const confirmRelease = () => {
    if (!showReleaseConfirm) return;
    onReleaseButterfly(showReleaseConfirm);
    setCapturedButterflies(prev => prev.filter(b => b.id !== showReleaseConfirm.id));
    if (parent1?.id === showReleaseConfirm.id) setParent1(null);
    if (parent2?.id === showReleaseConfirm.id) setParent2(null);
    setShowReleaseConfirm(null);
  };

  const baseButterflies = Object.values(BASE_BUTTERFLIES).map(b => ({
    ...b,
    id: `base-${b.species}`,
    isWild: false,
    isCaptured: false,
    parentIds: [],
    childIds: [],
    createdAt: 0,
    lastActiveAt: 0
  } as Butterfly));

  return (
    <div style={{ display: 'flex', gap: 16, padding: 20, height: '100%' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{
          backgroundColor: '#2c3e50',
          borderRadius: 8,
          padding: 16,
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <h3 style={{
            color: '#ecf0f1',
            margin: '0 0 12px 0',
            fontFamily: "'Crimson Text', serif"
          }}>
            基础蝴蝶种源
          </h3>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {baseButterflies.map(b => (
              <div key={b.id} style={{ textAlign: 'center' }}>
                <ButterflyThumbnail butterfly={b} size={60} />
                <div style={{
                  color: '#bdc3c7',
                  fontSize: 11,
                  marginTop: 4
                }}>
                  {b.speciesName}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{
          backgroundColor: '#2c3e50',
          borderRadius: 8,
          padding: 16,
          flex: 1,
          border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <h3 style={{
            color: '#ecf0f1',
            margin: '0 0 12px 0',
            fontFamily: "'Crimson Text', serif"
          }}>
            已捕获蝴蝶 ({capturedButterflies.length})
          </h3>
          <div style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            overflowY: 'auto',
            maxHeight: 300,
            paddingRight: 4
          }}>
            {capturedButterflies.map(butterfly => (
              <ButterflyThumbnail
                key={butterfly.id}
                butterfly={butterfly}
                size={70}
                selected={parent1?.id === butterfly.id || parent2?.id === butterfly.id}
                reserved={reservedIds.has(butterfly.id)}
                onClick={() => handleSelectParent(butterfly)}
              />
            ))}
            {capturedButterflies.length === 0 && (
              <div style={{
                color: '#7f8c8d',
                fontSize: 13,
                padding: 20,
                textAlign: 'center',
                width: '100%'
              }}>
                还没有捕获的蝴蝶，去花园捕捉吧！
              </div>
            )}
          </div>
        </div>

        <div style={{
          backgroundColor: '#2c3e50',
          borderRadius: 8,
          padding: 16,
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <h3 style={{
            color: '#ecf0f1',
            margin: '0 0 12px 0',
            fontFamily: "'Crimson Text', serif"
          }}>
            育种区
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 80, height: 80,
              border: '2px dashed #7a9ab0',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0,0,0,0.2)'
            }}>
              {parent1 ? (
                <ButterflyThumbnail butterfly={parent1} size={70} />
              ) : (
                <span style={{ color: '#7f8c8d', fontSize: 12 }}>亲本1</span>
              )}
            </div>

            <button
              onClick={handleBreed}
              disabled={!parent1 || !parent2 || breedingAnimation}
              style={{
                width: 50,
                height: 50,
                borderRadius: '50%',
                background: parent1 && parent2 && !breedingAnimation
                  ? 'linear-gradient(180deg, #5c8a5c 0%, #7ab07a 100%)'
                  : '#34495e',
                border: '1px solid rgba(255,255,255,0.3)',
                color: 'white',
                fontSize: 22,
                cursor: parent1 && parent2 && !breedingAnimation ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
            >
              🧪
            </button>

            <div style={{
              width: 80, height: 80,
              border: '2px dashed #7a9ab0',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0,0,0,0.2)'
            }}>
              {parent2 ? (
                <ButterflyThumbnail butterfly={parent2} size={70} />
              ) : (
                <span style={{ color: '#7f8c8d', fontSize: 12 }}>亲本2</span>
              )}
            </div>
          </div>
          {breedingAnimation && (
            <div style={{
              marginTop: 10,
              textAlign: 'center',
              color: '#f39c12',
              fontSize: 13,
              animation: 'pulse 0.5s infinite'
            }}>
              混合中... 🔄
            </div>
          )}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{
          backgroundColor: '#2c3e50',
          borderRadius: 8,
          padding: 16,
          flex: 1,
          border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <h3 style={{
            color: '#ecf0f1',
            margin: '0 0 12px 0',
            fontFamily: "'Crimson Text', serif"
          }}>
            孵化区 - 子代
          </h3>
          <div style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            overflowY: 'auto',
            maxHeight: 200
          }}>
            {offspring.map(butterfly => (
              <div key={butterfly.id} style={{ textAlign: 'center' }}>
                <ButterflyThumbnail
                  butterfly={butterfly}
                  size={70}
                  reserved={reservedIds.has(butterfly.id)}
                  onClick={() => toggleReserve(butterfly.id)}
                />
                <div style={{
                  color: '#bdc3c7',
                  fontSize: 10,
                  marginTop: 2
                }}>
                  {butterfly.wingspanMm}mm | {butterfly.patternDensity}%
                </div>
              </div>
            ))}
            {offspring.length === 0 && (
              <div style={{
                color: '#7f8c8d',
                fontSize: 13,
                padding: 20,
                textAlign: 'center',
                width: '100%'
              }}>
                选择两只蝴蝶亲本开始杂交育种
              </div>
            )}
          </div>
          {offspring.length > 0 && (
            <div style={{
              marginTop: 10,
              fontSize: 11,
              color: '#7f8c8d',
              textAlign: 'center'
            }}>
              点击子代卡片标记为"保留" (已保留 {reservedIds.size} 只)
            </div>
          )}
        </div>

        <div style={{
          backgroundColor: '#2c3e50',
          borderRadius: 8,
          padding: 16,
          flex: 1,
          border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 250
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 10
          }}>
            <h3 style={{
              color: '#ecf0f1',
              margin: 0,
              fontFamily: "'Crimson Text', serif"
            }}>
              谱系记录
            </h3>
            <div style={{ display: 'flex', gap: 6 }}>
              <select
                value={speciesFilter}
                onChange={(e) => setSpeciesFilter(e.target.value)}
                style={{
                  backgroundColor: '#34495e',
                  color: '#ecf0f1',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 4,
                  padding: '4px 8px',
                  fontSize: 11
                }}
              >
                <option value="all">全部物种</option>
                {uniqueSpecies.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <button
                onClick={() => setDateSort(s => s === 'desc' ? 'asc' : 'desc')}
                style={{
                  backgroundColor: '#34495e',
                  color: '#ecf0f1',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 4,
                  padding: '4px 8px',
                  fontSize: 11,
                  cursor: 'pointer'
                }}
              >
                {dateSort === 'desc' ? '↓ 日期' : '↑ 日期'}
              </button>
            </div>
          </div>
          <div style={{
            overflowY: 'auto',
            flex: 1,
            fontSize: 12,
            color: '#bdc3c7'
          }}>
            {filteredRecords.slice().reverse().map(record => (
              <div key={record.butterflyId} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '6px 8px',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                fontSize: 11
              }}>
                <div>
                  <div style={{ color: '#ecf0f1', fontWeight: 500 }}>
                    {record.speciesName}
                  </div>
                  <div style={{ color: '#7f8c8d', fontSize: 10 }}>
                    ID: {record.butterflyId.slice(0, 8)}...
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#f39c12', fontSize: 10 }}>
                    子代: {record.childCount}
                  </div>
                  <div style={{ color: '#7f8c8d', fontSize: 10 }}>
                    {new Date(record.lastActiveAt).toLocaleDateString('zh-CN')}
                  </div>
                </div>
              </div>
            ))}
            {filteredRecords.length === 0 && (
              <div style={{
                color: '#7f8c8d',
                fontSize: 12,
                padding: 20,
                textAlign: 'center'
              }}>
                暂无谱系记录
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedButterfly && (
        <div style={{
          width: 200,
          backgroundColor: '#2c3e50',
          borderRadius: 8,
          padding: 14,
          color: '#ecf0f1',
          border: '1px solid rgba(255,255,255,0.1)',
          height: 'fit-content'
        }}>
          <h4 style={{ margin: '0 0 10px 0' }}>{selectedButterfly.speciesName}</h4>
          <div style={{ fontSize: 12, lineHeight: 1.7, color: '#bdc3c7' }}>
            <div>翅膀尺寸: {(selectedButterfly.wingSize * 100).toFixed(0)}%</div>
            <div>斑纹密度: {selectedButterfly.patternDensity}%</div>
            <div>翅展: {selectedButterfly.wingspanMm}mm</div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 6 }}>
              <span>主色:</span>
              <span style={{
                width: 14, height: 14, borderRadius: 3,
                backgroundColor: selectedButterfly.primaryColor,
                border: '1px solid rgba(255,255,255,0.3)'
              }} />
            </div>
          </div>
          <button
            onClick={() => handleRelease(selectedButterfly)}
            style={{
              marginTop: 12,
              width: '100%',
              padding: '8px 12px',
              background: 'linear-gradient(180deg, #5c8a5c 0%, #7ab07a 100%)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 5,
              color: 'white',
              fontSize: 12,
              cursor: 'pointer',
              transition: 'filter 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
            onMouseLeave={(e) => e.currentTarget.style.filter = 'brightness(1)'}
          >
            释放到花园
          </button>
        </div>
      )}

      {showReleaseConfirm && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }}>
          <div style={{
            backgroundColor: '#2c3e50',
            borderRadius: 8,
            padding: 24,
            maxWidth: 320,
            color: '#ecf0f1',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <h3 style={{ margin: '0 0 12px 0' }}>确认释放</h3>
            <p style={{ color: '#bdc3c7', fontSize: 14, marginBottom: 20 }}>
              确定要将 <strong style={{ color: '#ecf0f1' }}>{showReleaseConfirm.speciesName}</strong> 释放回花园吗？
              释放后它将回归野生状态。
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowReleaseConfirm(null)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#34495e',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 5,
                  color: '#ecf0f1',
                  cursor: 'pointer',
                  fontSize: 13
                }}
              >
                取消
              </button>
              <button
                onClick={confirmRelease}
                style={{
                  padding: '8px 16px',
                  background: 'linear-gradient(180deg, #5c8a5c 0%, #7ab07a 100%)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: 5,
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: 13
                }}
              >
                确认释放
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BreedingLab;
