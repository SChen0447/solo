import { useState, useRef, useEffect, useCallback } from "react";
import { Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { PASS_GEO } from "@/mapConfig";
import { useStore } from "@/store";
import type { BeaconSetting } from "@/types";
import { FUEL_CONFIG } from "@/types";

function createPassIcon(isLit: boolean, fuelType?: string): L.DivIcon {
  const color = isLit && fuelType ? FUEL_CONFIG[fuelType].color : "#DAA520";
  const glow = isLit
    ? `filter: drop-shadow(0 0 6px ${color});`
    : "";

  return L.divIcon({
    className: "pass-marker",
    html: `
      <svg width="24" height="24" viewBox="0 0 24 24" style="${glow}">
        <circle cx="12" cy="12" r="10" fill="${color}" stroke="#8B6914" stroke-width="2" opacity="0.9"/>
        <circle cx="12" cy="12" r="5" fill="#FFF8DC" opacity="0.6"/>
      </svg>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -14],
  });
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

function SmokeCanvas({
  isLit,
  fuelType,
  windCorrection,
  containerPoint,
}: {
  isLit: boolean;
  fuelType: string;
  windCorrection: number;
  containerPoint: { x: number; y: number } | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const frameRef = useRef<number>(0);
  const lastSpawnRef = useRef<number>(0);

  const spawnParticle = useCallback(
    (now: number) => {
      if (!isLit) return;
      const config = FUEL_CONFIG[fuelType] || FUEL_CONFIG.wood;
      const interval = 1000 / config.particlesPerSec;
      if (now - lastSpawnRef.current < interval) return;
      lastSpawnRef.current = now;

      if (particlesRef.current.length >= 500) {
        particlesRef.current.shift();
      }

      const windRad = (windCorrection * Math.PI) / 180;
      particlesRef.current.push({
        x: 0,
        y: 0,
        vx: Math.sin(windRad) * 0.8,
        vy: -1.5 - Math.random() * 0.5,
        life: config.duration * 60,
        maxLife: config.duration * 60,
        size: 2 + Math.random() * 3,
      });
    },
    [isLit, fuelType, windCorrection]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const animate = (now: number) => {
      spawnParticle(now);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const config = FUEL_CONFIG[fuelType] || FUEL_CONFIG.wood;

      particlesRef.current = particlesRef.current.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        const alpha = Math.max(0, p.life / p.maxLife) * 0.7;
        const spread = (1 - p.life / p.maxLife) * 8;

        ctx.beginPath();
        ctx.arc(
          canvas.width / 2 + p.x * 2 + spread,
          canvas.height / 2 + p.y * 2,
          p.size * (1 + (1 - p.life / p.maxLife) * 0.5),
          0,
          Math.PI * 2
        );
        ctx.fillStyle = `rgba(180, 180, 180, ${alpha})`;
        ctx.fill();

        return p.life > 0;
      });

      if (isLit) {
        const flameColor = config.color;
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, 4, 0, Math.PI * 2);
        ctx.fillStyle = flameColor;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, 6, 0, Math.PI * 2);
        ctx.fillStyle = `${flameColor}44`;
        ctx.fill();
      }

      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [isLit, fuelType, windCorrection, spawnParticle]);

  useEffect(() => {
    if (!isLit) {
      particlesRef.current = [];
    }
  }, [isLit]);

  return (
    <canvas
      ref={canvasRef}
      width={60}
      height={60}
      style={{
        position: "absolute",
        pointerEvents: "none",
        left: containerPoint ? containerPoint.x - 30 : -9999,
        top: containerPoint ? containerPoint.y - 60 : -9999,
        zIndex: 600,
      }}
    />
  );
}

function BeaconMarker({ pass }: { pass: (typeof PASS_GEO)[0] }) {
  const map = useMap();
  const beaconSettings = useStore((s) => s.beaconSettings);
  const setBeaconSettings = useStore((s) => s.setBeaconSettings);
  const routeResult = useStore((s) => s.routeResult);

  const setting = beaconSettings.find((b) => b.passId === pass.id);
  const isLit = setting?.igniteTiming === "immediate";
  const fuelType = setting?.fuelType || "wood";
  const windCorrection = setting?.windCorrection || 0;

  const [localTiming, setLocalTiming] = useState<
    BeaconSetting["igniteTiming"]
  >(setting?.igniteTiming || "immediate");
  const [localFuel, setLocalFuel] = useState<BeaconSetting["fuelType"]>(
    setting?.fuelType || "wood"
  );
  const [localWind, setLocalWind] = useState(windCorrection);
  const [containerPoint, setContainerPoint] = useState<{ x: number; y: number } | null>(null);

  const beaconResult = routeResult?.beaconResults.find(
    (b) => b.passId === pass.id
  );

  useEffect(() => {
    const updatePos = () => {
      const pt = map.latLngToContainerPoint(pass.position);
      setContainerPoint({ x: pt.x, y: pt.y });
    };
    updatePos();
    map.on("move zoom", updatePos);
    return () => {
      map.off("move zoom", updatePos);
    };
  }, [map, pass.position]);

  const applySettings = useCallback(() => {
    const newSetting: BeaconSetting = {
      passId: pass.id,
      igniteTiming: localTiming,
      fuelType: localFuel,
      windCorrection: localWind,
    };
    const existing = beaconSettings.findIndex(
      (b) => b.passId === pass.id
    );
    const newSettings = [...beaconSettings];
    if (existing >= 0) {
      newSettings[existing] = newSetting;
    } else {
      newSettings.push(newSetting);
    }
    setBeaconSettings(newSettings);
  }, [localTiming, localFuel, localWind, pass.id, beaconSettings, setBeaconSettings]);

  const icon = createPassIcon(isLit, fuelType);

  return (
    <>
      <Marker position={pass.position} icon={icon}>
        <Popup>
          <div className="min-w-[200px]">
            <h3 className="font-display text-gold-light text-base mb-1">
              {pass.name}
            </h3>
            <p className="text-paper/60 text-xs mb-3">{pass.description}</p>

            {beaconResult && (
              <div className="mb-2 text-xs">
                <span
                  className={
                    beaconResult.visible
                      ? "text-green-400"
                      : "text-red-400"
                  }
                >
                  {beaconResult.visible ? "✓ 可见" : "✗ 断传"}
                </span>
                {beaconResult.misreportProbability > 0 && (
                  <span className="ml-2 text-orange-400">
                    误报{(beaconResult.misreportProbability * 100).toFixed(0)}%
                  </span>
                )}
              </div>
            )}

            <div className="space-y-2">
              <div>
                <label className="text-paper/60 text-xs block mb-1">
                  点燃时机
                </label>
                <div className="flex gap-1">
                  {(["immediate", "delayed", "disabled"] as const).map(
                    (t) => (
                      <button
                        key={t}
                        onClick={() => setLocalTiming(t)}
                        className={`flex-1 text-xs px-1 py-1 rounded btn-ancient ${
                          localTiming === t ? "active" : ""
                        }`}
                      >
                        {t === "immediate"
                          ? "立即"
                          : t === "delayed"
                          ? "延时"
                          : "禁火"}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div>
                <label className="text-paper/60 text-xs block mb-1">
                  燃料类型
                </label>
                <div className="flex gap-1">
                  {(["hay", "wood", "pitch"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setLocalFuel(f)}
                      className={`flex-1 text-xs px-1 py-1 rounded btn-ancient ${
                        localFuel === f ? "active" : ""
                      }`}
                    >
                      {f === "hay" ? "干草" : f === "wood" ? "木材" : "沥青"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-paper/60 text-xs block mb-1">
                  风偏校正：{localWind}°
                </label>
                <input
                  type="range"
                  min={-30}
                  max={30}
                  value={localWind}
                  onChange={(e) => setLocalWind(Number(e.target.value))}
                  className="w-full accent-gold"
                />
              </div>

              <button
                onClick={applySettings}
                className="w-full py-1.5 text-xs btn-ancient bg-gradient-to-b from-gold to-gold-dark text-paper-dark"
              >
                应用设置
              </button>
            </div>
          </div>
        </Popup>
      </Marker>

      <SmokeCanvas
        isLit={isLit}
        fuelType={fuelType}
        windCorrection={windCorrection}
        containerPoint={containerPoint}
      />
    </>
  );
}

export function BeaconLayer() {
  return (
    <>
      {PASS_GEO.map((pass) => (
        <BeaconMarker key={pass.id} pass={pass} />
      ))}
    </>
  );
}
