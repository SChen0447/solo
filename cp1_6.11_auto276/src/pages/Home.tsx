import { useEffect } from "react";
import { MapContainer, TileLayer, Polyline, useMap } from "react-leaflet";
import { PASS_GEO, ROAD_PATHS, MAP_CENTER, MAP_ZOOM, TILE_URL, TILE_ATTRIBUTION, riskLevelToColor } from "@/mapConfig";
import { useStore } from "@/store";
import { PathPanel } from "@/components/PathPanel";
import { BeaconLayer } from "@/components/BeaconLayer";
import { MessengerAnimation } from "@/components/MessengerAnimation";
import { HistoryPanel } from "@/components/HistoryPanel";

function MapStateSync() {
  const routeResult = useStore((s) => s.routeResult);
  const map = useMap();

  useEffect(() => {
    if (routeResult && routeResult.path.nodes.length > 0) {
      const passMap = new Map(PASS_GEO.map((p) => [p.id, p]));
      const bounds: [number, number][] = routeResult.path.nodes
        .map((id) => passMap.get(id))
        .filter(Boolean)
        .map((p) => p!.position);
      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [routeResult, map]);

  return null;
}

export default function Home() {
  const loadHistory = useStore((s) => s.loadHistory);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-paper">
      <div className="mountain-overlay" />
      <PathPanel />
      <HistoryPanel />

      <MapContainer
        center={MAP_CENTER}
        zoom={MAP_ZOOM}
        className="w-full h-full z-10"
        zoomControl={true}
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
        <MapStateSync />

        {ROAD_PATHS.map((road) => (
          <Polyline
            key={road.id}
            positions={road.positions}
            pathOptions={{
              color: riskLevelToColor(road.riskLevel),
              weight: 3,
              dashArray: "8 6",
              opacity: 0.8,
            }}
          />
        ))}

        <BeaconLayer />
        <MessengerAnimation />
      </MapContainer>
    </div>
  );
}
