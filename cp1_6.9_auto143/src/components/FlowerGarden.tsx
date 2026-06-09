import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Flower, FlowerSpecies, CareAction } from '../types';
import { flowerAPI, specimenAPI } from '../utils/api';
import PlantingPot from './PlantingPot';

const TOTAL_POTS = 50;
const PER_PAGE = 20;

const UnlockModal: React.FC<{ flower: Flower; onClose: () => void }> = ({ flower, onClose }) => {
  const [particles, setParticles] = useState<{ id: number; tx: number; ty: number }[]>([]);

  useEffect(() => {
    const ps = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      tx: (Math.random() - 0.5) * 300,
      ty: (Math.random() - 0.5) * 300,
    }));
    setParticles(ps);
    const timer = setTimeout(onClose, 2500);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="unlock-overlay" onClick={onClose}>
      <div className="unlock-modal" onClick={(e) => e.stopPropagation()}>
        <div className="unlock-glow" style={{ background: flower.color }} />
        {particles.map((p) => (
          <span
            key={p.id}
            className="particle"
            style={
              {
                left: '50%',
                top: '50%',
                background: flower.color,
                boxShadow: `0 0 10px ${flower.color}`,
                ['--tx' as any]: `${p.tx}px`,
                ['--ty' as any]: `${p.ty}px`,
              } as React.CSSProperties
            }
          />
        ))}
        <div className="unlock-title">✦ 花语解锁 ✦</div>
        <div className="unlock-flower" style={{ color: flower.color }}>
          {flower.name}
        </div>
        <div className="unlock-meaning">「{flower.meaning}」</div>
      </div>
    </div>
  );
};

const FlowerGarden: React.FC = () => {
  const [flowers, setFlowers] = useState<Flower[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [activeSeedPot, setActiveSeedPot] = useState<number | null>(null);
  const [unlockFlower, setUnlockFlower] = useState<Flower | null>(null);

  const fetchFlowers = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await flowerAPI.list(p, PER_PAGE);
      setFlowers(res.data);
      setTotal(res.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFlowers(page);
  }, [page, fetchFlowers]);

  const handlePlant = useCallback(
    async (species: FlowerSpecies, _potIndex: number) => {
      try {
        await flowerAPI.create(species);
        fetchFlowers(page);
      } catch (err) {
        console.error(err);
      }
    },
    [page, fetchFlowers]
  );

  const handleCare = useCallback(
    async (flowerId: string, action: CareAction) => {
      try {
        const updated = await flowerAPI.care(flowerId, action);
        setFlowers((prev) => prev.map((f) => (f._id === flowerId ? updated : f)));
        if (updated.unlocked && !flowers.find((f) => f._id === flowerId)?.unlocked) {
          setUnlockFlower(updated);
        }
      } catch (err) {
        console.error(err);
      }
    },
    [flowers]
  );

  const handleMakeSpecimen = useCallback(
    async (flowerId: string) => {
      try {
        await specimenAPI.create(flowerId);
        alert('标本制作成功！前往标本馆查看 📖');
      } catch (err) {
        const e = err as Error;
        alert(e.message || '制作失败');
      }
    },
    []
  );

  const potSlots = useMemo(() => {
    const slots: (Flower | null)[] = [];
    const startIdx = (page - 1) * PER_PAGE;
    const maxSlots = Math.min(PER_PAGE, TOTAL_POTS - startIdx);
    for (let i = 0; i < maxSlots; i++) {
      slots.push(flowers[i] || null);
    }
    while (slots.length < maxSlots) {
      slots.push(null);
    }
    return slots;
  }, [flowers, page]);

  const totalPages = Math.ceil(Math.max(total, 1) / PER_PAGE);
  const displayTotalPages = Math.ceil(TOTAL_POTS / PER_PAGE);
  const finalPages = Math.max(totalPages, displayTotalPages);

  return (
    <div>
      <h2 className="section-title">🌿 我的花园</h2>
      <p style={{ color: '#666', marginBottom: 24, marginTop: -8 }}>
        点击空花盆种植花朵，悉心照料解锁花语密码
      </p>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>加载中...</div>
      ) : (
        <>
          <div className="garden-grid">
            {potSlots.map((flower, idx) => (
              <PlantingPot
                key={idx}
                potIndex={(page - 1) * PER_PAGE + idx}
                flower={flower || undefined}
                onPlant={handlePlant}
                onCare={handleCare}
                onMakeSpecimen={flower?.unlocked ? handleMakeSpecimen : undefined}
                showSeedSelector={activeSeedPot === (page - 1) * PER_PAGE + idx}
                setShowSeedSelector={(v) => setActiveSeedPot(v ? (page - 1) * PER_PAGE + idx : null)}
              />
            ))}
          </div>

          {finalPages > 1 && (
            <div className="pagination">
              <button
                className="page-btn"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ‹
              </button>
              {Array.from({ length: finalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  className={`page-btn ${p === page ? 'active' : ''}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}
              <button
                className="page-btn"
                disabled={page === finalPages}
                onClick={() => setPage((p) => Math.min(finalPages, p + 1))}
              >
                ›
              </button>
            </div>
          )}
        </>
      )}

      {unlockFlower && (
        <UnlockModal flower={unlockFlower} onClose={() => setUnlockFlower(null)} />
      )}
    </div>
  );
};

export default FlowerGarden;
