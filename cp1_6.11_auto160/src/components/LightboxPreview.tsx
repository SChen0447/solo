import { useRef, useCallback, useEffect } from "react";
import { useStore } from "@/store/useStore";
import { calculateShadow, getShadowCSS, getLightGlowCSS } from "@/utils/shadowCalculator";
import { PATTERNS } from "@/utils/patterns";

const LAYER_WIDTH = 300;
const LAYER_HEIGHT = 400;
const PERSPECTIVE = 800;
const LAYER_SPACING = 5;
const TOTAL_LAYERS = 4;
const MAX_Z_INDEX = TOTAL_LAYERS - 1;
const DRAG_SENSITIVITY = 0.3;
const ROTATE_Y_MIN = -45;
const ROTATE_Y_MAX = 45;
const ROTATE_X_MIN = -20;
const ROTATE_X_MAX = 20;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getTranslateZ(layerIndex: number): number {
  return (MAX_Z_INDEX - layerIndex) * LAYER_SPACING;
}

export default function LightboxPreview() {
  const layers = useStore((s) => s.layers);
  const light = useStore((s) => s.light);
  const rotationX = useStore((s) => s.rotationX);
  const rotationY = useStore((s) => s.rotationY);
  const setRotation = useStore((s) => s.setRotation);

  const isDraggingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDraggingRef.current = true;
    lastPosRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - lastPosRef.current.x;
      const dy = e.clientY - lastPosRef.current.y;
      lastPosRef.current = { x: e.clientX, y: e.clientY };

      const newRotateY = clamp(
        rotationY + dx * DRAG_SENSITIVITY,
        ROTATE_Y_MIN,
        ROTATE_Y_MAX
      );
      const newRotateX = clamp(
        rotationX - dy * DRAG_SENSITIVITY,
        ROTATE_X_MIN,
        ROTATE_X_MAX
      );
      setRotation(newRotateX, newRotateY);
    },
    [rotationX, rotationY, setRotation]
  );

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      isDraggingRef.current = false;
    };
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => {
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, []);

  const sortedLayers = [...layers].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <div
      style={{
        perspective: PERSPECTIVE,
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: isDraggingRef.current ? "grabbing" : "grab",
        overflow: "hidden",
        userSelect: "none",
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <div
        style={{
          transformStyle: "preserve-3d",
          transform: `rotateX(${rotationX}deg) rotateY(${rotationY}deg)`,
          position: "relative",
          width: LAYER_WIDTH,
          height: LAYER_HEIGHT,
        }}
      >
        <div
          style={{
            position: "absolute",
            width: LAYER_WIDTH,
            height: LAYER_HEIGHT,
            transform: `translateZ(-5px)`,
            background: getLightGlowCSS(light),
            borderRadius: 2,
            pointerEvents: "none",
          }}
        />

        {sortedLayers.map((layer) => {
          const tz = getTranslateZ(layer.index);
          const shadow = calculateShadow(light, layer.index, TOTAL_LAYERS);
          const shadowCSS = getShadowCSS(shadow);
          const pattern = layer.patternId
            ? PATTERNS.find((p) => p.id === layer.patternId)
            : null;

          return (
            <div
              key={layer.id}
              style={{
                position: "absolute",
                width: LAYER_WIDTH,
                height: LAYER_HEIGHT,
                transform: `translateZ(${tz}px)`,
                backgroundColor: layer.paperColor,
                opacity: layer.opacity,
                borderRadius: 2,
                filter: shadowCSS,
                boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
                backfaceVisibility: "hidden",
              }}
            >
              {pattern && (
                <svg
                  viewBox={pattern.viewBox}
                  width="100%"
                  height="100%"
                  style={{ position: "absolute", top: 0, left: 0 }}
                >
                  <defs>
                    <mask id={`mask-${layer.id}`}>
                      <rect width="200" height="200" fill="white" />
                      <path d={pattern.svgPath} fill="black" />
                      {layer.customMaskData && (
                        <path d={layer.customMaskData} fill="black" />
                      )}
                    </mask>
                  </defs>
                  <rect
                    width="200"
                    height="200"
                    fill={layer.paperColor}
                    mask={`url(#mask-${layer.id})`}
                  />
                </svg>
              )}

              {!pattern && layer.customMaskData && (
                <svg
                  viewBox="0 0 200 200"
                  width="100%"
                  height="100%"
                  style={{ position: "absolute", top: 0, left: 0 }}
                >
                  <defs>
                    <mask id={`mask-custom-${layer.id}`}>
                      <rect width="200" height="200" fill="white" />
                      <path d={layer.customMaskData} fill="black" />
                    </mask>
                  </defs>
                  <rect
                    width="200"
                    height="200"
                    fill={layer.paperColor}
                    mask={`url(#mask-custom-${layer.id})`}
                  />
                </svg>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
