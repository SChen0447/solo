import { useState, useCallback } from "react";
import { useStore } from "@/store";
import { PASS_GEO } from "@/mapConfig";
import type { RoutePlanResponse, BeaconSetting, HistoryRecord } from "@/types";
import { FUEL_CONFIG } from "@/types";
import { v4 as uuidv4 } from "uuid";

const SPEED_OPTIONS = [
  { key: "walk" as const, label: "步行", speed: "3km/h" },
  { key: "horse" as const, label: "骑马", speed: "12km/h" },
  { key: "fast_horse" as const, label: "快马", speed: "25km/h" },
];

const FUEL_OPTIONS = [
  { key: "hay" as const, label: "干草", detail: "黄焰·5分·3km" },
  { key: "wood" as const, label: "木材", detail: "橙焰·10分·5km" },
  { key: "pitch" as const, label: "沥青", detail: "红焰·20分·8km" },
];

export function PathPanel() {
  const waypoints = useStore((s) => s.waypoints);
  const speeds = useStore((s) => s.speeds);
  const fuelType = useStore((s) => s.fuelType);
  const beaconSettings = useStore((s) => s.beaconSettings);
  const routeResult = useStore((s) => s.routeResult);
  const panelCollapsed = useStore((s) => s.panelCollapsed);
  const setWaypoints = useStore((s) => s.setWaypoints);
  const setSpeeds = useStore((s) => s.setSpeeds);
  const setFuelType = useStore((s) => s.setFuelType);
  const setBeaconSettings = useStore((s) => s.setBeaconSettings);
  const setRouteResult = useStore((s) => s.setRouteResult);
  const addHistory = useStore((s) => s.addHistory);
  const setIsAnimating = useStore((s) => s.setIsAnimating);
  const setAnimationProgress = useStore((s) => s.setAnimationProgress);
  const togglePanel = useStore((s) => s.togglePanel);

  const [loading, setLoading] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const toggleWaypoint = useCallback(
    (passId: string) => {
      if (waypoints.includes(passId)) {
        setWaypoints(waypoints.filter((w) => w !== passId));
      } else if (waypoints.length < 5) {
        setWaypoints([...waypoints, passId]);
      }
    },
    [waypoints, setWaypoints]
  );

  const moveWaypoint = useCallback(
    (fromIdx: number, toIdx: number) => {
      const arr = [...waypoints];
      const [item] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, item);
      setWaypoints(arr);
    },
    [waypoints, setWaypoints]
  );

  const handleSend = useCallback(async () => {
    if (waypoints.length < 2) return;
    setLoading(true);

    const defaultBeaconSettings: BeaconSetting[] = waypoints.map((passId) => {
      const existing = beaconSettings.find((b) => b.passId === passId);
      return (
        existing || {
          passId,
          igniteTiming: "immediate",
          fuelType,
          windCorrection: 0,
        }
      );
    });

    try {
      const res = await fetch("/api/route-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          waypoints,
          speeds: speeds.slice(0, waypoints.length - 1),
          fuelType,
          beaconSettings: defaultBeaconSettings,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        const data: RoutePlanResponse = json.data;
        setRouteResult(data);
        setBeaconSettings(defaultBeaconSettings);
        setIsAnimating(true);
        setAnimationProgress(0);

        const maxMisreport = data.beaconResults.reduce(
          (max, b) => Math.max(max, b.misreportProbability),
          0
        );
        const hasBroken = data.riskSegments.some(
          (r) => r.type === "broken"
        );
        let status: HistoryRecord["status"] = "success";
        if (hasBroken) status = "failed";
        else if (maxMisreport > 0.1) status = "partial";

        const record: HistoryRecord = {
          id: uuidv4(),
          timestamp: Date.now(),
          waypoints,
          speeds: speeds.slice(0, waypoints.length - 1),
          fuelType,
          beaconSettings: defaultBeaconSettings,
          totalTimeMinutes: data.totalTimeMinutes,
          misreportProbability: maxMisreport,
          status,
          riskSegments: data.riskSegments,
        };
        addHistory(record);
      }
    } catch (err) {
      console.error("Route plan failed:", err);
    } finally {
      setLoading(false);
    }
  }, [
    waypoints,
    speeds,
    fuelType,
    beaconSettings,
    setRouteResult,
    setBeaconSettings,
    setIsAnimating,
    setAnimationProgress,
    addHistory,
  ]);

  if (panelCollapsed) {
    return (
      <button
        onClick={togglePanel}
        className="fixed top-4 left-4 z-[1000] w-12 h-12 rounded-full wood-panel flex items-center justify-center text-paper text-xl btn-ancient"
      >
        ☰
      </button>
    );
  }

  return (
    <div className="fixed top-0 left-0 z-[1000] h-full w-[280px] wood-panel flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-wood-light/30">
        <h1 className="font-display text-paper text-lg tracking-wider">
          驿站信使
        </h1>
        <button
          onClick={togglePanel}
          className="text-paper/60 hover:text-paper text-sm btn-ancient px-2 py-1"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        <div>
          <h2 className="font-display text-paper/80 text-sm mb-2">
            选择关隘（最多5座）
          </h2>
          <div className="space-y-1">
            {PASS_GEO.map((pass) => {
              const isSelected = waypoints.includes(pass.id);
              return (
                <button
                  key={pass.id}
                  onClick={() => toggleWaypoint(pass.id)}
                  className={`w-full text-left px-3 py-2 rounded text-sm transition-all ${
                    isSelected
                      ? "bg-gold/30 text-gold-light border border-gold/50"
                      : "text-paper/60 hover:bg-wood-light/30 border border-transparent"
                  }`}
                >
                  <span className="inline-block w-4 text-center mr-2">
                    {isSelected ? "✦" : "○"}
                  </span>
                  {pass.name}
                  <span className="text-paper/40 text-xs ml-2">
                    {pass.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {waypoints.length > 0 && (
          <div>
            <h2 className="font-display text-paper/80 text-sm mb-2">
              途经顺序（拖拽排列）
            </h2>
            <div className="space-y-1">
              {waypoints.map((wp, idx) => {
                const passInfo = PASS_GEO.find((p) => p.id === wp);
                return (
                  <div
                    key={wp}
                    draggable
                    onDragStart={() => setDragIdx(idx)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (dragIdx !== null && dragIdx !== idx) {
                        moveWaypoint(dragIdx, idx);
                      }
                      setDragIdx(null);
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded bg-wood-light/20 border border-wood-light/30 text-paper text-sm cursor-grab active:cursor-grabbing"
                  >
                    <span className="text-gold font-bold">{idx + 1}</span>
                    <span className="flex-1">{passInfo?.name}</span>
                    <span className="text-paper/40">⋮⋮</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <h2 className="font-display text-paper/80 text-sm mb-2">
            信使速度
          </h2>
          <div className="flex gap-1">
            {SPEED_OPTIONS.map((opt) => {
              const isActive =
                speeds.length > 0 && speeds[0] === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => {
                    const newSpeeds = Array(waypoints.length > 1 ? waypoints.length - 1 : 1).fill(opt.key) as ("walk" | "horse" | "fast_horse")[];
                    setSpeeds(newSpeeds);
                  }}
                  className={`flex-1 px-2 py-2 text-xs btn-ancient ${
                    isActive ? "active" : ""
                  }`}
                >
                  <div>{opt.label}</div>
                  <div className="text-paper/40 text-[10px]">{opt.speed}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <h2 className="font-display text-paper/80 text-sm mb-2">
            烽火燃料
          </h2>
          <div className="flex gap-1">
            {FUEL_OPTIONS.map((opt) => {
              const isActive = fuelType === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => setFuelType(opt.key)}
                  className={`flex-1 px-2 py-2 text-xs btn-ancient ${
                    isActive ? "active" : ""
                  }`}
                >
                  <div>{opt.label}</div>
                  <div className="text-paper/40 text-[10px]">
                    {opt.detail}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {routeResult && (
          <div className="bg-wood-dark/40 rounded p-3 border border-wood-light/20">
            <h2 className="font-display text-gold text-sm mb-2">军情战报</h2>
            <div className="text-paper/80 text-xs space-y-1">
              <div>
                总耗时：
                <span className="text-gold-light font-bold">
                  {routeResult.totalTimeMinutes} 分钟
                </span>
              </div>
              <div>
                途经：
                {routeResult.path.nodes
                  .map(
                    (n) => PASS_GEO.find((p) => p.id === n)?.name
                  )
                  .filter(Boolean)
                  .join(" → ")}
              </div>
              {routeResult.path.segments.map((seg, i) => (
                <div key={i} className="text-paper/60">
                  {PASS_GEO.find((p) => p.id === seg.from)?.name} →{" "}
                  {PASS_GEO.find((p) => p.id === seg.to)?.name}：{seg.timeMinutes}分钟（{seg.distance}km）
                </div>
              ))}
              {routeResult.riskSegments.length > 0 && (
                <div className="mt-2 space-y-1">
                  {routeResult.riskSegments.map((r, i) => (
                    <div
                      key={i}
                      className={`text-xs px-2 py-1 rounded ${
                        r.type === "broken"
                          ? "bg-red-900/40 text-red-300 risk-broken"
                          : "bg-orange-900/40 text-orange-300 risk-misreport"
                      }`}
                    >
                      {r.type === "broken" ? "⚠ 断传" : "⚡ 误报"}：
                      {PASS_GEO.find((p) => p.id === r.from)?.name} →{" "}
                      {PASS_GEO.find((p) => p.id === r.to)?.name}
                      {r.probability
                        ? ` (${(r.probability * 100).toFixed(0)}%)`
                        : ""}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-t border-wood-light/30">
        <button
          onClick={handleSend}
          disabled={waypoints.length < 2 || loading}
          className={`w-full py-3 text-sm font-display tracking-widest btn-ancient ${
            waypoints.length < 2
              ? "opacity-40 cursor-not-allowed"
              : "bg-gradient-to-b from-gold to-gold-dark text-paper-dark border-gold-light"
          }`}
        >
          {loading ? "传送中..." : "发送军情"}
        </button>
      </div>
    </div>
  );
}
