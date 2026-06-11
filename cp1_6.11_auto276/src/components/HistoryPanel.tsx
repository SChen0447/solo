import { useStore } from "@/store";
import { PASS_GEO } from "@/mapConfig";
import type { HistoryRecord } from "@/types";

const STATUS_MAP: Record<HistoryRecord["status"], { label: string; color: string }> = {
  success: { label: "成功", color: "text-green-400" },
  partial: { label: "部分", color: "text-orange-400" },
  failed: { label: "失败", color: "text-red-400" },
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function HistoryPanel() {
  const history = useStore((s) => s.history);
  const historyOpen = useStore((s) => s.historyOpen);
  const toggleHistory = useStore((s) => s.toggleHistory);
  const restoreFromHistory = useStore((s) => s.restoreFromHistory);
  const setRouteResult = useStore((s) => s.setRouteResult);
  const beaconSettings = useStore((s) => s.beaconSettings);
  const setBeaconSettings = useStore((s) => s.setBeaconSettings);

  const handleRestore = (record: HistoryRecord) => {
    restoreFromHistory(record);
    setRouteResult(null);
  };

  const handleResend = async (record: HistoryRecord) => {
    try {
      const res = await fetch("/api/route-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          waypoints: record.waypoints,
          speeds: record.speeds,
          fuelType: record.fuelType,
          beaconSettings: record.beaconSettings,
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setRouteResult(json.data);
        setBeaconSettings(record.beaconSettings);
      }
    } catch (err) {
      console.error("Resend failed:", err);
    }
  };

  if (!historyOpen) {
    return (
      <button
        onClick={toggleHistory}
        className="fixed top-4 right-4 z-[1000] px-3 py-2 wood-panel rounded text-paper text-xs btn-ancient font-display tracking-wider"
      >
        战报录
      </button>
    );
  }

  return (
    <div className="fixed top-0 right-0 z-[1000] h-full w-[260px] wood-panel flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-wood-light/30">
        <h2 className="font-display text-paper text-sm tracking-wider">
          战报录
        </h2>
        <button
          onClick={toggleHistory}
          className="text-paper/60 hover:text-paper text-sm btn-ancient px-2 py-1"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {history.length === 0 && (
          <div className="text-paper/40 text-xs text-center py-8">
            尚无战报记录
          </div>
        )}
        {history.map((record) => {
          const statusInfo = STATUS_MAP[record.status];
          return (
            <div
              key={record.id}
              className="bg-wood-dark/30 rounded p-3 border border-wood-light/20 cursor-pointer hover:border-gold/40 transition-colors"
              onClick={() => handleRestore(record)}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-paper/60 text-[10px]">
                  {formatTime(record.timestamp)}
                </span>
                <span className={`text-[10px] ${statusInfo.color}`}>
                  {statusInfo.label}
                </span>
              </div>
              <div className="text-paper text-xs mb-1">
                {record.waypoints
                  .map((w) => PASS_GEO.find((p) => p.id === w)?.name)
                  .filter(Boolean)
                  .join(" → ")}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gold text-xs">
                  {record.totalTimeMinutes}分钟
                </span>
                {record.misreportProbability > 0 && (
                  <span className="text-orange-400 text-[10px]">
                    误报{(record.misreportProbability * 100).toFixed(0)}%
                  </span>
                )}
              </div>
              <div className="mt-2 flex gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleResend(record);
                  }}
                  className="flex-1 py-1 text-[10px] btn-ancient"
                >
                  重发军情
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
