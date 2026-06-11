import { useRef, useState, useCallback, useEffect } from "react";
import { useStore } from "@/store/useStore";
import { PATTERNS } from "@/utils/patterns";
import { Palette, Brush, ChevronDown, ChevronUp, Trash2 } from "lucide-react";

const PRESET_COLORS = [
  "#fdf5e6",
  "#faf0dc",
  "#f5ead2",
  "#f0f8ff",
  "#fff8f0",
  "#f8f0ff",
  "#f0fff0",
  "#fff0f0",
];

function PatternThumbnail({
  pattern,
  selected,
  onClick,
}: {
  pattern: (typeof PATTERNS)[number];
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="relative rounded border transition-all"
      style={{
        width: 40,
        height: 40,
        borderColor: selected ? "#ffd27f" : "rgba(255,255,255,0.1)",
        background: selected
          ? "rgba(255,210,127,0.1)"
          : "rgba(255,255,255,0.03)",
        boxShadow: selected ? "0 0 6px rgba(255,210,127,0.3)" : "none",
      }}
    >
      <svg
        viewBox={pattern.viewBox}
        width={32}
        height={32}
        className="mx-auto"
        style={{ display: "block" }}
      >
        <path
          d={pattern.svgPath}
          fill="none"
          stroke="rgba(255,255,255,0.6)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

function DrawingCanvas({
  layerIndex,
  initialData,
  brushSize,
  onDrawEnd,
}: {
  layerIndex: number;
  initialData: string | null;
  brushSize: number;
  onDrawEnd: (dataUrl: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const startPointRef = useRef<{ x: number; y: number } | null>(null);
  const snapshotRef = useRef<ImageData | null>(null);
  const setIsDrawing = useStore((s) => s.setIsDrawing);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (initialData) {
      const img = new Image();
      img.onload = () => {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = initialData;
    } else {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, [layerIndex, initialData]);

  const getPos = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } => {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((e.clientX - rect.left) / rect.width) * canvas.width,
        y: ((e.clientY - rect.top) / rect.height) * canvas.height,
      };
    },
    []
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      isDrawingRef.current = true;
      setIsDrawing(true);
      const pos = getPos(e);
      startPointRef.current = pos;

      ctx.fillStyle = "#000000";
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, brushSize / 2, 0, Math.PI * 2);
      ctx.fill();

      snapshotRef.current = ctx.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
      );
    },
    [brushSize, getPos, setIsDrawing]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawingRef.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const pos = getPos(e);

      if (e.shiftKey && startPointRef.current && snapshotRef.current) {
        ctx.putImageData(snapshotRef.current, 0, 0);
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = brushSize;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(startPointRef.current.x, startPointRef.current.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
      } else {
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = brushSize;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(startPointRef.current?.x ?? pos.x, startPointRef.current?.y ?? pos.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        startPointRef.current = pos;
      }
    },
    [brushSize]
  );

  const handleMouseUp = useCallback(() => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    setIsDrawing(false);
    startPointRef.current = null;
    snapshotRef.current = null;

    const canvas = canvasRef.current;
    if (canvas) {
      onDrawEnd(canvas.toDataURL("image/png"));
    }
  }, [onDrawEnd, setIsDrawing]);

  const handleMouseLeave = useCallback(() => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    setIsDrawing(false);
    startPointRef.current = null;
    snapshotRef.current = null;

    const canvas = canvasRef.current;
    if (canvas) {
      onDrawEnd(canvas.toDataURL("image/png"));
    }
  }, [onDrawEnd, setIsDrawing]);

  const handleClear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    onDrawEnd(canvas.toDataURL("image/png"));
  }, [onDrawEnd]);

  return (
    <div className="mt-2 flex flex-col items-center gap-2">
      <canvas
        ref={canvasRef}
        width={240}
        height={320}
        className="rounded border cursor-crosshair"
        style={{
          borderColor: "rgba(255,255,255,0.15)",
          background: "#fff",
          width: 240,
          height: 320,
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      />
      <button
        onClick={handleClear}
        className="flex items-center gap-1 rounded px-3 py-1 text-xs transition-colors"
        style={{
          background: "rgba(255,80,80,0.15)",
          color: "#ff8888",
          border: "1px solid rgba(255,80,80,0.2)",
        }}
      >
        <Trash2 size={12} />
        Clear
      </button>
    </div>
  );
}

function LayerCard({
  layerIndex,
  layer,
  isActive,
  onActivate,
  expanded,
  onToggleExpand,
}: {
  layerIndex: number;
  layer: ReturnType<typeof useStore.getState>["layers"][number];
  isActive: boolean;
  onActivate: () => void;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const updateLayer = useStore((s) => s.updateLayer);
  const brushSize = useStore((s) => s.brushSize);
  const setBrushSize = useStore((s) => s.setBrushSize);
  const light = useStore((s) => s.light);
  const [customDrawEnabled, setCustomDrawEnabled] = useState(false);

  const accentColor =
    light.colorTemperature <= 4000 ? "#ffd27f" : "#cce5ff";

  const handleDrawEnd = useCallback(
    (dataUrl: string) => {
      updateLayer(layerIndex, { customMaskData: dataUrl });
    },
    [layerIndex, updateLayer]
  );

  return (
    <div
      onClick={onActivate}
      className="rounded-lg transition-all"
      style={{
        background: "rgba(255,255,255,0.05)",
        border: `1px solid ${isActive ? "#ffd27f" : "rgba(255,255,255,0.08)"}`,
        boxShadow: isActive
          ? "0 0 12px rgba(255,210,127,0.15)"
          : "none",
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="flex items-center justify-between px-3 py-2">
        <span
          className="text-xs font-medium tracking-wide"
          style={{ color: isActive ? "#ffd27f" : "rgba(255,255,255,0.6)" }}
        >
          图层 {layerIndex + 1}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand();
          }}
          className="p-0.5 rounded transition-colors"
          style={{ color: "rgba(255,255,255,0.4)" }}
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {expanded && (
        <div className="px-3 pb-3 flex flex-col gap-3">
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Palette size={12} style={{ color: "rgba(255,255,255,0.4)" }} />
              <span
                className="text-[10px] uppercase tracking-wider"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                纸色
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={layer.paperColor}
                onChange={(e) =>
                  updateLayer(layerIndex, { paperColor: e.target.value })
                }
                className="h-6 w-6 rounded cursor-pointer border-0 p-0"
                style={{ background: "transparent" }}
              />
              <div className="flex gap-1 flex-wrap">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() =>
                      updateLayer(layerIndex, { paperColor: color })
                    }
                    className="rounded-sm border transition-transform hover:scale-110"
                    style={{
                      width: 16,
                      height: 16,
                      background: color,
                      borderColor:
                        layer.paperColor === color
                          ? accentColor
                          : "rgba(255,255,255,0.15)",
                      boxShadow:
                        layer.paperColor === color
                          ? `0 0 4px ${accentColor}40`
                          : "none",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span
                className="text-[10px] uppercase tracking-wider"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                不透明度
              </span>
              <span
                className="text-[10px] tabular-nums"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                {Math.round(layer.opacity * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={10}
              max={90}
              step={1}
              value={Math.round(layer.opacity * 100)}
              onChange={(e) =>
                updateLayer(layerIndex, {
                  opacity: parseInt(e.target.value) / 100,
                })
              }
              className="w-full h-1 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, ${accentColor} ${
                  ((Math.round(layer.opacity * 100) - 10) / 80) * 100
                }%, rgba(255,255,255,0.1) ${
                  ((Math.round(layer.opacity * 100) - 10) / 80) * 100
                }%)`,
              }}
            />
          </div>

          <div>
            <span
              className="text-[10px] uppercase tracking-wider block mb-1.5"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              图案
            </span>
            <div className="grid grid-cols-4 gap-1">
              {PATTERNS.map((p) => (
                <PatternThumbnail
                  key={p.id}
                  pattern={p}
                  selected={layer.patternId === p.id}
                  onClick={() =>
                    updateLayer(layerIndex, {
                      patternId: layer.patternId === p.id ? null : p.id,
                    })
                  }
                />
              ))}
            </div>
          </div>

          <div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCustomDrawEnabled((prev) => !prev);
              }}
              className="flex items-center gap-1.5 rounded px-2.5 py-1 text-xs transition-colors"
              style={{
                background: customDrawEnabled
                  ? "rgba(255,210,127,0.15)"
                  : "rgba(255,255,255,0.05)",
                color: customDrawEnabled ? "#ffd27f" : "rgba(255,255,255,0.5)",
                border: customDrawEnabled
                  ? "1px solid rgba(255,210,127,0.3)"
                  : "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <Brush size={12} />
              自定义绘制
            </button>

            {customDrawEnabled && (
              <>
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className="text-[10px]"
                    style={{ color: "rgba(255,255,255,0.4)" }}
                  >
                    画笔
                  </span>
                  <input
                    type="range"
                    min={3}
                    max={12}
                    step={1}
                    value={brushSize}
                    onChange={(e) => setBrushSize(parseInt(e.target.value))}
                    className="flex-1 h-1 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, ${accentColor} ${
                        ((brushSize - 3) / 9) * 100
                      }%, rgba(255,255,255,0.1) ${
                        ((brushSize - 3) / 9) * 100
                      }%)`,
                    }}
                  />
                  <span
                    className="text-[10px] tabular-nums w-6 text-right"
                    style={{ color: "rgba(255,255,255,0.5)" }}
                  >
                    {brushSize}px
                  </span>
                </div>
                <DrawingCanvas
                  layerIndex={layerIndex}
                  initialData={layer.customMaskData}
                  brushSize={brushSize}
                  onDrawEnd={handleDrawEnd}
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function LayerEditor() {
  const layers = useStore((s) => s.layers);
  const activeLayerIndex = useStore((s) => s.activeLayerIndex);
  const setActiveLayerIndex = useStore((s) => s.setActiveLayerIndex);
  const [expandedLayers, setExpandedLayers] = useState<Set<number>>(
    new Set([0])
  );

  const toggleExpand = useCallback((index: number) => {
    setExpandedLayers((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const sortedLayers = [...layers].sort((a, b) => b.zIndex - a.zIndex);

  return (
    <div
      className="flex flex-col h-full overflow-y-auto"
      style={{
        width: 280,
        background: "rgba(18,18,24,0.95)",
        borderLeft: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div
        className="px-3 py-2.5 text-xs font-medium tracking-wider uppercase shrink-0"
        style={{
          color: "rgba(255,255,255,0.4)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        图层编辑
      </div>
      <div className="flex flex-col gap-2 p-2">
        {sortedLayers.map((layer) => {
          const realIndex = layers.findIndex((l) => l.id === layer.id);
          return (
            <LayerCard
              key={layer.id}
              layerIndex={realIndex}
              layer={layer}
              isActive={realIndex === activeLayerIndex}
              onActivate={() => setActiveLayerIndex(realIndex)}
              expanded={expandedLayers.has(realIndex)}
              onToggleExpand={() => toggleExpand(realIndex)}
            />
          );
        })}
      </div>
    </div>
  );
}
