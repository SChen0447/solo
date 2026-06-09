import { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { Garden, Plant, HeatmapPoint, BloomStatus } from '../types';
import { BLOOM_COLORS, BLOOM_LABELS } from '../types';

interface MapViewProps {
  gardens: Garden[];
  plants: Plant[];
  heatmapData: HeatmapPoint[];
  showHeatmap: boolean;
  focusGardenId: string | null;
  onPlantClick: (plant: Plant) => void;
  highlightedPlantIds: string[];
}

function createPlantIcon(status: BloomStatus): L.DivIcon {
  const color = BLOOM_COLORS[status];
  return L.divIcon({
    className: 'plant-marker-icon',
    html: `<div style="
      width: 15px;
      height: 15px;
      border-radius: 50%;
      background-color: ${color};
      border: 2px solid white;
      box-shadow: 0 1px 4px rgba(0,0,0,0.3);
      transition: transform 0.2s ease;
    "></div>`,
    iconSize: [15, 15],
    iconAnchor: [7.5, 7.5]
  });
}

function interpolateColor(intensity: number): string {
  const clamped = Math.max(0, Math.min(1, intensity));
  const r = Math.round(clamped * 255);
  const g = Math.round((1 - clamped) * 255);
  return `rgba(${r}, ${g}, 0, 0.45)`;
}

function MapView({
  gardens,
  plants,
  heatmapData,
  showHeatmap,
  focusGardenId,
  onPlantClick,
  highlightedPlantIds
}: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const polygonLayerRef = useRef<L.LayerGroup | null>(null);
  const plantLayerRef = useRef<L.LayerGroup | null>(null);
  const heatmapLayerRef = useRef<L.LayerGroup | null>(null);
  const haloLayerRef = useRef<L.LayerGroup | null>(null);
  const prevHighlightedRef = useRef<string[]>([]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      minZoom: 14,
      maxZoom: 18
    }).setView([39.9925, 116.2860], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    mapRef.current = map;
    polygonLayerRef.current = L.layerGroup().addTo(map);
    plantLayerRef.current = L.layerGroup().addTo(map);
    heatmapLayerRef.current = L.layerGroup().addTo(map);
    haloLayerRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !polygonLayerRef.current || gardens.length === 0) return;

    polygonLayerRef.current.clearLayers();

    gardens.forEach((garden) => {
      const polygon = L.polygon(garden.bounds as L.LatLngTuple[], {
        color: garden.color,
        weight: 3,
        opacity: 0.7,
        fillColor: garden.color,
        fillOpacity: 0.3
      });

      polygon.bindTooltip(garden.name, {
        permanent: false,
        direction: 'center',
        className: 'garden-tooltip',
        offset: [0, 0]
      });

      polygon.addTo(polygonLayerRef.current!);
    });
  }, [gardens]);

  useEffect(() => {
    if (!mapRef.current || !plantLayerRef.current || plants.length === 0) return;

    plantLayerRef.current.clearLayers();

    plants.forEach((plant) => {
      const marker = L.marker([plant.lat, plant.lng], {
        icon: createPlantIcon(plant.bloomStatus)
      });

      const popupContent = `
        <div class="plant-popup-content">
          <h3>${plant.name}</h3>
          <p class="latin">${plant.latinName}</p>
          <div class="info-row">
            <span>花期状态</span>
            <span class="status-tag" style="background-color: ${BLOOM_COLORS[plant.bloomStatus]}">
              ${BLOOM_LABELS[plant.bloomStatus]}
            </span>
          </div>
          <div class="info-row">
            <span>开花时段</span>
            <span>${plant.bloomPeriod}</span>
          </div>
          <p class="caretaker">— ${plant.caretaker}</p>
        </div>
      `;

      marker.bindPopup(popupContent, {
        className: 'plant-popup',
        closeButton: true,
        offset: [0, -8]
      });

      marker.on('click', () => {
        onPlantClick(plant);
      });

      marker.addTo(plantLayerRef.current!);
    });
  }, [plants, onPlantClick]);

  useEffect(() => {
    if (!mapRef.current || !heatmapLayerRef.current) return;

    heatmapLayerRef.current.clearLayers();

    if (!showHeatmap) return;

    heatmapData.forEach((point) => {
      const radius = 20 + point.intensity * 60;
      const color = interpolateColor(point.intensity);

      L.circleMarker([point.lat, point.lng], {
        radius,
        fillColor: color,
        fillOpacity: 0.5,
        stroke: false,
        interactive: false
      }).addTo(heatmapLayerRef.current!);
    });
  }, [heatmapData, showHeatmap]);

  useEffect(() => {
    if (!mapRef.current || !focusGardenId) return;

    const garden = gardens.find((g) => g.id === focusGardenId);
    if (garden) {
      mapRef.current.flyTo(garden.center, 16, {
        duration: 2
      });
    }
  }, [focusGardenId, gardens]);

  useEffect(() => {
    if (!mapRef.current || !haloLayerRef.current) return;

    const newIds = highlightedPlantIds.filter(
      (id) => !prevHighlightedRef.current.includes(id)
    );

    const plantsToAnimate = plants.filter((p) => newIds.includes(p.id));

    plantsToAnimate.forEach((plant) => {
      const haloIcon = L.divIcon({
        className: 'halo-wrapper',
        html: `<div class="halo-marker"></div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      });

      const haloMarker = L.marker([plant.lat, plant.lng], {
        icon: haloIcon,
        interactive: false
      }).addTo(haloLayerRef.current!);

      setTimeout(() => {
        haloLayerRef.current?.removeLayer(haloMarker);
      }, 2000);
    });

    prevHighlightedRef.current = highlightedPlantIds;
  }, [highlightedPlantIds, plants]);

  return (
    <div
      ref={mapContainerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 1
      }}
    />
  );
}

export default MapView;
