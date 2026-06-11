import { useStore } from "@/store/useStore";
import { temperatureToColor } from "@/utils/shadowCalculator";
import { Sun, Thermometer, Zap } from "lucide-react";

export default function LightControls() {
  const light = useStore((s) => s.light);
  const setLight = useStore((s) => s.setLight);

  return (
    <div
      className="fixed bottom-0 left-0 w-full flex flex-row items-center px-8 py-3 gap-6"
      style={{
        height: 90,
        background: "rgba(30,30,30,0.9)",
        backdropFilter: "blur(16px)",
        borderTop: "1px solid rgba(255,255,255,0.1)",
      }}
    >
      <div className="flex-1 flex flex-col items-center gap-1">
        <div className="flex items-center gap-2 text-xs text-white/60">
          <Sun size={14} />
          <span>水平角度</span>
        </div>
        <input
          type="range"
          min={-50}
          max={50}
          step={1}
          value={light.horizontalAngle}
          onChange={(e) => setLight({ horizontalAngle: Number(e.target.value) })}
          className="slider-input w-full"
        />
        <span className="text-xs text-white/80">{light.horizontalAngle}°</span>
      </div>

      <div className="flex-1 flex flex-col items-center gap-1">
        <div className="flex items-center gap-2 text-xs text-white/60">
          <Thermometer size={14} />
          <span>色温</span>
        </div>
        <div className="relative w-full">
          <input
            type="range"
            min={2700}
            max={6500}
            step={100}
            value={light.colorTemperature}
            onChange={(e) => setLight({ colorTemperature: Number(e.target.value) })}
            className="slider-input slider-input-temp w-full"
          />
          <div
            className="absolute pointer-events-none"
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: temperatureToColor(light.colorTemperature),
              boxShadow: `0 0 6px ${temperatureToColor(light.colorTemperature)}`,
              top: "50%",
              left: `calc(${((light.colorTemperature - 2700) / (6500 - 2700)) * 100}% + ${(1 - (light.colorTemperature - 2700) / (6500 - 2700)) * 7 - 7}px)`,
              transform: "translate(-50%, -50%)",
              marginTop: -8,
            }}
          />
        </div>
        <span className="text-xs text-white/80">{light.colorTemperature}K</span>
      </div>

      <div className="flex-1 flex flex-col items-center gap-1">
        <div className="flex items-center gap-2 text-xs text-white/60">
          <Zap size={14} />
          <span>亮度</span>
        </div>
        <input
          type="range"
          min={10}
          max={100}
          step={1}
          value={light.brightness}
          onChange={(e) => setLight({ brightness: Number(e.target.value) })}
          className="slider-input w-full"
        />
        <span className="text-xs text-white/80">{light.brightness} 流明</span>
      </div>

      <style>{`
        .slider-input {
          -webkit-appearance: none;
          appearance: none;
          height: 4px;
          background: rgba(255,255,255,0.1);
          border-radius: 2px;
          outline: none;
          cursor: pointer;
        }
        .slider-input::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #ffd27f;
          box-shadow: 0 0 8px rgba(255,210,127,0.5);
          cursor: pointer;
        }
        .slider-input::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #ffd27f;
          box-shadow: 0 0 8px rgba(255,210,127,0.5);
          border: none;
          cursor: pointer;
        }
        .slider-input-temp {
          background: linear-gradient(to right, #ffd27f, #cce5ff) !important;
        }
      `}</style>
    </div>
  );
}
