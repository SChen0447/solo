import { useEffect, useRef, useCallback } from "react";
import { Polyline, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import { PASS_GEO } from "@/mapConfig";
import { useStore } from "@/store";

const messengerIcon = L.divIcon({
  className: "",
  html: `<div style="font-size:20px;filter:drop-shadow(0 0 3px rgba(0,0,0,0.5));">🏇</div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

function interpolatePosition(
  from: [number, number],
  to: [number, number],
  t: number
): [number, number] {
  return [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t];
}

export function MessengerAnimation() {
  const routeResult = useStore((s) => s.routeResult);
  const isAnimating = useStore((s) => s.isAnimating);
  const animationProgress = useStore((s) => s.animationProgress);
  const setIsAnimating = useStore((s) => s.setIsAnimating);
  const setAnimationProgress = useStore((s) => s.setAnimationProgress);

  const animRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  const passMap = new Map(PASS_GEO.map((p) => [p.id, p]));

  const getPositions = useCallback(() => {
    if (!routeResult) return [];
    return routeResult.path.nodes
      .map((n) => passMap.get(n))
      .filter(Boolean)
      .map((p) => p!.position) as [number, number][];
  }, [routeResult]);

  const positions = getPositions();

  const getCurrentPosition = useCallback((): [number, number] | null => {
    if (positions.length === 0) return null;
    if (positions.length === 1) return positions[0];

    const totalSegments = positions.length - 1;
    const segProgress = animationProgress * totalSegments;
    const segIdx = Math.min(Math.floor(segProgress), totalSegments - 1);
    const t = segProgress - segIdx;

    return interpolatePosition(positions[segIdx], positions[segIdx + 1], t);
  }, [positions, animationProgress]);

  useEffect(() => {
    if (!isAnimating || !routeResult) return;

    const duration = Math.min(routeResult.totalTimeMinutes * 50, 15000);
    startTimeRef.current = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      setAnimationProgress(progress);

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
      }
    };

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [isAnimating, routeResult, setAnimationProgress, setIsAnimating]);

  const riskSegments = routeResult?.riskSegments || [];

  const getRiskType = (from: string, to: string) => {
    const risk = riskSegments.find(
      (r) => r.from === from && r.to === to
    );
    return risk?.type || null;
  };

  const routePositions = positions.length > 1 ? positions : [];

  const pathSegments: {
    positions: [number, number][];
    risk: "broken" | "misreport" | null;
  }[] = [];

  if (routeResult && positions.length > 1) {
    for (let i = 0; i < positions.length - 1; i++) {
      const from = routeResult.path.nodes[i];
      const to = routeResult.path.nodes[i + 1];
      const risk = getRiskType(from, to);
      pathSegments.push({
        positions: [positions[i], positions[i + 1]],
        risk,
      });
    }
  }

  const currentPos = isAnimating || animationProgress > 0 ? getCurrentPosition() : null;

  return (
    <>
      {routePositions.length > 1 && (
        <Polyline
          positions={routePositions}
          pathOptions={{
            color: "#DAA520",
            weight: 4,
            opacity: 0.6,
          }}
        />
      )}

      {pathSegments.map((seg, i) => {
        if (seg.risk === "broken") {
          return (
            <Polyline
              key={`risk-${i}`}
              positions={seg.positions}
              pathOptions={{
                color: "#EF4444",
                weight: 5,
                className: "risk-broken",
              }}
            />
          );
        }
        if (seg.risk === "misreport") {
          return (
            <Polyline
              key={`risk-${i}`}
              positions={seg.positions}
              pathOptions={{
                color: "#F97316",
                weight: 5,
                className: "risk-misreport",
              }}
            />
          );
        }
        return null;
      })}

      {currentPos && <Marker position={currentPos} icon={messengerIcon} />}
    </>
  );
}
