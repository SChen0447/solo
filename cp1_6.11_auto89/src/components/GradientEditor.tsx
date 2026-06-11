import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo
} from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { ColorStop, GradientData } from '../types';
import {
  sortColorStops,
  validateAndClampPosition,
  clampAngle,
  stopsToCssLinearGradient,
  normalizeColor
} from '../utils/gradient';

interface GradientEditorProps {
  colorStops: ColorStop[];
  angle: number;
  onChange: (data: GradientData) => void;
}

const MAX_STOPS = 8;
const STOP_SIZE = 16;
const PRESET_ANGLES = [0, 45, 90, 135];

const GradientEditor: React.FC<GradientEditorProps> = ({
  colorStops,
  angle,
  onChange
}) => {
  const [localStops, setLocalStops] = useState<ColorStop[]>(
    sortColorStops(colorStops)
  );
  const [localAngle, setLocalAngle] = useState<number>(angle);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hoverStopId, setHoverStopId] = useState<string | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const draggingPendingPos = useRef<{ id: string; pos: number } | null>(null);
  const rafIdRef = useRef<number | null>(null);

  const angleDialRef = useRef<SVGSVGElement | null>(null);
  const angleDraggingRef = useRef(false);
  const angleRafRef = useRef<number | null>(null);

  useEffect(() => {
    setLocalStops(sortColorStops(colorStops));
  }, [colorStops]);

  useEffect(() => {
    setLocalAngle(angle);
  }, [angle]);

  const emitChange = useCallback(
    (stops: ColorStop[], ang: number) => {
      onChange({ colorStops: sortColorStops(stops), angle: clampAngle(ang) });
    },
    [onChange]
  );

  const flushPendingPosition = useCallback(() => {
    if (draggingPendingPos.current) {
      const { id, pos } = draggingPendingPos.current;
      setLocalStops((prev) => {
        const next = prev.map((s) =>
          s.id === id ? { ...s, position: validateAndClampPosition(pos) } : s
        );
        emitChange(next, localAngle);
        return next;
      });
      draggingPendingPos.current = null;
    }
    rafIdRef.current = null;
  }, [localAngle, emitChange]);

  const handleStopPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, stop: ColorStop) => {
      e.preventDefault();
      e.stopPropagation();
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
      setDraggingId(stop.id);
    },
    []
  );

  const handleStopPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingId || !trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const relX = ((e.clientX - rect.left) / rect.width) * 100;
      draggingPendingPos.current = { id: draggingId, pos: relX };
      if (rafIdRef.current == null) {
        rafIdRef.current = requestAnimationFrame(flushPendingPosition);
      }
    },
    [draggingId, flushPendingPosition]
  );

  const handleStopPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      try {
        (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      if (rafIdRef.current != null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      flushPendingPosition();
      setDraggingId(null);
    },
    [flushPendingPosition]
  );

  const handleAddStop = useCallback(() => {
    setLocalStops((prev) => {
      if (prev.length >= MAX_STOPS) return prev;
      const sorted = sortColorStops(prev);
      let newPosition = 50;
      if (sorted.length >= 2) {
        let maxGap = 0;
        let gapStart = 0;
        for (let i = 0; i < sorted.length - 1; i++) {
          const gap = sorted[i + 1].position - sorted[i].position;
          if (gap > maxGap) {
            maxGap = gap;
            gapStart = sorted[i].position;
          }
        }
        newPosition = gapStart + maxGap / 2;
      } else if (sorted.length === 1) {
        newPosition = sorted[0].position > 50 ? 25 : 75;
      }
      const newStop: ColorStop = {
        id: uuidv4(),
        color: '#4FC3F7',
        position: validateAndClampPosition(newPosition)
      };
      const next = [...prev, newStop];
      emitChange(next, localAngle);
      return sortColorStops(next);
    });
  }, [localAngle, emitChange]);

  const handleRemoveStop = useCallback(
    (id: string) => {
      setLocalStops((prev) => {
        if (prev.length <= 2) return prev;
        const next = prev.filter((s) => s.id !== id);
        emitChange(next, localAngle);
        return sortColorStops(next);
      });
    },
    [localAngle, emitChange]
  );

  const handleColorChange = useCallback(
    (id: string, color: string) => {
      setLocalStops((prev) => {
        const next = prev.map((s) =>
          s.id === id ? { ...s, color: normalizeColor(color) } : s
        );
        emitChange(next, localAngle);
        return next;
      });
    },
    [localAngle, emitChange]
  );

  const computeAngleFromEvent = useCallback((clientX: number, clientY: number): number => {
    if (!angleDialRef.current) return 0;
    const rect = angleDialRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    let deg = Math.atan2(dx, -dy) * (180 / Math.PI);
    if (deg < 0) deg += 360;
    return clampAngle(Math.round(deg));
  }, []);

  const flushAnglePending = useCallback(() => {
    if (angleRafRef.current != null) {
      cancelAnimationFrame(angleRafRef.current);
      angleRafRef.current = null;
    }
  }, []);

  const handleDialPointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      e.preventDefault();
      (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
      angleDraggingRef.current = true;
      const deg = computeAngleFromEvent(e.clientX, e.clientY);
      setLocalAngle(deg);
      emitChange(localStops, deg);
    },
    [computeAngleFromEvent, emitChange, localStops]
  );

  const handleDialPointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!angleDraggingRef.current) return;
      const deg = computeAngleFromEvent(e.clientX, e.clientY);
      if (angleRafRef.current == null) {
        angleRafRef.current = requestAnimationFrame(() => {
          setLocalAngle(deg);
          emitChange(localStops, deg);
          angleRafRef.current = null;
        });
      }
    },
    [computeAngleFromEvent, emitChange, localStops]
  );

  const handleDialPointerUp = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      try {
        (e.currentTarget as SVGSVGElement).releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      angleDraggingRef.current = false;
      flushAnglePending();
    },
    [flushAnglePending]
  );

  const handlePresetAngle = useCallback(
    (deg: number) => {
      setLocalAngle(deg);
      emitChange(localStops, deg);
    },
    [emitChange, localStops]
  );

  const previewBg = useMemo(
    () => stopsToCssLinearGradient(localStops, localAngle),
    [localStops, localAngle]
  );

  const dialSize = 140;
  const dialCx = dialSize / 2;
  const dialCy = dialSize / 2;
  const pointerLen = 52;
  const pointerAngleRad = ((localAngle - 90) * Math.PI) / 180;
  const pointerEndX = dialCx + Math.cos(pointerAngleRad) * pointerLen;
  const pointerEndY = dialCy + Math.sin(pointerAngleRad) * pointerLen;

  return (
    <div className="gradient-editor">
      <div className="gradient-editor__header">
        <h2 className="gradient-editor__title">渐变编辑器</h2>
        <span className="gradient-editor__count">
          {localStops.length}/{MAX_STOPS} 色标
        </span>
      </div>

      <div className="gradient-editor__preview" style={{ background: previewBg }} />

      <div className="gradient-editor__stops-section">
        <div
          className="gradient-editor__track"
          ref={trackRef}
          style={{ background: previewBg }}
        >
          <div className="gradient-editor__grid" aria-hidden="true" />
          {sortColorStops(localStops).map((stop) => {
            const isDragging = draggingId === stop.id;
            const isHover = hoverStopId === stop.id;
            return (
              <div
                key={stop.id}
                className={`gradient-editor__stop ${isDragging ? 'is-dragging' : ''}`}
                style={{ left: `${stop.position}%` }}
                onPointerDown={(e) => handleStopPointerDown(e, stop)}
                onPointerMove={handleStopPointerMove}
                onPointerUp={handleStopPointerUp}
                onPointerCancel={handleStopPointerUp}
                onMouseEnter={() => setHoverStopId(stop.id)}
                onMouseLeave={() => setHoverStopId(null)}
              >
                <label className="gradient-editor__stop-handle">
                  <span
                    className="gradient-editor__stop-swatch"
                    style={{
                      background: stop.color,
                      width: `${STOP_SIZE}px`,
                      height: `${STOP_SIZE}px`
                    }}
                  />
                  <input
                    type="color"
                    className="gradient-editor__stop-picker"
                    value={normalizeColor(stop.color)}
                    onChange={(e) => handleColorChange(stop.id, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </label>
                {(isDragging || isHover) && (
                  <div className="gradient-editor__stop-tooltip">
                    <span className="gradient-editor__stop-color">
                      {normalizeColor(stop.color)}
                    </span>
                    <span className="gradient-editor__stop-pos">
                      {Math.round(stop.position)}%
                    </span>
                  </div>
                )}
                {localStops.length > 2 && (
                  <button
                    type="button"
                    className="gradient-editor__stop-remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveStop(stop.id);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    aria-label="删除色标"
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <button
          type="button"
          className="gradient-editor__add-stop"
          onClick={handleAddStop}
          disabled={localStops.length >= MAX_STOPS}
        >
          <span className="gradient-editor__add-icon">+</span>
          添加色标
        </button>
      </div>

      <div className="gradient-editor__angle-section">
        <div className="gradient-editor__angle-header">
          <h3 className="gradient-editor__angle-title">渐变方向</h3>
          <span className="gradient-editor__angle-value">{localAngle}°</span>
        </div>

        <div className="gradient-editor__angle-controls">
          <svg
            ref={angleDialRef}
            className="gradient-editor__dial"
            width={dialSize}
            height={dialSize}
            viewBox={`0 0 ${dialSize} ${dialSize}`}
            onPointerDown={handleDialPointerDown}
            onPointerMove={handleDialPointerMove}
            onPointerUp={handleDialPointerUp}
            onPointerCancel={handleDialPointerUp}
          >
            <defs>
              <radialGradient id="dialBg" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#2a2a2a" />
                <stop offset="100%" stopColor="#1a1a1a" />
              </radialGradient>
            </defs>
            <circle
              cx={dialCx}
              cy={dialCy}
              r={dialSize / 2 - 4}
              fill="url(#dialBg)"
              stroke="#3a3a3a"
              strokeWidth="2"
            />
            {[...Array(12)].map((_, i) => {
              const tickAngle = (i * 30 - 90) * (Math.PI / 180);
              const isMain = i % 3 === 0;
              const outerR = dialSize / 2 - 10;
              const innerR = isMain ? dialSize / 2 - 20 : dialSize / 2 - 15;
              return (
                <line
                  key={i}
                  x1={dialCx + Math.cos(tickAngle) * innerR}
                  y1={dialCy + Math.sin(tickAngle) * innerR}
                  x2={dialCx + Math.cos(tickAngle) * outerR}
                  y2={dialCy + Math.sin(tickAngle) * outerR}
                  stroke={isMain ? '#9e9e9e' : '#555'}
                  strokeWidth={isMain ? 2 : 1}
                />
              );
            })}
            <line
              className="gradient-editor__dial-pointer"
              x1={dialCx}
              y1={dialCy}
              x2={pointerEndX}
              y2={pointerEndY}
              stroke="#4fc3f7"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle cx={dialCx} cy={dialCy} r="6" fill="#4fc3f7" />
          </svg>

          <div className="gradient-editor__presets">
            {PRESET_ANGLES.map((deg) => (
              <button
                key={deg}
                type="button"
                className={`gradient-editor__preset-btn ${
                  localAngle === deg ? 'is-active' : ''
                }`}
                onClick={() => handlePresetAngle(deg)}
              >
                {deg}°
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GradientEditor;
