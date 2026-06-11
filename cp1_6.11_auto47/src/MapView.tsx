import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useGame,
  Capsule,
  GhostCapsule,
  MoodType,
  UnlockDuration,
  MOOD_EMOJI,
  MOOD_LABEL,
  haversineDistance,
  formatCountdown
} from './GameData';
import CapsuleCard from './CapsuleCard';

const LONG_PRESS_DURATION = 600;
const RANGE_KM = 50;
const VIEW_KM = 3;

function MapView() {
  const { state, dispatch, buryCapsule, collectGhost, spawnGhost } = useGame();
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const rangeCircleRef = useRef<L.Circle | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);

  const [buryPosition, setBuryPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedCapsule, setSelectedCapsule] = useState<Capsule | null>(null);
  const [newBadge, setNewBadge] = useState<{ emoji: string; name: string; rarity: string; description: string } | null>(null);
  const [blinkingGhosts, setBlinkingGhosts] = useState<Set<string>>(new Set());
  const [, forceTick] = useState(0);
  const [showHint, setShowHint] = useState(true);

  const [formContent, setFormContent] = useState('');
  const [formMood, setFormMood] = useState<MoodType | null>(null);
  const [formDuration, setFormDuration] = useState<UnlockDuration>('24h');

  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressStartRef = useRef<{ lat: number; lng: number } | null>(null);
  const movedDuringPressRef = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => setShowHint(false), 8000);
    return () => clearTimeout(t);
  }, [state.userPosition]);

  useEffect(() => {
    const id = setInterval(() => forceTick(x => x + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const handleHide = () => {
      const el = document.getElementById('splash-screen');
      if (el) {
        el.classList.add('splash-hide');
        setTimeout(() => el.remove(), 600);
      }
    };
    if (!state.isLocating) {
      handleHide();
    }
  }, [state.isLocating]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const defaultCenter: [number, number] = [39.9042, 116.4074];

    const map = L.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: 10,
      zoomControl: false,
      attributionControl: false,
      worldCopyJump: true,
      maxBoundsViscosity: 0.8,
      preferCanvas: true
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd'
    }).addTo(map);

    map.zoomControl?.remove();
    L.control.zoom({ position: 'bottomleft' }).addTo(map);

    markerLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          initMapAtPosition(map, lat, lng);
          dispatch({ type: 'SET_POSITION', payload: { lat, lng } });
        },
        () => {
          initMapAtPosition(map, defaultCenter[0], defaultCenter[1]);
          dispatch({ type: 'SET_POSITION', payload: { lat: defaultCenter[0], lng: defaultCenter[1] } });
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
      );
    } else {
      initMapAtPosition(map, defaultCenter[0], defaultCenter[1]);
      dispatch({ type: 'SET_POSITION', payload: { lat: defaultCenter[0], lng: defaultCenter[1] } });
    }

    const handlePressStart = (ev: L.LeafletMouseEvent) => {
      if (!state.userPosition) return;
      const dist = haversineDistance(state.userPosition.lat, state.userPosition.lng, ev.latlng.lat, ev.latlng.lng);
      if (dist > RANGE_KM) return;
      movedDuringPressRef.current = false;
      longPressStartRef.current = { lat: ev.latlng.lat, lng: ev.latlng.lng };
      longPressTimerRef.current = setTimeout(() => {
        if (longPressStartRef.current && !movedDuringPressRef.current) {
          setBuryPosition({ ...longPressStartRef.current });
          setFormContent('');
          setFormMood(null);
          setFormDuration('24h');
        }
      }, LONG_PRESS_DURATION);
    };

    const handlePressMove = () => {
      movedDuringPressRef.current = true;
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    };

    const handlePressEnd = () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      longPressStartRef.current = null;
    };

    map.on('mousedown', handlePressStart);
    map.on('touchstart', (e) => {
      const touches = (e as any).originalEvent?.touches;
      if (touches && touches.length === 1) {
        const latlng = map.mouseEventToLatLng((e as any).originalEvent.touches[0]);
        handlePressStart({ latlng } as L.LeafletMouseEvent);
      }
    });
    map.on('mousemove', handlePressMove);
    map.on('touchmove', handlePressMove);
    map.on('mouseup', handlePressEnd);
    map.on('touchend', handlePressEnd);
    map.on('click', () => { setSelectedCapsule(null); });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (state.ghostCapsules.length < 3 && state.userPosition) {
      const t = setTimeout(() => spawnGhost(state.userPosition!.lat, state.userPosition!.lng), 8000 + Math.random() * 7000);
      return () => clearTimeout(t);
    }
  }, [state.ghostCapsules.length, state.userPosition, spawnGhost]);

  const initMapAtPosition = (map: L.Map, lat: number, lng: number) => {
    map.setView([lat, lng], 11);

    if (rangeCircleRef.current) rangeCircleRef.current.remove();
    rangeCircleRef.current = L.circle([lat, lng], {
      radius: RANGE_KM * 1000,
      className: 'range-circle'
    }).addTo(map);

    const myIcon = L.divIcon({
      className: 'me-marker',
      html: `<div style="width:18px;height:18px;border-radius:50%;background:#fff;border:3px solid #8B0000;box-shadow:0 0 0 6px rgba(139,0,0,0.15),0 2px 8px rgba(0,0,0,0.3);"></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    });
    L.marker([lat, lng], { icon: myIcon, interactive: false, zIndexOffset: 1000 }).addTo(map);
  };

  const renderMarkers = useCallback(() => {
    if (!mapRef.current || !markerLayerRef.current || !state.userPosition) return;
    markerLayerRef.current.clearLayers();

    state.capsules.forEach((capsule) => {
      const dist = haversineDistance(state.userPosition!.lat, state.userPosition!.lng, capsule.lat, capsule.lng);
      if (dist > 50) return;

      const inViewRange = dist <= VIEW_KM;

      const iconHtml = `
        <div class="capsule-marker ${capsule.isUnlocked ? 'unlocked' : 'locked'}">
          <div class="capsule-dot" style="${!capsule.isUnlocked ? `animation: none; filter: grayscale(0.8);` : ''}">
            ${!capsule.isUnlocked ? `<span style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:14px;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.5);">🔒</span>` : ''}
          </div>
          ${inViewRange && capsule.isUnlocked ? `<div style="position:absolute;bottom:-22px;left:50%;transform:translateX(-50%);font-size:18px;white-space:nowrap;text-shadow:0 1px 3px rgba(0,0,0,0.5);filter:drop-shadow(0 0 4px rgba(255,215,0,0.6));">${MOOD_EMOJI[capsule.mood]}</div>` : ''}
        </div>
      `;

      const icon = L.divIcon({
        className: 'capsule-icon-wrap',
        html: iconHtml,
        iconSize: [32, 48],
        iconAnchor: [16, 16]
      });

      const marker = L.marker([capsule.lat, capsule.lng], { icon, zIndexOffset: capsule.isUnlocked ? 500 : 100 });
      marker.on('click', (ev) => {
        L.DomEvent.stopPropagation(ev);
        if (!capsule.isUnlocked) return;
        if (dist > VIEW_KM) return;
        setSelectedCapsule(capsule);
      });
      marker.addTo(markerLayerRef.current!);
    });

    state.ghostCapsules.forEach((ghost) => {
      const dist = haversineDistance(state.userPosition!.lat, state.userPosition!.lng, ghost.lat, ghost.lng);
      if (dist > 50) return;

      const isBlinking = blinkingGhosts.has(ghost.id);
      const delay = (parseInt(ghost.id.slice(-3), 36) % 10) * 0.1;

      const iconHtml = `
        <div class="ghost-marker ${isBlinking ? 'ghost-blink' : ''}" id="ghost-${ghost.id}" style="animation: ghostFloat 3s ease-in-out infinite; animation-delay: ${delay}s;">
          <div class="ghost-dot"></div>
        </div>
        <style>
          @keyframes ghostFloat {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-15px); }
          }
        </style>
      `;

      const icon = L.divIcon({
        className: 'ghost-icon-wrap',
        html: iconHtml,
        iconSize: [26, 26],
        iconAnchor: [13, 13]
      });

      const marker = L.marker([ghost.lat, ghost.lng], { icon, zIndexOffset: 300 });
      marker.on('click', (ev) => {
        L.DomEvent.stopPropagation(ev);
        if (blinkingGhosts.has(ghost.id)) return;
        setBlinkingGhosts((prev) => new Set(prev).add(ghost.id));
        setTimeout(() => {
          const badge = collectGhost(ghost.id);
          if (badge) {
            setNewBadge({ emoji: badge.emoji, name: badge.name, rarity: badge.rarity, description: badge.description });
            setTimeout(() => setNewBadge(null), 2800);
          }
          setBlinkingGhosts((prev) => {
            const next = new Set(prev);
            next.delete(ghost.id);
            return next;
          });
        }, 600);
      });
      marker.addTo(markerLayerRef.current!);
    });
  }, [state.capsules, state.ghostCapsules, state.userPosition, blinkingGhosts, collectGhost]);

  useEffect(() => {
    renderMarkers();
  }, [renderMarkers]);

  const handleSubmitBury = () => {
    if (!buryPosition || !formMood || formContent.trim().length === 0 || formContent.length > 140) return;
    buryCapsule(buryPosition.lat, buryPosition.lng, formContent.trim(), formMood, formDuration);
    setBuryPosition(null);
  };

  const badgeSlots = useMemo(() => {
    const slots = new Array(6).fill(null);
    state.userBadges.slice(0, 6).forEach((b, i) => { slots[i] = b; });
    return slots;
  }, [state.userBadges]);

  const canSubmit = buryPosition && formMood && formContent.trim().length > 0 && formContent.length <= 140;

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={mapContainerRef} id="map-root" style={{ width: '100%', height: '100%' }} />
      <div className="map-overlay-gradient" />
      <div className="map-overlay-noise" />

      <AnimatePresence>
        {state.isLocating && (
          <motion.div
            className="locating-overlay"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {[0, 1, 2, 3].map((i) => (
              <motion.div
                key={i}
                className="ripple-ring"
                initial={{ width: 60, height: 60, opacity: 0.8 }}
                animate={{ width: 380, height: 380, opacity: 0 }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.35, ease: 'easeOut' }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="badge-panel">
        <div className="avatar">🧭</div>
        <div className="badge-grid">
          {badgeSlots.map((b, i) => (
            <div
              key={i}
              className={`badge-cell ${b ? `has-badge badge-${b.rarity}` : 'badge-empty'}`}
              title={b ? `${b.name} - ${b.description}` : '未收集的徽章格'}
            >
              {b ? (
                <>
                  <div className="badge-front">{b.emoji}</div>
                  <div className="badge-back">{b.name}</div>
                </>
              ) : '✦'}
            </div>
          ))}
        </div>
      </div>

      {showHint && !state.isLocating && (
        <motion.div
          className="long-press-hint"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ delay: 1.5 }}
        >
          长按地图任意位置 · 埋下你的时间胶囊
        </motion.div>
      )}

      <AnimatePresence>
        {buryPosition && (
          <motion.div
            className="bury-form-backdrop"
            onClick={(e) => { if (e.target === e.currentTarget) setBuryPosition(null); }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bury-form"
              initial={{ scale: 0.6, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.7, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25, mass: 0.9 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3>🕰️ 埋下时间胶囊</h3>

              <label className="form-label">写下此刻的心情（≤140字）</label>
              <textarea
                className="form-textarea"
                value={formContent}
                maxLength={160}
                placeholder="把此刻的心情封存，留给未来的某个人发现..."
                onChange={(e) => setFormContent(e.target.value)}
                autoFocus
              />
              <div className={`char-count ${formContent.length > 140 ? 'over' : ''}`}>{formContent.length}/140</div>

              <label className="form-label">选择心情</label>
              <div className="mood-grid">
                {(Object.keys(MOOD_EMOJI) as MoodType[]).map((mood) => (
                  <motion.button
                    key={mood}
                    type="button"
                    className={`mood-btn ${formMood === mood ? 'selected' : ''}`}
                    onClick={() => setFormMood(mood)}
                    whileTap={{ scale: 0.9 }}
                    whileHover={formMood !== mood ? { scale: 1.08 } : {}}
                    title={MOOD_LABEL[mood]}
                  >
                    {MOOD_EMOJI[mood]}
                  </motion.button>
                ))}
              </div>

              <label className="form-label">解锁时间</label>
              <div className="duration-row">
                {(['24h', '7d', '30d'] as UnlockDuration[]).map((dur) => (
                  <button
                    key={dur}
                    type="button"
                    className={`duration-btn ${formDuration === dur ? 'selected' : ''}`}
                    onClick={() => setFormDuration(dur)}
                  >
                    {dur === '24h' ? '24小时' : dur === '7d' ? '7天' : '30天'}
                  </button>
                ))}
              </div>

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setBuryPosition(null)}>取消</button>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={!canSubmit}
                  onClick={handleSubmitBury}
                >
                  🔒 封存胶囊
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedCapsule && (
          <CapsuleCard
            capsule={selectedCapsule}
            onClose={() => setSelectedCapsule(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {newBadge && (
          <motion.div
            className={`new-badge-toast ${newBadge.rarity}-toast`}
            initial={{ scale: 0, opacity: 0, rotate: -20 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.5, opacity: 0, y: -50 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          >
            <span className="big-emoji">{newBadge.emoji}</span>
            <h4>获得限定徽章！</h4>
            <h4 style={{ fontSize: 20, marginBottom: 4 }}>「{newBadge.name}」</h4>
            <p className="badge-desc">{newBadge.description}</p>
            <p className="badge-desc" style={{ marginTop: 6, fontWeight: 'bold' }}>
              {newBadge.rarity === 'legendary' ? '✦ 传说品质 ✦' : newBadge.rarity === 'rare' ? '◆ 稀有品质 ◆' : '· 普通品质 ·'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ position: 'fixed', bottom: 20, left: 20, zIndex: 500, pointerEvents: 'none' }}>
        {!state.isLocating && state.userPosition && (
          <div style={{
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(8px)',
            padding: '10px 16px',
            borderRadius: 14,
            border: '1px solid rgba(255,215,0,0.25)',
            color: '#FFD700',
            fontSize: 13,
            fontFamily: 'var(--font-body)',
            letterSpacing: 1
          }}>
            📍 {state.capsules.length} 颗胶囊 · 👻 {state.ghostCapsules.length} 个幽灵 · 🏆 {state.userBadges.length} 收藏
          </div>
        )}
      </div>
    </div>
  );
}

export default MapView;
